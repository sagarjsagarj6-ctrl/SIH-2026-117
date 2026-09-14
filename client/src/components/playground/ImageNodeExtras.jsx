import { useEffect, useRef, useState } from 'react';
import { Radio, UploadCloud } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { ImageCaptureControl } from '../media/ImageCaptureControl';

const fieldStyle = { width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' };

export const ImageNodeExtras = ({ node, onChange }) => {
  const { token, API_URL, user } = useAuth();
  const config = node.data?.config || {};
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [networks, setNetworks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [networkId, setNetworkId] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualFiles, setManualFiles] = useState([]);
  const manualRef = useRef(null);

  const patch = (next) => onChange({ ...node, data: { ...node.data, config: { ...config, ...next } } });

  const refreshJobs = async () => {
    const data = await apiRequest(`${API_URL}/image-models`, { headers: { Authorization: `Bearer ${token}` } });
    setJobs(data.jobs || []);
    return data;
  };

  useEffect(() => {
    if (node.type !== 'train.image-model') return;
    apiRequest(`${API_URL}/image-models/networks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setNetworks(data.networks || []);
        if (data.networks?.[0]) setNetworkId(data.networks[0]._id || data.networks[0].networkId);
      })
      .catch(() => setNetworks([]));
    refreshJobs().catch(() => {});
  }, [node.type, API_URL, token]);

  if (node.type === 'input.image' || node.type === 'agent.image-model') {
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Camera or gallery</div>
        <ImageCaptureControl
          kind="query"
          uploadId={config.imageUploadId}
          fileName={config.fileName}
          onUploaded={(upload) => patch({ imageUploadId: upload._id, fileName: upload.originalName })}
          onClear={() => patch({ imageUploadId: '', fileName: '' })}
        />
        {user?.role !== 'Admin' && (
          <div style={{ marginTop: '8px', fontSize: '0.61rem', color: 'var(--text-dim)' }}>
            Img-Model runs only while you are connected to the private LAN.
          </div>
        )}
      </div>
    );
  }

  if (node.type !== 'train.image-model' || user?.role !== 'Admin') return null;

  const train = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const form = new FormData();
      form.append('jobName', config.jobName || 'Hardware Image Model');
      form.append('manualText', config.manualText || '');
      form.append('imageUploadId', config.imageUploadId || '');
      form.append('sampleName', config.sampleName || '');
      form.append('sampleCategory', config.sampleCategory || '');
      form.append('sampleMetal', config.sampleMetal || '');
      form.append('sampleLifespan', config.sampleLifespan || '');
      const samples = (config.trainingSamples || []).map((sample) => ({
        ...sample,
        name: sample.name || config.sampleName || '',
        category: sample.category || config.sampleCategory || '',
        metalType: sample.metalType || config.sampleMetal || '',
        lifespan: sample.lifespan || config.sampleLifespan || ''
      }));
      if (!samples.length && config.imageUploadId) {
        samples.push({
          uploadId: config.imageUploadId,
          name: config.sampleName || '',
          category: config.sampleCategory || '',
          metalType: config.sampleMetal || '',
          lifespan: config.sampleLifespan || ''
        });
      }
      form.append('samples', JSON.stringify(samples));
      manualFiles.forEach((file) => form.append('manuals', file));
      const data = await apiRequest(`${API_URL}/image-models/train`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      }, 60000);
      patch({ lastJobId: data.job._id });
      const stages = (data.job.stages || []).map((stage) => stage.id).join(' → ') || 'prepare → index → validate → complete';
      setStatus(`Catalog training complete: ${stages}. Deploy ${data.job.jobName} on the active LAN.`);
      await refreshJobs();
      setManualFiles([]);
      if (manualRef.current) manualRef.current.value = '';
    } catch (trainError) {
      setError(trainError.message);
    } finally {
      setBusy(false);
    }
  };

  const deploy = async (jobId) => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const selected = networks.find((network) => (network._id || network.networkId) === networkId) || networks[0];
      const data = await apiRequest(`${API_URL}/image-models/${jobId}/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkId: selected?._id || selected?.networkId, networkKey: selected?.networkKey })
      });
      setStatus(`Deployed. ${data.notificationCount || 0} Manager/Employee notification(s) sent: New image model — explore.`);
      await refreshJobs();
    } catch (deployError) {
      setError(deployError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
          Hardware manuals (PDF, DOCX, TXT)
          <input
            ref={manualRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(event) => setManualFiles(Array.from(event.target.files || []))}
            style={{ ...fieldStyle, padding: '6px' }}
          />
        </label>
        {manualFiles.length > 0 && <div style={{ fontSize: '0.61rem', color: 'var(--accent-cyan)' }}>{manualFiles.length} manual(s) selected for catalog indexing.</div>}
        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Training image (camera / gallery)</div>
        <ImageCaptureControl
          kind="training"
          multiple
          uploadId={config.trainingSamples?.length ? `${config.trainingSamples.length}` : config.imageUploadId}
          fileName={config.trainingSamples?.length ? `${config.trainingSamples.length} labeled image(s)` : config.fileName}
          onUploaded={(uploads) => {
            const list = Array.isArray(uploads) ? uploads : [uploads];
            patch({
              imageUploadId: list[0]?._id || '',
              fileName: list.length > 1 ? `${list.length} images` : list[0]?.originalName || '',
              trainingSamples: list.map((upload) => ({
                uploadId: upload._id,
                fileName: upload.originalName,
                name: config.sampleName || '',
                category: config.sampleCategory || '',
                metalType: config.sampleMetal || '',
                lifespan: config.sampleLifespan || ''
              }))
            });
          }}
          onClear={() => patch({ imageUploadId: '', fileName: '', trainingSamples: [] })}
        />
        <div style={{ marginTop: '5px', fontSize: '0.59rem', color: 'var(--text-dim)' }}>The label fields on this node apply to each attached training image.</div>
      </div>
      <button type="button" className="btn-primary" disabled={busy} onClick={train} style={{ width: '100%', fontSize: '0.68rem', padding: '8px' }}>
        <UploadCloud size={14} /> {busy ? 'Working...' : 'Train image model'}
      </button>
      <label style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
        Deploy LAN
        <select value={networkId} onChange={(event) => setNetworkId(event.target.value)} style={fieldStyle}>
          {networks.length === 0 && <option value="">No active LAN — create one in LAN Setup</option>}
          {networks.map((network) => (
            <option key={network._id || network.networkId} value={network._id || network.networkId}>{network.name}</option>
          ))}
        </select>
      </label>
      {jobs.filter((job) => job.status === 'Completed').slice(0, 4).map((job) => (
        <button key={job._id} type="button" className="btn-secondary" disabled={busy || !networks.length} onClick={() => deploy(job._id)} style={{ width: '100%', fontSize: '0.64rem', padding: '7px' }}>
          <Radio size={13} /> {job.isDeployed ? 'Redeploy' : 'Deploy'} {job.jobName}
        </button>
      ))}
      {status && <div style={{ fontSize: '0.62rem', color: 'var(--accent-green)' }}>{status}</div>}
      {error && <div style={{ fontSize: '0.62rem', color: 'var(--accent-rose)' }}>{error}</div>}
    </div>
  );
};
