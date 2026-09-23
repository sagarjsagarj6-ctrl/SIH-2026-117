const definitions = [
  {
    type: 'trigger.manual',
    category: 'TRIGGER',
    name: 'Manual Start',
    description: 'Start the workflow from the Run button.',
    icon: '▶',
    inputs: [],
    outputs: ['input'],
    config: [{ key: 'input', label: 'Initial input', type: 'textarea', default: '' }],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'trigger.schedule',
    category: 'TRIGGER',
    name: 'Scheduled Run',
    description: 'Run on a local interval or a five-field cron expression.',
    icon: '◷',
    inputs: [],
    outputs: ['input'],
    config: [
      { key: 'scheduleType', label: 'Schedule type', type: 'select', options: ['interval', 'cron'], default: 'interval' },
      { key: 'intervalMinutes', label: 'Interval (minutes)', type: 'number', default: 15, min: 1, max: 1440 },
      { key: 'cronExpression', label: 'Cron expression', type: 'text', default: '0 9 * * *' },
      { key: 'timezone', label: 'Timezone label', type: 'text', default: 'Asia/Kolkata' },
      { key: 'input', label: 'Scheduled input', type: 'textarea', default: '' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'agent.rag',
    category: 'AGENT',
    name: 'Knowledge Search',
    description: 'Search the department-scoped local knowledge base.',
    icon: '⌕',
    inputs: ['query'],
    outputs: ['answer', 'citations'],
    config: [
      { key: 'query', label: 'Query', type: 'text', default: 'Summarize the relevant local policy.' },
      { key: 'topK', label: 'Top results', type: 'number', default: 4, min: 1, max: 10 }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'agent.data-science',
    category: 'AGENT',
    name: 'Data Analysis',
    description: 'Compute statistics, anomalies, and trend projections.',
    icon: '▥',
    inputs: ['dataset'],
    outputs: ['summary', 'statistics', 'charts'],
    config: [
      { key: 'dataset', label: 'Dataset (comma separated)', type: 'text', default: '10, 12, 11, 13, 12' },
      { key: 'analysisType', label: 'Analysis', type: 'select', options: ['auto', 'anomaly', 'regression'], default: 'auto' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'agent.reporting',
    category: 'AGENT',
    name: 'Generate Report',
    description: 'Compile upstream findings into a local executive report.',
    icon: '▤',
    inputs: ['data'],
    outputs: ['report', 'sections'],
    config: [{ key: 'title', label: 'Report title', type: 'text', default: 'Sovereign AI Workflow Report' }],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.calculator',
    category: 'TOOL',
    name: 'Calculator',
    description: 'Evaluate a safe arithmetic expression.',
    icon: '＋',
    inputs: ['value'],
    outputs: ['result'],
    config: [
      { key: 'expression', label: 'Expression', type: 'text', default: '{{input.value}} * 1.18' },
      { key: 'precision', label: 'Precision', type: 'number', default: 2, min: 0, max: 8 }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.json-transform',
    category: 'TOOL',
    name: 'JSON Transform',
    description: 'Pick or omit fields from the previous node output.',
    icon: '{}',
    inputs: ['data'],
    outputs: ['result'],
    config: [
      { key: 'operation', label: 'Operation', type: 'select', options: ['passthrough', 'pick', 'omit'], default: 'passthrough' },
      { key: 'fields', label: 'Fields (comma separated)', type: 'text', default: '' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'logic.if',
    category: 'LOGIC',
    name: 'If Condition',
    description: 'Route execution to True or False branch based on condition.',
    icon: '⑂',
    inputs: ['data'],
    outputs: ['true', 'false'],
    config: [
      { key: 'property', label: 'Field or expression', type: 'text', default: '{{$json.status}}' },
      { key: 'operator', label: 'Operator', type: 'select', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'], default: 'equals' },
      { key: 'value', label: 'Compare value', type: 'text', default: 'success' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.code',
    category: 'TOOL',
    name: 'Code (JavaScript)',
    description: 'Transform data using custom JavaScript like n8n Code node.',
    icon: 'JS',
    inputs: ['input'],
    outputs: ['output'],
    config: [
      {
        key: 'code',
        label: 'JavaScript Code',
        type: 'textarea',
        default: 'return {\n  ...items,\n  processedAt: new Date().toISOString(),\n  summary: items.answer || items.text || "Processed by Code node"\n};'
      }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.http',
    category: 'TOOL',
    name: 'HTTP Request',
    description: 'Make a local or LAN HTTP request to an internal API.',
    icon: '⇄',
    inputs: ['data'],
    outputs: ['response'],
    config: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      { key: 'url', label: 'URL', type: 'text', default: 'http://127.0.0.1:5001/api/health' },
      { key: 'body', label: 'Body (JSON)', type: 'textarea', default: '{\n  "query": "{{$json.query}}"\n}' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.set',
    category: 'TOOL',
    name: 'Edit Fields (Set)',
    description: 'Set, override, or rename fields on the workflow data.',
    icon: '✎',
    inputs: ['data'],
    outputs: ['result'],
    config: [
      { key: 'key', label: 'Field name', type: 'text', default: 'summary' },
      { key: 'value', label: 'Field value', type: 'text', default: '{{$json.answer}}' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'tool.excel',
    category: 'TOOL',
    name: 'Read Excel / CSV',
    description: 'Load rows and columns from Excel (.xlsx/.xls) or CSV files.',
    icon: '▦',
    inputs: ['trigger'],
    outputs: ['rows', 'firstRow', 'summary'],
    config: [
      { key: 'dataset', label: 'Dataset / Source', type: 'select', options: ['sample_hardware_inventory', 'sample_financial_ledger', 'sample_employee_roster', 'custom_path'], default: 'sample_hardware_inventory' },
      { key: 'customPath', label: 'Custom File Path (if custom)', type: 'text', default: 'data/demo-documents/financial_report.csv' },
      { key: 'sheetName', label: 'Sheet Name (optional)', type: 'text', default: 'Sheet1' },
      { key: 'maxRows', label: 'Max Rows', type: 'number', default: 25 }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'output.email',
    category: 'OUTPUT',
    name: 'Send Email / Gmail',
    description: 'Automate sending email via Gmail or local SMTP with Private LAN fallback.',
    icon: '✉',
    inputs: ['data'],
    outputs: ['sent', 'details'],
    config: [
      { key: 'provider', label: 'Email Provider', type: 'select', options: ['gmail', 'lan_smtp', 'lan_direct'], default: 'gmail' },
      { key: 'to', label: 'Recipient (To)', type: 'text', default: '{{$json.supplierEmail}}' },
      { key: 'subject', label: 'Subject', type: 'text', default: 'Automated Alert: Stock notice for {{$json.part}}' },
      { key: 'body', label: 'Body (HTML or Text)', type: 'textarea', default: 'Hello,\n\nAutomated message from Sovereign AI Workbench:\nItem: {{$json.part}}\nCurrent Count: {{$json.count}}\nStatus: {{$json.status}}\n\nPlease review immediately.' },
      { key: 'smtpUser', label: 'Gmail / SMTP User (optional)', type: 'text', default: '' },
      { key: 'smtpPass', label: 'Gmail App Password (optional)', type: 'text', default: '' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'output.lan-message',
    category: 'OUTPUT',
    name: 'Dispatch LAN Message',
    description: 'Broadcast automated alerts across the Private LAN to connected devices.',
    icon: '🔔',
    inputs: ['data'],
    outputs: ['delivered', 'count'],
    config: [
      { key: 'scope', label: 'Target Scope', type: 'select', options: ['all_connected_lan', 'department', 'current_user'], default: 'all_connected_lan' },
      { key: 'title', label: 'Notification Title', type: 'text', default: 'Automated Notice: {{$json.part}}' },
      { key: 'message', label: 'Message Text', type: 'textarea', default: 'Automated workflow execution alert:\n{{$json.summary}}' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['info', 'warning', 'critical'], default: 'warning' }
    ],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'output.database',
    category: 'OUTPUT',
    name: 'Save Result',
    description: 'Persist the result in the local workflow output store.',
    icon: '▣',
    inputs: ['data'],
    outputs: ['acknowledged', 'recordId'],
    config: [{ key: 'collection', label: 'Collection', type: 'text', default: 'workflow_results' }],
    paletteGroup: 'core',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'train.image-model',
    category: 'TRAIN',
    name: 'Train Image Model',
    description: 'Admin only: train on manuals + images, then deploy over LAN.',
    icon: '▣',
    inputs: ['manuals'],
    outputs: ['job'],
    config: [
      { key: 'jobName', label: 'Model name', type: 'text', default: 'Hardware Image Model' },
      { key: 'manualText', label: 'Hardware manual text', type: 'textarea', default: '' },
      { key: 'sampleName', label: 'Part name', type: 'text', default: '' },
      { key: 'sampleCategory', label: 'Category', type: 'text', default: '' },
      { key: 'sampleMetal', label: 'Metal / material', type: 'text', default: '' },
      { key: 'sampleLifespan', label: 'Lifespan', type: 'text', default: '' },
      { key: 'imageUploadId', label: 'Training image id', type: 'text', default: '' }
    ],
    paletteGroup: 'train-image-model',
    roles: ['Admin']
  },
  {
    type: 'input.image',
    category: 'INPUT',
    name: 'Add Image',
    description: 'Capture from camera or choose from gallery.',
    icon: '📷',
    inputs: [],
    outputs: ['image'],
    config: [
      { key: 'imageUploadId', label: 'Image upload id', type: 'text', default: '' },
      { key: 'fileName', label: 'File name', type: 'text', default: '' }
    ],
    paletteGroup: 'image-model',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'agent.image-model',
    category: 'AGENT',
    name: 'Image Model',
    description: 'Hardware manual + image analysis + comparison prediction team.',
    icon: '⌖',
    inputs: ['image', 'query'],
    outputs: ['prediction', 'features', 'matches'],
    config: [
      { key: 'query', label: 'User query', type: 'textarea', default: 'Identify this part, category, metal type, and lifespan.' },
      { key: 'imageUploadId', label: 'Image upload id', type: 'text', default: '' }
    ],
    paletteGroup: 'image-model',
    roles: ['Admin', 'Manager', 'Employee']
  },
  {
    type: 'agent.hardware-manual',
    category: 'AGENT',
    name: 'Hardware Manual Agent',
    description: 'Admin testing node: retrieve only from the trained hardware catalog.',
    icon: '⌕',
    inputs: ['query'],
    outputs: ['matches', 'answer'],
    config: [{ key: 'query', label: 'Catalog query', type: 'textarea', default: 'Find the matching hardware part.' }],
    paletteGroup: 'train-image-model',
    roles: ['Admin']
  },
  {
    type: 'agent.image-analysis',
    category: 'AGENT',
    name: 'Image Analysis Agent',
    description: 'Admin testing node: inspect an attached image into an evidence-first feature card.',
    icon: '◉',
    inputs: ['image'],
    outputs: ['features', 'observations'],
    config: [
      { key: 'imageUploadId', label: 'Image upload id', type: 'text', default: '' },
      { key: 'query', label: 'Analysis context', type: 'textarea', default: '' }
    ],
    paletteGroup: 'train-image-model',
    roles: ['Admin']
  },
  {
    type: 'agent.image-compare',
    category: 'AGENT',
    name: 'Comparison Prediction Agent',
    description: 'Admin testing node: compare manual matches and observed features without invented specs.',
    icon: '⇄',
    inputs: ['matches', 'features', 'query'],
    outputs: ['prediction', 'answer'],
    config: [{ key: 'query', label: 'Prediction query', type: 'textarea', default: 'Which catalog part best matches this image?' }],
    paletteGroup: 'train-image-model',
    roles: ['Admin']
  }
];

export class NodeRegistry {
  static list(role) {
    if (!role) return definitions;
    return definitions.filter((definition) => !definition.roles || definition.roles.includes(role));
  }

  static get(type) {
    return definitions.find((definition) => definition.type === type) || null;
  }
}
