import assert from 'node:assert/strict';
import { NodeRegistry } from '../services/playground/NodeRegistry.js';
import { ExecutionEngine } from '../services/playground/ExecutionEngine.js';
import { WorkflowStore } from '../services/playground/WorkflowStore.js';
import { state } from '../config/db.js';

const user = { _id: 'test-user-1', id: 'test-user-1', role: 'Employee', department: 'Engineering' };

const setup = () => {
  state.isMongooseConnected = false;
  state.memoryDb.playgroundWorkflows = [];
  state.memoryDb.playgroundRuns = [];
  state.memoryDb.workflowOutputs = [];
};

const runTest = async () => {
  setup();
  console.log('--- STARTING PLAYGROUND / N8N CLONE VERIFICATION ---');

  // 1. Check NodeRegistry definitions
  const nodes = NodeRegistry.list('Employee');
  const types = nodes.map(n => n.type);
  assert(types.includes('logic.if'), 'Must include logic.if node');
  assert(types.includes('tool.code'), 'Must include tool.code node');
  assert(types.includes('tool.http'), 'Must include tool.http node');
  assert(types.includes('tool.set'), 'Must include tool.set node');
  console.log('✓ NodeRegistry contains all n8n node types');

  // 2. Test Execution: Manual Start -> Code Node -> If Condition (True Branch) -> Set Node
  const workflowTrue = {
    _id: 'wf-test-true',
    name: 'Test Workflow (True branch)',
    nodes: [
      { id: 'start', type: 'trigger.manual', position: { x: 0, y: 0 }, data: { config: { input: 'hello' } } },
      {
        id: 'code-1',
        type: 'tool.code',
        position: { x: 200, y: 0 },
        data: {
          config: {
            code: 'return { status: "active", score: 95, tag: "verified" };'
          }
        }
      },
      {
        id: 'if-1',
        type: 'logic.if',
        position: { x: 400, y: 0 },
        data: {
          config: {
            property: '{{$json.score}}',
            operator: 'greater_than',
            value: '50'
          }
        }
      },
      {
        id: 'set-true',
        type: 'tool.set',
        position: { x: 600, y: -50 },
        data: {
          config: {
            key: 'finalStatus',
            value: 'APPROVED: {{$json.tag}}'
          }
        }
      },
      {
        id: 'set-false',
        type: 'tool.set',
        position: { x: 600, y: 50 },
        data: {
          config: {
            key: 'finalStatus',
            value: 'REJECTED'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', sourceHandle: 'output', target: 'code-1', targetHandle: 'input' },
      { id: 'e2', source: 'code-1', sourceHandle: 'output', target: 'if-1', targetHandle: 'data' },
      { id: 'e3', source: 'if-1', sourceHandle: 'true', target: 'set-true', targetHandle: 'data' },
      { id: 'e4', source: 'if-1', sourceHandle: 'false', target: 'set-false', targetHandle: 'data' }
    ],
    settings: { concurrency: 1, errorHandling: 'stop' }
  };

  const resultTrue = await ExecutionEngine.run({ workflow: workflowTrue, user, input: {} });
  assert.equal(resultTrue.status, 'success');

  const trueNodeRun = resultTrue.nodes.find(n => n.nodeId === 'set-true');
  const falseNodeRun = resultTrue.nodes.find(n => n.nodeId === 'set-false');

  assert.equal(trueNodeRun.status, 'success');
  assert.equal(trueNodeRun.output.finalStatus, 'APPROVED: verified');
  assert.equal(falseNodeRun.status, 'skipped', 'False branch must be skipped');
  console.log('✓ Conditional branch routing & skipping passed (True branch executed, False branch skipped)');

  // 3. Test $node expression resolution across workflow
  const workflowExpr = {
    _id: 'wf-test-expr',
    name: 'Test Expression',
    nodes: [
      { id: 'n1', type: 'trigger.manual', position: { x: 0, y: 0 }, data: { label: 'Start Node', config: { input: 'alpha-123' } } },
      { id: 'n2', type: 'tool.code', position: { x: 200, y: 0 }, data: { config: { code: 'return { key: "step2" };' } } },
      {
        id: 'n3',
        type: 'tool.set',
        position: { x: 400, y: 0 },
        data: {
          config: {
            key: 'ref',
            value: 'RefFromStart={{$node["Start Node"].input}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'n1', sourceHandle: 'output', target: 'n2', targetHandle: 'input' },
      { id: 'e2', source: 'n2', sourceHandle: 'output', target: 'n3', targetHandle: 'data' }
    ]
  };

  const resultExpr = await ExecutionEngine.run({ workflow: workflowExpr, user, input: {} });
  const n3Run = resultExpr.nodes.find(n => n.nodeId === 'n3');
  assert.equal(n3Run.output.ref, 'RefFromStart=alpha-123');
  console.log('✓ n8n $node["Node Label"].field cross-node expression resolution passed');

  // 4. Test Excel Sheet Data Loading -> Email / LAN Notification Dispatch
  const workflowExcelEmail = {
    _id: 'wf-test-excel-email',
    name: 'Excel to Email & LAN Alert',
    nodes: [
      { id: 'start', type: 'trigger.manual', position: { x: 0, y: 0 }, data: { config: { input: 'start' } } },
      { id: 'excel', type: 'tool.excel', position: { x: 200, y: 0 }, data: { config: { dataset: 'sample_hardware_inventory' } } },
      {
        id: 'email',
        type: 'output.email',
        position: { x: 450, y: -50 },
        data: {
          config: {
            provider: 'lan_direct',
            to: '{{$json.supplierEmail}}',
            subject: 'Low Stock Alert for {{$json.part}}',
            body: 'Stock count is {{$json.count}} (minimum required: {{$json.minRequired}}).'
          }
        }
      },
      {
        id: 'lan',
        type: 'output.lan-message',
        position: { x: 450, y: 50 },
        data: {
          config: {
            scope: 'current_user',
            title: 'Inventory Alert: {{$json.part}}',
            message: 'Urgent restocking needed for {{$json.part}}.'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'start', sourceHandle: 'output', target: 'excel', targetHandle: 'trigger' },
      { id: 'e2', source: 'excel', sourceHandle: 'rows', target: 'email', targetHandle: 'data' },
      { id: 'e3', source: 'excel', sourceHandle: 'rows', target: 'lan', targetHandle: 'data' }
    ]
  };

  const resultAutomation = await ExecutionEngine.run({ workflow: workflowExcelEmail, user, input: {} });
  assert.equal(resultAutomation.status, 'success');

  const excelRun = resultAutomation.nodes.find(n => n.nodeId === 'excel');
  assert.equal(excelRun.status, 'success');
  assert.equal(excelRun.output.rows.length, 4);
  assert.equal(excelRun.output.part, 'High-Tensile Steel Bearing #44');

  const emailRun = resultAutomation.nodes.find(n => n.nodeId === 'email');
  assert.equal(emailRun.status, 'success');
  assert.equal(emailRun.output.to, 'logistics@parts-supplier.lan');
  assert(emailRun.output.subject.includes('High-Tensile Steel Bearing #44'));

  const lanRun = resultAutomation.nodes.find(n => n.nodeId === 'lan');
  assert.equal(lanRun.status, 'success');
  assert.equal(lanRun.output.delivered, true);
  console.log('✓ Excel Sheet parsing, automated Email, and LAN notification dispatch passed');

  console.log('=======================================================');
  console.log(' ALL PLAYGROUND / N8N CLONE TESTS PASSED SUCCESSFULLY! ');
  console.log('=======================================================');
};

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
