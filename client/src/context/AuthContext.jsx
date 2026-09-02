import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sovereign_token') || '');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async (jwtToken) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to verify token', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed');
        return false;
      }
      localStorage.setItem('sovereign_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setAuthError('Connection error to backend local server.');
      return false;
    }
  };

  const register = async (userData) => {
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Registration failed');
        return false;
      }
      localStorage.setItem('sovereign_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setAuthError('Connection error to backend local server.');
      return false;
    }
  };

  const updateAIProfile = async (aiProfile) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/profile-select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ aiProfile })
      });
      if (res.ok) {
        setUser(prev => prev ? { ...prev, assignedAIProfile: aiProfile } : null);
      }
    } catch (err) {
      console.error('Failed to update AI profile', err);
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
