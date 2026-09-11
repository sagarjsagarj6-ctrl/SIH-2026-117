import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  {
    id: 'dark',
    name: 'Dark',
    tagline: 'Obsidian & Cyber Cyan',
    uiFont: 'Plus Jakarta Sans',
    codeFont: 'JetBrains Mono',
    primaryColor: '#06b6d4',
    bgColor: '#07090e',
    cardColor: '#151b2c',
    type: 'dark'
  },
  {
    id: 'bright',
    name: 'Bright',
    tagline: 'Crisp Vibrant Light',
    uiFont: 'Outfit',
    codeFont: 'Fira Code',
    primaryColor: '#0284c7',
    bgColor: '#f8fafc',
    cardColor: '#ffffff',
    type: 'light'
  },
  {
    id: 'lighter',
    name: 'Lighter',
    tagline: 'Soft Minimal Pastel',
    uiFont: 'Lexend',
    codeFont: 'Space Mono',
    primaryColor: '#0d9488',
    bgColor: '#f1f5f9',
    cardColor: '#f8fafc',
    type: 'light'
  }
];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sovereign_theme') || 'dark';
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
