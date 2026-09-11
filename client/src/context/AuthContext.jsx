import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sovereign_token') || '');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const configuredApiUrl = import.meta.env.VITE_API_URL;
  const API_URL = (configuredApiUrl && configuredApiUrl !== '/api'
    ? configuredApiUrl
    : (import.meta.env.DEV ? '/api' : '/api')).replace(/\/$/, '');

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  async function fetchCurrentUser(jwtToken) {
    try {
      setLoading(true);
      const data = await apiRequest(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      setUser(data.user);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        logout();
      } else {
        setAuthError(err.message || 'Failed to verify local session.');
      }
    } finally {
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    setAuthError('');
    try {
      const data = await apiRequest(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('sovereign_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Connection error to backend local server.');
      return false;
    }
  };

  const register = async (userData) => {
    setAuthError('');
    try {
      const data = await apiRequest(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      localStorage.setItem('sovereign_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Connection error to backend local server.');
      return false;
    }
  };

  const updateAIProfile = async (aiProfile) => {
    if (!token) return;
    try {
      await apiRequest(`${API_URL}/auth/profile-select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ aiProfile })
      });
      setUser(prev => prev ? { ...prev, assignedAIProfile: aiProfile } : null);
    } catch (err) {
      setAuthError(err.message || 'Failed to update AI profile.');
    }
  };

  const logout = () => {
    localStorage.removeItem('sovereign_token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      authError,
      setAuthError,
      login,
      register,
      updateAIProfile,
      logout,
      API_URL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
