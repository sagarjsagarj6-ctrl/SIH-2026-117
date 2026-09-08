import React from 'react';
import { 
  GitCommit, CheckCircle2, Clock, Cpu, 
  Layers, ShieldAlert, ArrowRight, CornerDownRight 
} from 'lucide-react';

export const AgentTraceViewer = ({ trace }) => {
  if (!trace || !trace.steps || trace.steps.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCommit size={18} style={{ color: 'var(--accent-cyan)' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>
            Explainability Trace & Multi-Agent Reasoning Chain
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
            Mode: {trace.orchestrationMode}
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
            Avg Confidence: {(trace.aggregateMetrics?.averageConfidence * 100 || 95).toFixed(1)}%
          </span>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
            Total Latency: {trace.aggregateMetrics?.totalLatencyMs || 0}ms
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        {trace.steps.map((step, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              position: 'relative'
            }}
          >
            {/* Step Number Bubble */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#000',
              flexShrink: 0
            }}>
              {step.stepNumber}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  {step.agent}
                </span>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Confidence: <strong style={{ color: 'var(--accent-green)' }}>{(step.confidence * 100).toFixed(1)}%</strong></span>
                  <span>Latency: <strong style={{ color: 'var(--text-dim)' }}>{step.latencyMs}ms</strong></span>
                  <span>Tokens: <strong style={{ color: 'var(--accent-purple)' }}>{step.tokensUsed}</strong></span>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                {step.action}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {step.reasoning}
              </div>

              {step.sourcesUsed && step.sourcesUsed.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {step.sourcesUsed.map((src, sIdx) => (
                    <span
                      key={sIdx}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--accent-amber)'
                      }}
                    >
                      Source: {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
