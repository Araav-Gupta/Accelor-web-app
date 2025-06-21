import React, { createContext, useState, useEffect } from 'react';
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
    }
    catch (err) {
      Alert.alert('Error', 'Failed to check authentication status');
    }
  };


  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && !isTokenExpired(token)) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        setUser(jwtDecode(token));
      } else {
        await AsyncStorage.removeItem('token');
      }
    } catch (error) {
      console.error('checkAuthStatus error:', error);
      setError(error);
      Alert.alert('Error', 'Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Posting login request')
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      console.log('Login response:', response.data);
      console.log('user:', JSON.stringify(user, null, 2))
      await AsyncStorage.setItem('token', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      console.log('Login successful:', user);
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
      await AsyncStorage.removeItem('token');
      delete api.defaults.headers.Authorization;
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to clear session');
    }
  };

  return (
    <AuthContext.Provider 
    value={{ 
      user, 
      loading, 
      error, 
      login, 
      logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
const useAuth = () => React.useContext(AuthContext);

export { AuthContext, AuthProvider, useAuth };

