/**
 * DatasetPreparer — Converts departmental knowledge documents into instruction-tuning JSONL format.
 */

export class DatasetPreparer {
  static prepareInstructionDataset({ documents = [], department = 'Finance' }) {
    const jsonlRows = [];

    documents.forEach((doc, idx) => {
      const title = doc.title || `Document ${idx + 1}`;
      const snippet = doc.snippet || 'Enterprise operational procedure.';

      // Sample instruction pairs generated from document content
      jsonlRows.push({
        instruction: `What are the core operational guidelines detailed in ${title}?`,
        input: `Department: ${department}`,
        output: `According to ${title}: ${snippet}`
      });

      jsonlRows.push({
        instruction: `Explain compliance requirements related to ${title}.`,
        input: `Security Level: ${doc.sensitivity || 'Confidential'}`,
        output: `All staff in ${department} must strictly observe the data protocols of ${title}. Air-gap transmission rules apply.`
      });
    });

    if (jsonlRows.length === 0) {
      jsonlRows.push({
        instruction: `Provide an overview of ${department} operations.`,
        input: 'General Query',
        output: `${department} adheres to strict sovereign AI data protection and zero-trust policies.`
      });
    }

    // Split 90% train / 10% test
    const splitIndex = Math.max(1, Math.floor(jsonlRows.length * 0.9));
    const trainSet = jsonlRows.slice(0, splitIndex);
    const testSet = jsonlRows.slice(splitIndex);

    return {
      totalSamples: jsonlRows.length,
      trainCount: trainSet.length,
      testCount: testSet.length,
      samplePreview: jsonlRows.slice(0, 2),
      jsonlContent: jsonlRows.map(r => JSON.stringify(r)).join('\n')
    };
  }
}
