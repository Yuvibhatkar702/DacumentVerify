/**
 * Authentication Context
 * Manages user authentication state throughout the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/auth/me');
          
          if (response.data.success) {
            setUser(response.data.data.user);
            setToken(storedToken);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        } catch (err) {
          console.error('Auth init error:', err);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data;
        
        // Store token
        localStorage.setItem('token', authToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        
        setUser(userData);
        setToken(authToken);
        
        return { success: true };
      }
      
      return { success: false, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      return { success: false, message };
    }
  };

  // Register function
  const register = async (name, email, password, confirmPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword
      });
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data;
        
        // Store token
        localStorage.setItem('token', authToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        
        setUser(userData);
        setToken(authToken);
        
        return { success: true };
      }
      
      return { success: false, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/update', updates);
      
      if (response.data.success) {
        setUser(response.data.data.user);
        return { success: true };
      }
      
      return { success: false, message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      return { success: false, message };
    }
  };

  // Clear error
  const clearError = () => setError(null);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
