import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const HardwareContext = createContext();

export const HardwareProvider = ({ children }) => {
  const { token, API_URL, user } = useAuth();
  const [hardwareSpecs, setHardwareSpecs] = useState(null);
  const [activeProfile, setActiveProfile] = useState('Balanced');
  const [isHardwareConfirmed, setIsHardwareConfirmed] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  useEffect(() => {
    if (token) {
      detectHardware();
    }
  }, [token]);

  useEffect(() => {
    if (user?.assignedAIProfile) {
      setActiveProfile(user.assignedAIProfile);
    }
  }, [user]);

  const detectHardware = async () => {
    try {
      setLoadingSpecs(true);
      const res = await fetch(`${API_URL}/hardware/detect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHardwareSpecs(data);
      }
    } catch (err) {
      console.error('Failed to detect hardware specs', err);
    } finally {
      setLoadingSpecs(false);
    }
  };

  return (
    <HardwareContext.Provider value={{
      hardwareSpecs,
      activeProfile,
      setActiveProfile,
      isHardwareConfirmed,
      setIsHardwareConfirmed,
      loadingSpecs,
      detectHardware
    }}>
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => useContext(HardwareContext);
