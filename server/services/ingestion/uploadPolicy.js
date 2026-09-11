import path from 'path';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.json', '.jsonl', '.ndjson',
  '.log', '.yaml', '.yml', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/jsonl',
  'application/x-ndjson',
  'application/x-yaml',
  'text/yaml',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/bmp',
  'image/webp',
  'application/octet-stream'
]);

export const safeUploadFilename = (filename) => {
  const base = path.basename(String(filename || 'upload'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'upload';
};

export const getUploadExtension = (filename) => path.extname(safeUploadFilename(filename)).toLowerCase();

export const isAllowedUpload = (file) => {
  const extension = getUploadExtension(file?.originalname);
  const mimeType = String(file?.mimetype || '').toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.has(extension) && ALLOWED_MIME_TYPES.has(mimeType);
};

export const uploadFileFilter = (_req, file, callback) => {
  if (!isAllowedUpload(file)) {
    const error = new Error('Unsupported file type. Upload a supported document, spreadsheet, text, JSON, YAML, or image file.');
    error.code = 'UNSUPPORTED_FILE_TYPE';
    return callback(error);
  }
  callback(null, true);
};
