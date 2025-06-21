// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { EXPO_PUBLIC_API_URL } from '@env';


const NotificationContext = createContext();

 const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const unread = response.data.filter(n => !n.read).length;
      setNotifications(response.data);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };



  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return;

    const socketInstance = io(EXPO_PUBLIC_API_URL, {
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    const handleNewNotification = (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleConnect = () => {
      console.log('Socket connected');
      fetchNotifications(); // Fetch notifications only after connection is established
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };

    const handleError = (error) => {
      console.error('Socket.IO error:', error);
    };
    
    const handleConnectError = (error) => {
      console.error('Connection Error:', {
        message: error.message,
        description: error.description,
        context: error.context
      });
    };

    socketInstance.on('newNotification', handleNewNotification);
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.io.on('error', handleError);
    socketInstance.on('connect_error', handleConnectError);

    setSocket(socketInstance);

    return () => {
      socketInstance.off('newNotification', handleNewNotification);
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.io.off('error', handleError);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.disconnect();
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead,
        fetchNotifications 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export { NotificationProvider, useNotifications };