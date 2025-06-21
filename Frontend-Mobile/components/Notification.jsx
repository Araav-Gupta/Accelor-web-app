// import React, { useState } from 'react';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   StyleSheet, 
//   Modal, 
//   ScrollView,
//   TouchableWithoutFeedback 
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useNotifications } from '../context/NotificationContext';

// const NotificationBell = () => {
//   const [isVisible, setIsVisible] = useState(false);
//   const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

//   const handlePress = () => {
//     setIsVisible(true);
//     if (unreadCount > 0) {
//       markAllAsRead();
//     }
//   };

//   const handleClose = () => {
//     setIsVisible(false);
//   };

//   return (
//     <View>
//       <TouchableOpacity onPress={handlePress} style={styles.iconButton}>
//         <Ionicons name="notifications-outline" size={24} color="#000" />
//         {unreadCount > 0 && (
//           <View style={styles.badge}>
//             <Text style={styles.badgeText}>
//               {unreadCount > 9 ? '9+' : unreadCount}
//             </Text>
//           </View>
//         )}
//       </TouchableOpacity>

//       <Modal
//         visible={isVisible}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={handleClose}
//       >
//         <TouchableWithoutFeedback onPress={handleClose}>
//           <View style={styles.modalOverlay} />
//         </TouchableWithoutFeedback>
        
//         <View style={styles.modalContent}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}>Notifications</Text>
//             {unreadCount > 0 && (
//               <TouchableOpacity onPress={markAllAsRead}>
//                 <Text style={styles.markAllText}>Mark all as read</Text>
//               </TouchableOpacity>
//             )}
//           </View>
          
//           <ScrollView style={styles.notificationsList}>
//             {notifications.length === 0 ? (
//               <Text style={styles.emptyText}>No notifications</Text>
//             ) : (
//               notifications.map((notification) => (
//                 <TouchableOpacity
//                   key={notification._id}
//                   style={[
//                     styles.notificationItem,
//                     !notification.read && styles.unreadNotification
//                   ]}
//                   onPress={() => {
//                     markAsRead(notification._id);
//                     // Handle notification press
//                   }}
//                 >
//                   <Text style={[
//                     styles.notificationTitle,
//                     !notification.read && styles.unreadTitle
//                   ]}>
//                     {notification.title}
//                   </Text>
//                   <Text style={styles.notificationMessage}>
//                     {notification.message}
//                   </Text>
//                   <Text style={styles.notificationTime}>
//                     {new Date(notification.createdAt).toLocaleTimeString()}
//                   </Text>
//                 </TouchableOpacity>
//               ))
//             )}
//           </ScrollView>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   iconButton: {
//     padding: 10,
//     position: 'relative',
//   },
//   badge: {
//     position: 'absolute',
//     top: 5,
//     right: 5,
//     backgroundColor: 'red',
//     borderRadius: 10,
//     width: 18,
//     height: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   badgeText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: 'bold',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     maxHeight: '70%',
//     padding: 16,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   markAllText: {
//     color: '#007AFF',
//     fontSize: 16,
//   },
//   notificationsList: {
//     maxHeight: '100%',
//   },
//   notificationItem: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   unreadNotification: {
//     backgroundColor: '#f8f9fa',
//   },
//   notificationTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//     marginBottom: 4,
//   },
//   unreadTitle: {
//     fontWeight: 'bold',
//   },
//   notificationMessage: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 4,
//   },
//   notificationTime: {
//     fontSize: 12,
//     color: '#999',
//   },
//   emptyText: {
//     textAlign: 'center',
//     color: '#999',
//     marginTop: 20,
//   },
// });

// export default NotificationBell;