import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = localStorage.getItem('token');
      const loginTime = localStorage.getItem('loginTime');
      
      if (savedToken && loginTime) {
        const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
        
        // Token expires after 24 hours
        if (hoursSinceLogin < 24) {
          setToken(savedToken);
          console.log('Auth: Token restored from localStorage');
        } else {
          console.log('Auth: Token expired, removing from localStorage');
          localStorage.removeItem('token');
          localStorage.removeItem('loginTime');
        }
      } else {
        console.log('Auth: No valid token found');
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken) => {
    console.log('Auth: Login successful, storing token');
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('loginTime', Date.now().toString());
  };

  const logout = () => {
    console.log('Auth: Logging out, clearing token');
    localStorage.removeItem('token');
    localStorage.removeItem('loginTime');
    setToken(null);
  };

  const isAuthenticated = !!token;

  // Function to get authorization header for API calls
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    token,
    login,
    logout,
    isAuthenticated,
    loading,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 