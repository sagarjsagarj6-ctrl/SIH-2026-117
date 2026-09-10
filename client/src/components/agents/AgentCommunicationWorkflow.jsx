import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bot, UploadCloud, FileText, ShieldCheck, BriefcaseBusiness,
  Users, ArrowRight, CheckCircle2, XCircle, Sparkles, Gauge,
  Send
} from 'lucide-react';

const ADMIN_MODELS = [
  { id: 'finance-expert', name: 'Finance Expert Model', type: 'Employee AI Model' },
  { id: 'ops-analyst', name: 'Operations Analyst Model', type: 'Employee AI Model' },
  { id: 'risk-review', name: 'Risk Review Model', type: 'Manager AI Model' },
  { id: 'policy-guardian', name: 'Policy Guardian Model', type: 'Manager AI Model' },
  { id: 'compliance-insight', name: 'Compliance Insight Model', type: 'Manager AI Model' }
];

const BUSINESS_AGENTS = [
  {
    id: 'employee-agent',
    name: 'Employee AI Agent',
    role: 'Employee Intent Review',
    summary: 'Reads business files, extracts key issues, and proposes corrective action.',
    color: '#818cf8',
  },
  {
    id: 'manager-agent',
    name: 'Manager AI Agent',
    role: 'Validation Review',
    summary: 'Validates the employee AI summary and confirms the final business decision.',
    color: '#22c55e',
  }
];

const initialRequests = [
  {
    id: 'req-101',
    employeeAgent: 'Employee AI Agent',
    managerAgent: 'Manager AI Agent',
    employeeModel: 'Finance Expert Model',
    managerModel: 'Risk Review Model',
    employeeName: 'Riya Shah',
    managerName: 'Elena Vance',
    status: 'task completed',
    summary: 'Budget variance flagged in the ledger and accepted after review by the manager AI agent.',
    createdAt: '2026-09-10T09:15:00Z',
    transitions: [
      { label: 'requested', at: '2026-09-10T09:15:00Z' },
      { label: 'employee-ai draft', at: '2026-09-10T09:17:00Z' },
      { label: 'awaiting employee approval', at: '2026-09-10T09:21:00Z' },
      { label: 'sent to manager-ai', at: '2026-09-10T09:22:00Z' },
      { label: 'manager-ai validation', at: '2026-09-10T09:24:00Z' },
      { label: 'awaiting manager approval', at: '2026-09-10T09:25:00Z' },
      { label: 'task completed', at: '2026-09-10T09:28:00Z' }
    ]
  },
  {
    id: 'req-102',
    employeeAgent: 'Employee AI Agent',
    managerAgent: 'Manager AI Agent',
    employeeModel: 'Operations Analyst Model',
    managerModel: 'Policy Guardian Model',
    employeeName: 'Nikhil Rao',
    managerName: 'Priya Sen',
    status: 'awaiting manager approval',
    summary: 'Operations backlog analysis requires final decision from the manager AI model after employee approval.',
    createdAt: '2026-09-10T11:05:00Z',
    transitions: [
      { label: 'requested', at: '2026-09-10T11:05:00Z' },
      { label: 'employee-ai draft', at: '2026-09-10T11:07:00Z' },
      { label: 'awaiting employee approval', at: '2026-09-10T11:09:00Z' },
      { label: 'sent to manager-ai', at: '2026-09-10T11:11:00Z' },
      { label: 'manager-ai validation', at: '2026-09-10T11:12:00Z' },
      { label: 'awaiting manager approval', at: '2026-09-10T11:13:00Z' }
    ]
  }
];

const statusTone = {
  requested: '#a5b4fc',
  'employee-ai draft': '#818cf8',
  'awaiting employee approval': '#f59e0b',
  'sent to manager-ai': '#06b6d4',
  'manager-ai validation': '#14b8a6',
  'awaiting manager approval': '#84cc16',
  'task completed': '#22c55e',
  'task rejected': '#ef4444'
};

