import express from 'express';
import { state } from '../config/db.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAIHandoff, pushNotifications } from '../services/notificationService.js';

const router = express.Router();

const userId = (user) => String(user?._id || user?.id || '');

const getDirectoryUsers = async () => {
  if (state.isMongooseConnected) {
    return User.find({ status: { $ne: 'Inactive' } }).select('_id name email role department status').lean();
  }
  return state.memoryDb.users.filter(user => user.status !== 'Inactive');
};

const compact = (value, limit = 190) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
};

const summaryFrom = ({ summary, keyTakeaways = [], proposedSolutions = [], feedback = '' }) => {
  const pieces = [
    compact(summary, 150),
    keyTakeaways[0] ? `Focus: ${compact(keyTakeaways[0], 120)}` : '',
    proposedSolutions[0] ? `Proposal: ${compact(proposedSolutions[0], 120)}` : '',
    feedback ? `Feedback: ${compact(feedback, 150)}` : ''
  ].filter(Boolean);
  return pieces.slice(0, 3).join(' · ');
};

const getAdminIds = (directory) => directory.filter(user => user.role === 'Admin').map(userId);

const findManager = (directory, department, requestedManagerId = '') => {
  const managers = directory.filter(user => user.role === 'Manager');
  return managers.find(manager => userId(manager) === String(requestedManagerId))
    || managers.find(manager => manager.department === department)
    || managers[0]
    || null;
};

const canViewWorkflow = (workflow, user) => {
  if (user.role === 'Admin') return true;
  const currentUserId = userId(user);
  return workflow.employeeId === currentUserId
    || workflow.managerId === currentUserId
    || (user.role === 'Manager' && workflow.department === user.department);
};

const getWorkflow = (workflowId) => (state.memoryDb.workflowRequests || []).find(workflow => workflow._id === workflowId || workflow.id === workflowId);

const consistencyCheck = (workflow) => {
  const transitions = workflow.transitions || [];
  const workflowNotifications = (state.memoryDb.notifications || []).filter(notification => notification.workflowId === workflow._id);
  const workflowHandoffs = (state.memoryDb.aiHandoffEvents || []).filter(event => event.workflowId === workflow._id);
  const checks = [
    {
      name: 'participants assigned',
      passed: Boolean(workflow.employeeId && workflow.managerId),
      detail: workflow.managerId ? 'Employee and manager identities are linked.' : 'A manager is not assigned yet.'
    },
    {
      name: 'transition trace aligned',
      passed: transitions.at(-1)?.label === workflow.status,
      detail: `Latest trace state: ${transitions.at(-1)?.label || 'missing'}`
    },
    {
      name: 'notification fan-out recorded',
      passed: workflowNotifications.length > 0,
      detail: `${workflowNotifications.length} workflow notification(s) recorded.`
    },
    {
      name: 'AI handoff state recorded',
      passed: workflowHandoffs.every(event => ['delivered', 'queued_until_lan'].includes(event.status)),
      detail: workflowHandoffs.length ? workflowHandoffs.map(event => `${event.targetAgent}: ${event.status}`).join(', ') : 'No AI handoff required at this state.'
    }
  ];

  return { passed: checks.every(check => check.passed), checkedAt: new Date().toISOString(), checks };
};

const serializeWorkflow = (workflow) => ({
  ...workflow,
  aiHandoffs: (state.memoryDb.aiHandoffEvents || []).filter(event => event.workflowId === workflow._id),
  consistency: consistencyCheck(workflow)
});

const notifyStakeholders = ({ directory, recipients, type, title, workflow, feedback = '' }) => {
  const summary = summaryFrom({
    summary: workflow.summary,
    keyTakeaways: workflow.keyTakeaways,
    proposedSolutions: workflow.proposedSolutions,
    feedback
  });
  const copyMessage = [
    'SOVEREIGN AI WORKFLOW UPDATE',
    `Request: ${workflow._id}`,
    `Employee: ${workflow.employeeName}`,
    `Status: ${workflow.status}`,
    `Summary: ${summary}`
  ].join('\n');

  return pushNotifications({
    recipientUserIds: [...recipients, ...getAdminIds(directory)],
    type,
    title,
    message: summary,
    summary,
    copyMessage,
    workflowId: workflow._id,
    metadata: {
      employeeName: workflow.employeeName,
      managerName: workflow.managerName,
      status: workflow.status,
      feedback: feedback || ''
    }
  });
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const visible = (state.memoryDb.workflowRequests || []).filter(workflow => canViewWorkflow(workflow, req.user));
    res.json({ workflows: visible.map(serializeWorkflow), total: visible.length, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communication workflows.' });
  }
});

