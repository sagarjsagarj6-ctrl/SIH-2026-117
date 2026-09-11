/**
 * DatasetPreparer — Converts departmental knowledge documents into instruction-tuning JSONL format.
 */

import fs from 'fs/promises';

export class DatasetPreparer {
  static async prepareUploadedDataset({ filePath, department = 'Finance' }) {
    const content = await fs.readFile(filePath, 'utf8');
    const extension = filePath.toLowerCase().split('.').pop();
    let rows = [];

    if (extension === 'jsonl' || extension === 'ndjson') {
      rows = content.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    } else {
      const parsed = JSON.parse(content);
      rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.rows) ? parsed.rows : [parsed]);
    }

    const normalizedRows = rows.map((row) => ({
      instruction: String(row.instruction || row.prompt || row.question || '').trim(),
      input: String(row.input || row.context || `Department: ${department}`).trim(),
      output: String(row.output || row.response || row.answer || '').trim()
    })).filter(row => row.instruction && row.output).slice(0, 50000);

    if (normalizedRows.length === 0) {
      throw new Error('Uploaded dataset must contain instruction/prompt and output/response fields.');
    }

    const splitIndex = Math.max(1, Math.floor(normalizedRows.length * 0.9));
    return {
      totalSamples: normalizedRows.length,
      trainCount: splitIndex,
      testCount: normalizedRows.length - splitIndex,
      samplePreview: normalizedRows.slice(0, 2),
      jsonlContent: normalizedRows.map(row => JSON.stringify(row)).join('\n'),
      source: 'uploaded_dataset'
    };
  }

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
