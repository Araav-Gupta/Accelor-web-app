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

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await markAsRead(notification._id);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return;
    console.log('User ID:', user.id);
    console.log('expo url:', EXPO_PUBLIC_API_URL);
    const socketUrl = EXPO_PUBLIC_API_URL.replace(/^http/, 'ws');
    console.log('Connecting to WebSocket at:', socketUrl);
    
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      query: { employeeId: user.employeeId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true
    });

    const handleNewNotification = (notification) => {
      console.log('New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleConnect = () => {
      console.log('Socket connected');
      fetchNotifications();
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };

    const handleError = (error) => {
      console.error('Socket.IO error:', error);
    };

    const handleConnectError = (error) => {
      console.error('Socket.IO Connection Error:', {
        message: error.message,
        description: error.description,
        context: error.context,
        error: error // Include full error object for debugging
      });
      
      // Try to reconnect after a delay if connection fails
      if (socketInstance) {
        setTimeout(() => {
          socketInstance.connect();
        }, 5000);
      }
    };

    socketInstance.on('notification', handleNewNotification);
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.io.on('error', handleError);
    socketInstance.on('connect_error', handleConnectError);

    setSocket(socketInstance);

    return () => {
      socketInstance.off('notification', handleNewNotification);
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
        markAllAsRead,
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