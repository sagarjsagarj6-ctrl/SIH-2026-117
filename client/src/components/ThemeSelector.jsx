import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Check, Type, Sparkles } from 'lucide-react';

export const ThemeSelector = () => {
  const { theme, setTheme, themes, activeThemeObj } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '6px 12px',
          color: 'var(--text-main)',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none'
        }}
        title="Switch UI/UX Color Theme & Fonts"
      >
        <Palette size={15} color="var(--accent-cyan)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>{activeThemeObj.name}</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: activeThemeObj.primaryColor,
              display: 'inline-block'
            }}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), var(--shadow-glow)',
            zIndex: 200,
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={12} color="var(--accent-cyan)" /> Select UI/UX & Font Pair
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>3 Modes</span>
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
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Color Palette Indicator */}
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.bgColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.cardColor }} />
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.primaryColor }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                        {t.name}
                      </span>
                    </div>

                    {isSelected && <Check size={14} color="var(--accent-cyan)" />}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {t.tagline}
                  </div>

                  {/* Typography Pair Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.68rem',
                    color: 'var(--text-dim)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    width: 'fit-content'
                  }}>
                    <Type size={11} color="var(--accent-indigo)" />
                    <span>{t.uiFont} + {t.codeFont}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
