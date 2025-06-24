import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: () => Promise.reject(new Error('Login not implemented')),
  logout: () => Promise.reject(new Error('Logout not implemented')),
  refreshAuth: () => Promise.reject(new Error('Refresh not implemented'))
});

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch (err) {
      console.error('Token validation error:', err.message);
      return true;
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      await AsyncStorage.multiSet([
        ['userDepartment', userData.department?.name || ''],
        ['userDesignation', userData.designation || ''],
        ['userLoginType', userData.loginType || '']
      ]);
      setUser(userData);
      setError(null);
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        await logout();
      }
      setError(error.message || 'Failed to fetch user data');
      return null;
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && !isTokenExpired(token)) {
        await fetchUserData();
      } else if (token) {
        await logout();
      }
    } catch (error) {
      console.error('checkAuthStatus error:', error);
      setError(error.message || 'Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', response.status);
      
      if (!response.data.token) {
        throw new Error('No token received from server');
      }
      
      const { token } = response.data;
      await AsyncStorage.setItem('token', token);
      console.log('Token stored, fetching user data...');
      
      const user = await fetchUserData();
      if (!user) throw new Error('Failed to fetch user data');
      
      console.log('Login successful for user:', user.email);
      setError(null); // Clear any previous errors on successful login
      return user;
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      // Clear the token on login failure
      await AsyncStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      
      // Get error message or use a default one
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Login failed. Please check your credentials and try again.';
      
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      
      // Create a new error with a clean message
      const loginError = new Error(errorMessage);
      loginError.isAuthError = true;
      throw loginError;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'token',
        'userDepartment',
        'userDesignation',
        'userLoginType'
      ]);
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to clear session');
    }
  };

  const refreshAuth = async () => {
    setError(null);
    setLoading(true);
    await checkAuthStatus();
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      logout,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

export { AuthContext, AuthProvider, useAuth };