/**
 * TaskDecomposer — Breaks complex enterprise prompts into atomic, ordered sub-tasks for multi-agent execution.
 */

export class TaskDecomposer {
  static decompose(query, department = 'All') {
    const qLower = query.toLowerCase();
    const tasks = [];

    const hasRAG = qLower.includes('search') || qLower.includes('find') || qLower.includes('summarize') ||
      qLower.includes('what is') || qLower.includes('policy') || qLower.includes('guideline') ||
      qLower.includes('contract') || qLower.includes('specs') || qLower.includes('information') ||
      qLower.includes('explain') || qLower.includes('overview') || qLower.includes('compliance');

    const hasDataScience = qLower.includes('anomaly') || qLower.includes('metric') || qLower.includes('trend') ||
      qLower.includes('statistic') || qLower.includes('forecast') || qLower.includes('analyze data') ||
      qLower.includes('revenue variance') || qLower.includes('correlation') || qLower.includes('numbers') ||
      qLower.includes('chart') || qLower.includes('graph');

    const hasVision = qLower.includes('ocr') || qLower.includes('image') || qLower.includes('blueprint') ||
      qLower.includes('scanned') || qLower.includes('form ref') || qLower.includes('diagram') ||
      qLower.includes('photo') || qLower.includes('handwriting');

    const hasReporting = qLower.includes('report') || qLower.includes('executive summary') ||
      qLower.includes('audit report') || qLower.includes('generate document') || qLower.includes('memo') ||
      qLower.includes('export') || qLower.includes('compile');

    // Scenario 1: Multi-Agent Sequential Pipeline
    if (hasReporting && (hasDataScience || hasRAG)) {
      if (hasRAG) {
        tasks.push({
          step: 1,
          agentKey: 'RAG',
          goal: 'Retrieve relevant contextual documents and policy guidelines from local vector index',
          prompt: query
        });
      }
      if (hasDataScience) {
        tasks.push({
          step: tasks.length + 1,
          agentKey: 'DATA_SCIENCE',
          goal: 'Execute statistical anomaly detection and calculate metrics on retrieved figures',
          prompt: query
        });
      }
      tasks.push({
        step: tasks.length + 1,
        agentKey: 'REPORTING',
        goal: 'Compile previous agent findings into a structured, watermarked enterprise executive report',
        prompt: query
      });
      return { mode: 'SEQUENTIAL', tasks };
    }

    // Scenario 2: Data Science + Reporting
    if (hasDataScience) {
      tasks.push({
        step: 1,
        agentKey: 'DATA_SCIENCE',
        goal: 'Analyze numerical metrics, compute IQR anomalies, and generate chart configurations',
        prompt: query
      });
      return { mode: 'SINGLE', tasks };
    }

    // Scenario 3: Vision
    if (hasVision) {
      tasks.push({
        step: 1,
        agentKey: 'VISION',
        goal: 'Process visual blueprint/form via local vision model, perform OCR, and extract entities',
        prompt: query
      });
      return { mode: 'SINGLE', tasks };
    }

    // Scenario 4: Reporting only
    if (hasReporting) {
      tasks.push({
        step: 1,
        agentKey: 'REPORTING',
        goal: 'Generate structured enterprise audit or compliance report',
        prompt: query
      });
      return { mode: 'SINGLE', tasks };
    }

    // Default Scenario: RAG Search & Knowledge Retrieval
    tasks.push({
      step: 1,
      agentKey: 'RAG',
      goal: 'Retrieve evidence from local vector database and formulate verified answer with citations',
      prompt: query
    });

    return { mode: 'SINGLE', tasks };
  }
}
