import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: () => Promise.reject(new Error('Login not implemented')),
  logout: () => Promise.reject(new Error('Logout not implemented'))
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
      console.error('Token validation error:', err);
      return true; // Treat as expired if there's an error
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
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
      throw error;
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && !isTokenExpired(token)) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        await fetchUserData();
      } else {
        await logout();
      }
    } catch (error) {
      console.error('checkAuthStatus error:', error);
      setError(error);
      Alert.alert('Error', 'Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      await AsyncStorage.setItem('token', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      
      // Fetch and set complete user data
      const user = await fetchUserData();
      return user;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      console.error('Login error:', errorMessage);
      Alert.alert('Error', errorMessage);
      throw new Error(errorMessage);
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
      delete api.defaults.headers.Authorization;
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to clear session');
    }
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
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

export { AuthContext, AuthProvider, useAuth };