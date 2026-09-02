import React from 'react';
import { useHardware } from '../context/HardwareContext';
import { useAuth } from '../context/AuthContext';
import { Cpu, HardDrive, Zap, Gauge, CheckCircle2, ShieldCheck, Activity, ChevronRight, Server } from 'lucide-react';

export const HardwareSelector = ({ onComplete }) => {
  const { hardwareSpecs, activeProfile, setActiveProfile, setIsHardwareConfirmed, loadingSpecs } = useHardware();
  const { updateAIProfile } = useAuth();

  const handleSelectMode = (profileId) => {
    setActiveProfile(profileId);
    updateAIProfile(profileId);
  };

  const handleConfirm = () => {
    setIsHardwareConfirmed(true);
    if (onComplete) onComplete();
  };

  if (loadingSpecs || !hardwareSpecs) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-main)',
        gap: '20px'
      }}>
        <div className="pulse-live" style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Cpu size={36} color="#fff" />
        </div>
        <h2>Detecting Local Enterprise Hardware & GPU Telemetry...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Querying vLLM/CUDA VRAM capacity and thermal metrics</p>
      </div>
    );
  }

  const { cpu, ram, gpu, network, recommendedProfiles } = hardwareSpecs;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-main)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '1100px', width: '100%' }}>
        {/* Step Indicator Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="badge badge-cyan" style={{ marginBottom: '12px' }}>
            <Server size={14} /> STEP 2: HARDWARE-AWARE AI MODE ALLOCATION
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Local Server Resource Telemetry & Profile Selector</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', maxWidth: '700px', margin: '8px auto 0' }}>
            The intermediate detection layer analyzed your air-gapped server specs. Choose the local AI execution profile for your current session.
          </p>
        </div>

        {/* Telemetry Bar */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--border-highlight)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>
            HARDWARE SPECIFICATION TELEMETRY:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px' }}>
                <Cpu size={24} color="var(--accent-indigo)" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CPU ARCHITECTURE</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cpu.cores} Cores ({cpu.architecture})</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>Load: {cpu.utilizationPct}%</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '10px' }}>
                <HardDrive size={24} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>SYSTEM RAM</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ram.availableGB} GB Free / {ram.totalGB} GB</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ram.type}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px' }}>
                <Zap size={24} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>GPU VRAM & CUDA</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{gpu.vramAvailableGB} GB VRAM Available</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{gpu.name} ({gpu.temperatureC}°C)</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px' }}>
                <Activity size={24} color="var(--accent-green)" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>AIR-GAP NETWORK</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{network.status}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>IP: {network.ip}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '24px', marginBottom: '36px' }}>
          {recommendedProfiles.map(p => {
            const isSelected = activeProfile === p.id;
            return (
              <div 
                key={p.id}
                onClick={() => handleSelectMode(p.id)}
                className="glass-card"
                style={{
                  padding: '28px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                  boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                  position: 'relative'
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'var(--accent-indigo)',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={14} /> ACTIVE PROFILE
                  </div>
                )}

                <div className={`badge ${p.id === 'Fast' ? 'badge-cyan' : p.id === 'Balanced' ? 'badge-indigo' : 'badge-purple'}`} style={{ marginBottom: '14px' }}>
                  {p.name}
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{p.model}</h3>
                
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <div>Speed: <strong style={{ color: 'var(--text-main)' }}>{p.tokensPerSec}</strong></div>
                  <div>Latency: <strong style={{ color: 'var(--text-main)' }}>{p.latency}</strong></div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {p.recommendedFor}
                </p>

                <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> Meets LAN Hardware Specs (Min {p.minRamRequired} GB RAM)
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <div style={{ textAlign: 'center' }}>
          <button className="btn-primary" style={{ padding: '14px 42px', fontSize: '1.05rem' }} onClick={handleConfirm}>
            Initialize Workbench with {activeProfile} Mode <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
