import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Check, Sun, Moon, Sparkles, Type } from 'lucide-react';

export const FloatingThemeSelector = () => {
  const { theme, setTheme, themes, activeThemeObj } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (tId) => {
    if (tId === 'bright') return <Sun size={15} color="#d97706" />;
    if (tId === 'lighter') return <Sparkles size={15} color="#0d9488" />;
    return <Moon size={15} color="#06b6d4" />;
  };

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999
      }}
    >
      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: 0,
            width: '290px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '14px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35), var(--shadow-glow)',
            backdropFilter: 'blur(16px)',
            color: 'var(--text-main)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} color="var(--accent-cyan)" /> Theme & Font Mode
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>3 Styles</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {themes.map((t) => {
              const isSelected = t.id === theme;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                    border: `1.5px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getThemeIcon(t.id)}
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                        {t.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Color Preview Swatches */}
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.bgColor, border: '1px solid rgba(128,128,128,0.3)' }} />
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.cardColor, border: '1px solid rgba(128,128,128,0.3)' }} />
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.primaryColor }} />
                      </div>
                      {isSelected && <Check size={14} color="var(--accent-cyan)" />}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {t.tagline}
                  </div>

                  {/* Typography Information */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.68rem',
                      color: 'var(--text-dim)',
                      background: 'rgba(0, 0, 0, 0.08)',
                      padding: '3px 7px',
                      borderRadius: '5px',
                      width: 'fit-content',
                      marginTop: '2px'
                    }}
                  >
                    <Type size={11} color="var(--accent-indigo)" />
                    <span>{t.uiFont} + {t.codeFont}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-highlight)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), var(--shadow-cyan)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title={`Current Theme: ${activeThemeObj.name} Mode (${activeThemeObj.uiFont}). Click to switch.`}
      >
        {getThemeIcon(theme)}
      </button>
    </div>
  );
};
