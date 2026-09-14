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
