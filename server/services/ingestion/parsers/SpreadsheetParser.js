/**
 * SpreadsheetParser — Parses Excel (.xlsx, .xls) and CSV (.csv) spreadsheets into structured tabular text.
 */

import fs from 'fs/promises';

export class SpreadsheetParser {
  static get supportedExtensions() {
    return ['.xlsx', '.xls', '.csv'];
  }

  static async parse(filePath, originalFilename = '') {
    try {
      let xlsx;
      try {
        xlsx = (await import('xlsx')).default || await import('xlsx');
      } catch (e) {
        console.warn('xlsx import warning:', e.message);
      }

      if (xlsx && xlsx.readFile) {
        const workbook = xlsx.readFile(filePath);
        let aggregatedText = '';
        const sheetSummaries = [];

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csvContent = xlsx.utils.sheet_to_csv(sheet);
          const jsonRows = xlsx.utils.sheet_to_json(sheet);

          aggregatedText += `--- Sheet: ${sheetName} ---\n` + csvContent + '\n\n';
          sheetSummaries.push({
            sheetName,
            rowCount: jsonRows.length,
            columns: jsonRows.length > 0 ? Object.keys(jsonRows[0]) : []
          });
        });

        const wordCount = aggregatedText.trim().split(/\s+/).filter(Boolean).length;

        return {
          success: true,
          text: aggregatedText.trim(),
          metadata: {
            fileType: originalFilename.endsWith('.csv') ? 'CSV' : 'XLSX',
            sheetCount: workbook.SheetNames.length,
            sheetSummaries,
            wordCount,
            charCount: aggregatedText.length
          }
        };
      } else {
        // Fallback for CSV or raw read
        const buffer = await fs.readFile(filePath);
        const rawText = buffer.toString('utf-8');
        return {
          success: true,
          text: rawText,
          metadata: {
            fileType: 'CSV',
            wordCount: rawText.split(/\s+/).filter(Boolean).length,
            charCount: rawText.length,
            fallbackUsed: true
          }
        };
      }
    } catch (err) {
      return {
        success: false,
        text: '',
        error: `SpreadsheetParser error: ${err.message}`,
        metadata: { fileType: 'XLSX', wordCount: 0 }
      };
    }
  }
}