const pickActionFromText = (agentId, text, modelName) => {
  const lower = (text || '').toLowerCase();
  const modelLabel = modelName || 'standard model';

  if (agentId === 'employee-agent') {
    const issues = [];
    if (lower.includes('budget') || lower.includes('variance') || lower.includes('expense') || lower.includes('invoice')) {
      issues.push('Budget variance and financial exposure are visible in the current operating file.');
    }
    if (lower.includes('delay') || lower.includes('backlog') || lower.includes('handoff') || lower.includes('queue')) {
      issues.push('Operational delays or handoff bottlenecks are degrading execution flow.');
    }
    if (lower.includes('risk') || lower.includes('policy') || lower.includes('compliance')) {
      issues.push('There is a governance or risk-control issue that needs formal review before action.');
    }
    if (issues.length === 0) {
      issues.push('The uploaded case indicates an execution issue that requires a targeted operational response.');
    }

    const proposedSolutions = [
      'Reframe the issue into a concise operational decision brief with the affected process owner.',
      'Recommend the minimal corrective action that reduces risk without causing downstream disruption.',
      'Attach a clear approval path so the employee can validate the summary before manager escalation.'
    ];

    return {
      keyTakeaways: issues,
      proposedSolutions,
      recommendedAction: `${modelLabel} highlights the main issue and recommends a business-safe next step with employee approval before escalation to the manager agent.`,
      draftSummary: `Using ${modelLabel}, the employee AI agent identified the key issue set, proposed the minimal intervention, and prepared a summary ready for employee approval and manager-AI validation.`
    };
  }

  const managerIssues = [
    'The manager AI agent validated the employee summary against business risk and operational impact.',
    'The proposed intervention is consistent with policy scope and business priority.',
    'The decision is ready for final human approval from the department manager.'
  ];

  return {
    keyTakeaways: managerIssues,
    proposedSolutions: [
      'Validate the employee recommendation against company policy and operational impact.',
      'Confirm ownership and risk controls before approving the final action.',
      'Escalate only when the manager human approves the final decision.'
    ],
    recommendedAction: `${modelLabel} confirms the employee recommendation and requests final human manager approval before execution.`,
    draftSummary: `Using ${modelLabel}, the manager AI agent validated the request, confirmed the final recommendation, and requires manager approval before action is finalized.`
  };
};

