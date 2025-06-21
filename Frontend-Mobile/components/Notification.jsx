import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();

  const handlePress = async () => {
    setIsVisible(true);
    await markAllAsRead(); // Mark all unread notifications as read
    await fetchNotifications(); // Refresh notifications
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <View>
      <TouchableOpacity onPress={handlePress} style={styles.iconButton}>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
          </View>

          <ScrollView style={styles.notificationsList}>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications</Text>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification._id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification
                  ]}
                  onPress={() => markAsRead(notification._id)}
                >
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read && styles.unreadTitle
                  ]}>
                    {notification.title || 'Untitled Notification'}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message || 'No message content'}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleString('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      : 'Unknown time'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  notificationsList: {
    maxHeight: '100%',
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8f9fa',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1e293b',
  },
  unreadTitle: {
    fontWeight: 20,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
    fontSize: 16,
  },
});

export default NotificationBell;