router.post('/', authenticateToken, requireRole(['Employee', 'Manager']), async (req, res) => {
  try {
    const directory = await getDirectoryUsers();
    const employee = directory.find(candidate => userId(candidate) === userId(req.user)) || req.user;
    const manager = findManager(directory, employee.department, req.body?.managerId);
    const now = new Date().toISOString();
    const workflow = {
      _id: `workflow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      employeeId: userId(employee),
      employeeName: employee.name,
      employeeEmail: employee.email,
      managerId: manager ? userId(manager) : '',
      managerName: manager?.name || 'Assigned Manager',
      managerEmail: manager?.email || '',
      department: employee.department,
      employeeAgent: 'Employee AI Agent',
      managerAgent: 'Manager AI Agent',
      employeeModel: req.body?.employeeModel || 'Employee AI Model',
      managerModel: req.body?.managerModel || 'Manager AI Model',
      keyTakeaways: Array.isArray(req.body?.keyTakeaways) ? req.body.keyTakeaways.slice(0, 3) : [],
      proposedSolutions: Array.isArray(req.body?.proposedSolutions) ? req.body.proposedSolutions.slice(0, 3) : [],
      summary: compact(req.body?.summary || 'Employee AI prepared a business proposal for manager review.', 500),
      managerFeedback: '',
      managerDecision: '',
      status: 'awaiting employee approval',
      createdAt: now,
      updatedAt: now,
      transitions: [
        { label: 'requested', at: now, actor: employee.name },
        { label: 'employee-ai draft', at: now, actor: 'Employee AI Agent' },
        { label: 'awaiting employee approval', at: now, actor: employee.name }
      ]
    };

    state.memoryDb.workflowRequests.unshift(workflow);
    notifyStakeholders({
      directory,
      recipients: manager ? [userId(manager)] : [],
      type: 'WORKFLOW_EMPLOYEE_PROPOSAL',
      title: `Employee proposal awaiting review: ${workflow.employeeName}`,
      workflow
    });

    res.status(201).json({ message: 'Employee proposal created and routed to the manager workflow queue.', workflow: serializeWorkflow(workflow) });
  } catch (err) {
    console.error('[Workflow create error]', err.message);
    res.status(500).json({ error: 'Failed to create communication workflow.' });
  }
});

router.post('/:workflowId/transition', authenticateToken, async (req, res) => {
  try {
    const workflow = getWorkflow(req.params.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Communication workflow not found.' });
    if (!canViewWorkflow(workflow, req.user)) return res.status(403).json({ error: 'You are not assigned to this workflow.' });

    const action = String(req.body?.action || '').trim();
    const transitionMap = {
      employee_approve: { from: 'awaiting employee approval', to: 'sent to manager-ai', role: 'Employee' },
      employee_resubmit: { from: 'manager feedback', to: 'sent to manager-ai', role: 'Employee' },
      manager_validate: { from: 'sent to manager-ai', to: 'awaiting manager approval', role: 'Manager' },
      manager_approve: { from: 'awaiting manager approval', to: 'task completed', role: 'Manager' },
      manager_reject: { from: 'awaiting manager approval', to: 'task rejected', role: 'Manager' },
      manager_feedback: { from: 'awaiting manager approval', to: 'manager feedback', role: 'Manager' }
    };
    const transition = transitionMap[action];
    if (!transition) return res.status(400).json({ error: 'Unsupported workflow transition.' });
    if (workflow.status !== transition.from) return res.status(409).json({ error: `This workflow is already at ${workflow.status}. Refresh before acting.` });
    if (req.user.role !== transition.role || (transition.role === 'Employee' && workflow.employeeId !== userId(req.user)) || (transition.role === 'Manager' && workflow.managerId !== userId(req.user))) {
      return res.status(403).json({ error: 'This transition is not available for your role or assignment.' });
    }

    const feedback = compact(req.body?.feedback || '', 500);
    if (action === 'manager_feedback' && !feedback) return res.status(400).json({ error: 'Add a concise manager feedback summary before sending feedback.' });

    const directory = await getDirectoryUsers();
    workflow.status = transition.to;
    workflow.updatedAt = new Date().toISOString();
    workflow.lastActor = req.user.name;
    workflow.transitions = [...(workflow.transitions || []), {
      label: transition.to,
      at: workflow.updatedAt,
      actor: req.user.name,
      summary: feedback || ''
    }];
    if (feedback) workflow.managerFeedback = feedback;
    if (action === 'manager_approve') workflow.managerDecision = 'accepted';
    if (action === 'manager_reject') workflow.managerDecision = 'rejected';

    if (action === 'employee_approve' || action === 'employee_resubmit') {
      createAIHandoff({
        workflowId: workflow._id,
        sourceUserId: workflow.employeeId,
        targetUserId: workflow.managerId,
        targetAgent: 'Manager AI Agent',
        eventType: 'employee_to_manager_ai',
        modelName: workflow.managerModel,
        summary: `Employee AI proposal from ${workflow.employeeName} is ready for ${workflow.managerName}'s Manager AI Agent. ${summaryFrom(workflow)}`
      });
      notifyStakeholders({ directory, recipients: [workflow.managerId], type: 'WORKFLOW_SENT_TO_MANAGER', title: `Employee proposal sent to Manager AI: ${workflow.employeeName}`, workflow });
    }

    if (action === 'manager_validate') {
      const validationSummary = feedback || `Manager AI validated the proposal and prepared it for ${workflow.managerName}'s approval. ${summaryFrom(workflow)}`;
      createAIHandoff({
        workflowId: workflow._id,
        sourceUserId: workflow.managerId,
        targetUserId: workflow.employeeId,
        targetAgent: 'Employee AI Agent',
        eventType: 'manager_ai_to_employee_ai',
        modelName: workflow.employeeModel,
        summary: validationSummary
      });
      notifyStakeholders({ directory, recipients: [workflow.employeeId], type: 'WORKFLOW_MANAGER_FEEDBACK', title: `Manager AI feedback is ready: ${workflow.employeeName}`, workflow, feedback: validationSummary });
    }

    if (action === 'manager_approve' || action === 'manager_reject' || action === 'manager_feedback') {
      const decisionSummary = feedback || (action === 'manager_approve' ? 'Manager accepted the proposed action.' : 'Manager rejected the proposed action.');
      createAIHandoff({
        workflowId: workflow._id,
        sourceUserId: workflow.managerId,
        targetUserId: workflow.employeeId,
        targetAgent: 'Employee AI Agent',
        eventType: `manager_response_to_employee_ai_${action}`,
        modelName: workflow.employeeModel,
        summary: decisionSummary
      });
      notifyStakeholders({ directory, recipients: [workflow.employeeId], type: action === 'manager_approve' ? 'WORKFLOW_MANAGER_ACCEPTED' : action === 'manager_reject' ? 'WORKFLOW_MANAGER_REJECTED' : 'WORKFLOW_MANAGER_FEEDBACK', title: action === 'manager_approve' ? `Manager accepted proposal: ${workflow.employeeName}` : action === 'manager_reject' ? `Manager rejected proposal: ${workflow.employeeName}` : `Manager feedback for: ${workflow.employeeName}`, workflow, feedback: decisionSummary });
    }

    res.json({ message: `Workflow moved to ${workflow.status}.`, workflow: serializeWorkflow(workflow) });
  } catch (err) {
    console.error('[Workflow transition error]', err.message);
    res.status(500).json({ error: 'Failed to update communication workflow.' });
  }
});

router.get('/consistency', authenticateToken, requireRole('Admin'), (req, res) => {
  const workflows = (state.memoryDb.workflowRequests || []).map(workflow => ({ workflowId: workflow._id, ...consistencyCheck(workflow) }));
  res.json({ passed: workflows.every(workflow => workflow.passed), checkedAt: new Date().toISOString(), workflows });
});

export default router;