export const AgentCommunicationWorkflow = () => {
  const { user } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState('employee-agent');
  const [selectedFile, setSelectedFile] = useState(null);
  const [report, setReport] = useState(null);
  const [requests, setRequests] = useState(initialRequests);
  const [employeeModelId, setEmployeeModelId] = useState('finance-expert');
  const [managerModelId, setManagerModelId] = useState('risk-review');

  const selectedAgent = useMemo(
    () => BUSINESS_AGENTS.find(agent => agent.id === selectedAgentId) || BUSINESS_AGENTS[0],
    [selectedAgentId]
  );

  const selectedEmployeeModel = useMemo(
    () => ADMIN_MODELS.find(model => model.id === employeeModelId) || ADMIN_MODELS[0],
    [employeeModelId]
  );

  const selectedManagerModel = useMemo(
    () => ADMIN_MODELS.find(model => model.id === managerModelId) || ADMIN_MODELS[2],
    [managerModelId]
  );

  const managerQueue = useMemo(() => {
    if (!user) return [];
    return requests.filter(req => {
      const isCurrentEmployee = req.employeeName === user.name;
      const isManagerRole = user.role === 'Manager' || user.role === 'Admin';
      return isManagerRole || isCurrentEmployee;
    });
  }, [requests, user]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const content = await file.text().catch(() => '');
    const decision = pickActionFromText(
      selectedAgentId,
      content || `Business communication case for ${selectedAgent.name}: review operational impact, extract the business issue, and propose a safe next step.`,
      selectedAgentId === 'employee-agent' ? selectedEmployeeModel.name : selectedManagerModel.name
    );

    setReport(decision);
  };

  const submitRequest = () => {
    if (!selectedFile || !report) return;

    const newRequest = {
      id: `req-${Date.now()}`,
      employeeAgent: 'Employee AI Agent',
      managerAgent: 'Manager AI Agent',
      employeeModel: selectedEmployeeModel.name,
      managerModel: selectedManagerModel.name,
      employeeName: user?.name || 'Current Employee',
      managerName: user?.role === 'Manager' ? user.name : 'Assigned Manager',
      status: 'awaiting employee approval',
      summary: report.recommendedAction,
      createdAt: new Date().toISOString(),
      transitions: [
        { label: 'requested', at: new Date().toISOString() },
        { label: 'employee-ai draft', at: new Date().toISOString() },
        { label: 'awaiting employee approval', at: new Date().toISOString() }
      ]
    };

    setRequests(prev => [newRequest, ...prev]);
    setSelectedFile(null);
    setReport(null);
  };

  const updateRequestState = (requestId, newStatus) => {
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      return {
        ...req,
        status: newStatus,
        transitions: [...(req.transitions || []), { label: newStatus, at: new Date().toISOString() }],
        summary: req.summary || newStatus
      };
    }));
  };

  const isAdmin = user?.role === 'Admin';
  const isEmployee = user?.role === 'Employee';
  const isManager = user?.role === 'Manager';
  const isManagerActionAllowed = isManager && !isAdmin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Bot size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>AI Agent Communication Workflow</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>Employee AI agent → manager AI agent → employee human approval → manager human approval</div>
            </div>
          </div>
          <div className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>ADMIN-TRAINED MODELS · PRIVATE LAN</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          {BUSINESS_AGENTS.map(agent => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              style={{
                border: selectedAgentId === agent.id ? `1px solid ${agent.color}` : '1px solid var(--border-color)',
                background: selectedAgentId === agent.id ? `${agent.color}18` : 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                padding: '14px 12px',
                textAlign: 'left',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: agent.color }} />
                <div style={{ fontWeight: 800 }}>{agent.name}</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{agent.role}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '8px' }}>{agent.summary}</div>
            </button>
          ))}
        </div>

        {!isAdmin ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '18px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <Gauge size={16} /> MODEL SELECTION
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Employee AI model</label>
                  <select
                    value={employeeModelId}
                    onChange={(e) => setEmployeeModelId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 12px' }}
                  >
                    {ADMIN_MODELS.filter(m => m.type === 'Employee AI Model').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Manager AI model</label>
                  <select
                    value={managerModelId}
                    onChange={(e) => setManagerModelId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 12px' }}
                  >
                    {ADMIN_MODELS.filter(m => m.type === 'Manager AI Model').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <UploadCloud size={16} /> {selectedAgent.name} FILE INPUT
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                style={{ width: '100%', background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginTop: '10px' }}
              />

              {selectedFile && (
                <div style={{ marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FileText size={14} /> Selected file: {selectedFile.name}
                  </div>
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: '#a5b4fc' }}>AI summary</div>
                    <div>{report?.recommendedAction || 'Waiting for the selected agent to analyze the uploaded business file.'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <BriefcaseBusiness size={16} /> {selectedAgent.name} REPORT SUMMARY
              </div>

              {report ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Key takeaways</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-main)', lineHeight: 1.7 }}>
                      {report.keyTakeaways.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Proposed solutions</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-main)', lineHeight: 1.7 }}>
                      {report.proposedSolutions.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '10px', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, color: '#86efac' }}>
                      <Sparkles size={14} /> Recommended next step
                    </div>
                    {report.draftSummary}
                  </div>

                  <button
                    type="button"
                    onClick={submitRequest}
                    disabled={!selectedFile || !report}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      padding: '10px 12px',
                      background: selectedFile && report ? 'linear-gradient(135deg, #6366f1, #16a34a)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      cursor: selectedFile && report ? 'pointer' : 'not-allowed',
                      opacity: selectedFile && report ? 1 : 0.6
                    }}
                  >
                    Send summary for employee approval
                  </button>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Upload a file and select the appropriate AI model to generate the employee-agent summary.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} /> ADMIN WORKFLOW LEDGER
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              <div>Employee AI</div>
              <div>Manager AI</div>
              <div>Current State</div>
              <div>Trace</div>
            </div>
            {requests.map(req => (
              <div key={`admin-${req.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 0', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{req.employeeModel || 'Employee AI Model'}</div>
                <div>{req.managerModel || 'Manager AI Model'}</div>
                <div style={{ color: statusTone[req.status] || '#fff', fontWeight: 700 }}>{req.status}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{req.transitions.length} steps</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>
            <Users size={16} /> AI Communication Queue
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {managerQueue.map(req => (
              <div key={req.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800 }}>{req.employeeModel}</div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      color: statusTone[req.status] || '#fff',
                      background: `${statusTone[req.status] || '#fff'}20`,
                      border: `1px solid ${statusTone[req.status] || '#fff'}50`,
                      textTransform: 'lowercase'
                    }}
                  >
                    {req.status}
                  </span>
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Employee: {req.employeeName} · Manager AI: {req.managerModel} · Human manager: {req.managerName || 'Pending'}
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.8rem', lineHeight: 1.5 }}>{req.summary}</div>

                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {req.status === 'awaiting employee approval' && isEmployee && (
                    <button type="button" onClick={() => updateRequestState(req.id, 'sent to manager-ai')} style={{ ...buttonStyle, background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }}>
                      <Send size={12} style={{ marginRight: 6 }} /> Employee approves & send to manager AI
                    </button>
                  )}
                  {req.status === 'sent to manager-ai' && isManagerActionAllowed && (
                    <button type="button" onClick={() => updateRequestState(req.id, 'awaiting manager approval')} style={{ ...buttonStyle, background: 'rgba(20,184,166,0.12)', color: '#5eead4', border: '1px solid rgba(20,184,166,0.35)' }}>
                      Manager AI validates response
                    </button>
                  )}
                  {req.status === 'awaiting manager approval' && isManagerActionAllowed && (
                    <>
                      <button type="button" onClick={() => updateRequestState(req.id, 'task completed')} style={{ ...buttonStyle, background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.35)' }}>
                        <CheckCircle2 size={12} style={{ marginRight: 6 }} /> Manager approves
                      </button>
                      <button type="button" onClick={() => updateRequestState(req.id, 'task rejected')} style={{ ...buttonStyle, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <XCircle size={12} style={{ marginRight: 6 }} /> Reject final action
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} /> {isAdmin ? 'Admin State Audit' : 'Transition Trace'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requests.map(req => (
              <div key={req.id} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{req.employeeName}</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{req.id}</span>
                </div>
                {!isAdmin && (
                  <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Employee AI: {req.employeeModel} · Manager AI: {req.managerModel}
                  </div>
                )}
                {isAdmin && (
                  <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {req.employeeModel} → {req.managerModel}
                  </div>
                )}
                <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  {req.transitions.map((t, index) => (
                    <div key={`${req.id}-${index}`} style={{ marginBottom: '3px' }}>
                      <ArrowRight size={10} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      {t.label} · {new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '7px 10px',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.72rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
};
