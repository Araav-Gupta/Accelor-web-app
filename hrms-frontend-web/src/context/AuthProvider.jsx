import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';

// AuthProvider to manage authentication state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to check token expiration
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch (err) {
      return true;
    }
  };

  // Fetch user details from /auth/me
  const fetchUserDetails = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error fetching user details:', err.response?.data || err.message);
      logout(); // Log out if fetching user details fails
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      fetchUserDetails();
    } else {
      localStorage.removeItem('token'); // Remove expired or invalid token
    }
    setLoading(false);
  }, [fetchUserDetails]);

  // Login function to authenticate the user and set token
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      // Fetch full user details after login
      await fetchUserDetails();
      return user; // Return user data so caller can redirect correctly
    } catch (err) {
      console.error('Login error:', err);
      throw new Error('Login failed, please check your credentials and try again.');
    }
  };

  // Logout function to clear user and token
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};