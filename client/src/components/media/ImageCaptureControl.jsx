import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export const ImageCaptureControl = ({
  kind = 'query',
  uploadId = '',
  fileName = '',
  multiple = false,
  onUploaded,
  onClear
}) => {
  const { token, API_URL } = useAuth();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const uploadFiles = async (selectedFiles = []) => {
    const files = selectedFiles.filter(Boolean);
    if (!files.length) return;
    if (files.some((file) => !file.type?.startsWith('image/'))) {
      setError('Choose image files only.');
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError('Each image must be 20 MB or smaller.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const uploads = [];
      for (const file of files) {
        const form = new FormData();
        form.append('image', file);
        form.append('kind', kind);
        const data = await apiRequest(`${API_URL}/image-models/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        }, 30000);
        uploads.push(data.upload);
      }
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result || ''));
      reader.readAsDataURL(files[0]);
      onUploaded?.(multiple ? uploads : uploads[0]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => cameraRef.current?.click()} style={{ padding: '6px 8px', fontSize: '0.64rem' }}>
          <Camera size={13} /> Camera
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => galleryRef.current?.click()} style={{ padding: '6px 8px', fontSize: '0.64rem' }}>
          <ImageIcon size={13} /> Gallery
        </button>
        {(uploadId || preview) && (
          <button type="button" className="btn-secondary" onClick={() => { setPreview(''); onClear?.(); }} style={{ padding: '6px 8px', fontSize: '0.64rem', color: 'var(--accent-rose)' }}>
            <X size={13} /> Remove
          </button>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple={multiple} hidden onChange={(event) => { uploadFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(event) => { uploadFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
      {busy && <div style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)' }}>Uploading image to local store...</div>}
      {error && <div style={{ fontSize: '0.62rem', color: 'var(--accent-rose)' }}>{error}</div>}
      {(preview || fileName || uploadId) && (
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
          {fileName || 'Image attached'} {uploadId ? `· ${uploadId.slice(0, 12)}` : ''}
        </div>
      )}
      {preview && <img src={preview} alt="Selected hardware" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />}
    </div>
  );
};
