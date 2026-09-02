import React from 'react';
import { ThemeSelector } from './ThemeSelector';
import { 
  ShieldCheck, Cpu, Database, Network, Lock, Zap, 
  Bot, FileText, BarChart3, ChevronRight, Layers, UserCheck, 
  Terminal, ShieldAlert, Sparkles, CheckCircle2
} from 'lucide-react';

export const LandingPage = ({ onLaunchClick }) => {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', minHeight: '100vh' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(6,182,212,0.15) 0%, rgba(99,102,241,0.15) 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        padding: '10px 24px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>AIR-GAPPED COMPLIANCE</span>
        <span>100% On-Premise LAN Deployment — Zero Data Leaves Your Enterprise Perimeter</span>
      </div>

      {/* Navigation Header */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid var(--border-color)',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>SOVEREIGN<span style={{ color: 'var(--accent-cyan)' }}>.AI</span></div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ENTERPRISE WORKBENCH</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', fontSize: '0.9rem', fontWeight: 500 }}>
          <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Platform Pillars</a>
          <a href="#multi-agent" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Multi-Agent System</a>
          <a href="#security" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>RBAC & Security</a>
          <a href="#hardware" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Hardware Layer</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ThemeSelector />
          <button className="btn-secondary" onClick={onLaunchClick}>
            Enterprise Login
          </button>
          <button className="btn-primary" onClick={onLaunchClick}>
            Launch Workbench <ChevronRight size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '90px 24px 70px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div className="badge badge-indigo" style={{ marginBottom: '20px', padding: '6px 16px' }}>
          <Sparkles size={14} /> AIR-GAPPED ENTERPRISE AI PERIMETER
        </div>

        <h1 style={{
          fontSize: '3.6rem',
          lineHeight: 1.15,
          fontWeight: 800,
          marginBottom: '24px',
          maxWidth: '1000px',
          margin: '0 auto 24px'
        }}>
          Unleash Enterprise AI Intelligence on Confidential Data <br />
          <span className="gradient-text">Without Exposing a Single Byte to Cloud</span>
        </h1>

        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-muted)',
          maxWidth: '820px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          A local, role-aware <strong>Multi-Agent AI Platform</strong> powered by hardware-aware model orchestration, 
          department-level vector isolation, automated data science, vision OCR, and strict audit compliance for private LAN/MAN deployment.
        </p>

        <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginBottom: '60px' }}>
          <button className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }} onClick={onLaunchClick}>
            Enter Sovereign Workbench <ChevronRight size={20} />
          </button>
          <button className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }} onClick={onLaunchClick}>
            View Demo Credentials
          </button>
        </div>

        {/* Feature Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          maxWidth: '1100px',
          margin: '0 auto'
        }}>
          {[
            { icon: <Lock color="var(--accent-cyan)" />, title: "Zero Cloud Data Leakage", desc: "Local models run strictly on internal GPUs/CPUs." },
            { icon: <UserCheck color="var(--accent-indigo)" />, title: "RBAC + ABAC Protection", desc: "Role & department scope limits document visibility." },
            { icon: <Cpu color="var(--accent-purple)" />, title: "Hardware AI Engine", desc: "Auto-detects VRAM & assigns Fast/Balanced/Advanced modes." },
            { icon: <Bot color="var(--accent-green)" />, title: "Multi-Agent System", desc: "Specialized RAG, Data Science, Vision, and Report Agents." }
          ].map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
              <div style={{ marginBottom: '14px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-Agent Capabilities Section */}
      <section id="multi-agent" style={{
        background: 'var(--bg-surface)',
        padding: '90px 24px',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '12px' }}>ROBUST INTELLIGENCE</span>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Specialized Multi-Agent AI Suite</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
              Routes complex organizational tasks to autonomous agents tailored for high-security enterprise workflows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="glass-card" style={{ padding: '28px', borderTop: '3px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <FileText color="var(--accent-cyan)" size={28} />
                <h3 style={{ fontSize: '1.2rem' }}>RAG Document Agent</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                Searches departmental vector stores for exact policy text, patents, technical specs, and financial ledgers with evidence citations.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                ✓ ABAC Department Partitioning & Vector Citations
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px', borderTop: '3px solid var(--accent-indigo)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <BarChart3 color="var(--accent-indigo)" size={28} />
                <h3 style={{ fontSize: '1.2rem' }}>Data Science Agent</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                Analyzes structured datasets, detects anomalies in enterprise ledgers, calculates statistics, and plots interactive visualizations.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
                ✓ Anomaly Scan & Automated Chart Generation
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px', borderTop: '3px solid var(--accent-purple)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Zap color="var(--accent-purple)" size={28} />
                <h3 style={{ fontSize: '1.2rem' }}>Vision & OCR Agent</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                Extracts text and key entities from scanned blueprints, invoices, compliance forms, and technical schematics locally.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
                ✓ Multi-modal Local Vision Transformers
              </div>
            </div>

            <div className="glass-card" style={{ padding: '28px', borderTop: '3px solid var(--accent-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Terminal color="var(--accent-green)" size={28} />
                <h3 style={{ fontSize: '1.2rem' }}>Executive Reporting Agent</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                Synthesizes cross-departmental findings into structured, evidence-backed strategy reports for executive decision-makers.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                ✓ Audit-Backed Synthesis & Formal Export
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role & Governance Architecture */}
      <section id="security" style={{ padding: '90px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span className="badge badge-amber" style={{ marginBottom: '12px' }}>GOVERNANCE ARCHITECTURE</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Tailored Roles & Department Isolation</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
            Every interaction is verified against user identity, assigned role, and organizational department.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <div className="badge badge-cyan" style={{ marginBottom: '14px' }}>EMPLOYEE WORKSPACE</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Departmental AI Portal</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Employees access only their authorized departmental vector databases and AI tools (Finance, Legal, R&D, HR).
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-cyan)" /> Filtered RAG document query sandbox</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-cyan)" /> Department prompt & template library</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-cyan)" /> Confidential file indexing sandbox</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div className="badge badge-indigo" style={{ marginBottom: '14px' }}>MANAGER DASHBOARD</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Team Analytics & Audit</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Department managers oversee team AI usage, query distributions, document access logs, and policy compliance metrics.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-indigo)" /> Real-time team latency and throughput telemetry</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-indigo)" /> Unauthorized access attempt tracking</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-indigo)" /> Department policy compliance scorecards</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div className="badge badge-rose" style={{ marginBottom: '14px' }}>ADMIN CENTER</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Model Control & Fine-Tuning</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              System administrators control local LLM activations, user RBAC permissions, hardware benchmarks, and QLoRA training workflows.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-rose)" /> Local model registry & activation toggles</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-rose)" /> LoRA / QLoRA training workflow launcher</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-rose)" /> Full enterprise-wide audit trail logs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        padding: '40px 24px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={20} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Sovereign AI Enterprise Workbench v1.0</span>
        </div>
        <p>Deployed locally under Air-Gapped Private LAN Standards. Designed for zero-trust security & compliance.</p>
      </footer>
    </div>
  );
};
