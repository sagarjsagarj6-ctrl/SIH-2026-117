import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  {
    id: 'sovereign-cyber',
    name: 'Sovereign Cyber',
    tagline: 'Obsidian & Cyber Cyan',
    uiFont: 'Plus Jakarta Sans',
    codeFont: 'JetBrains Mono',
    primaryColor: '#06b6d4',
    bgColor: '#07090e',
    cardColor: '#151b2c',
    badgeColor: '#6366f1'
  },
  {
    id: 'corporate-slate',
    name: 'Corporate Slate',
    tagline: 'Navy & Sapphire Slate',
    uiFont: 'Outfit',
    codeFont: 'Fira Code',
    primaryColor: '#38bdf8',
    bgColor: '#0f172a',
    cardColor: '#1e293b',
    badgeColor: '#10b981'
  },
  {
    id: 'quantum-matrix',
    name: 'Quantum Matrix',
    tagline: 'Tactical Emerald & Amber',
    uiFont: 'Space Grotesk',
    codeFont: 'Space Mono',
    primaryColor: '#10b981',
    bgColor: '#051813',
    cardColor: '#0a2920',
    badgeColor: '#f59e0b'
  }
];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sovereign_theme') || 'sovereign-cyber';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sovereign_theme', theme);
  }, [theme]);

  const activeThemeObj = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, activeThemeObj }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
