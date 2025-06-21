import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import EmployeeDashboard from '../components/EmployeeDashboard';
import Profile from '../components/Profile';
import LeaveForm from '../components/LeaveForm';
import ODForm from '../components/ODForm';
import Attendance from '../components/Attendance';
import { AuthContext } from '../context/AuthContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
// Notification functionality commented out
import NotificationBell from '../components/Notification.jsx';

const Drawer = createDrawerNavigator();

const EmployeeScreen = () => {
  // const navigation = useNavigation();
  const { logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
      // navigation.dispatch(
      //   CommonActions.reset({
      //     index: 0,
      //     routes: [{ name: 'Login' }], // or 'Login' depending on your navigator
      //   })
      // );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <View style={{ flex: 1 }}>
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
          </DrawerContentScrollView>
          <View style={styles.bottomDrawerSection}>
            <DrawerItem
              icon={({ color }) => (
                <Ionicons name="log-out-outline" size={22} color={color} />
              )}
              label="Logout"
              onPress={handleLogout}
              labelStyle={styles.logoutLabel}
              paddingBottom={10}
              paddingLeft={20}
            />
          </View>
        </View>
      )}
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#6b21a8',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerActiveTintColor: '#6b21a8',
        drawerInactiveTintColor: '#64748b',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.hamburgerButton}
          >
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen
        name="My Dashboard"
        component={EmployeeDashboard}
        options={{
          // title: 'Employee Portal',
          headerTitle: 'Employee Dashboard',
          headerStyle: { backgroundColor: '#6b21a8' },
          headerTintColor: '#fff',
          headerRight: () => <NotificationBell />,
          drawerIcon: ({ color }) => (
            <Ionicons name="speedometer" size={20} color={color} />
          )
        }}
      />
      <Drawer.Screen
        name="My Profile"
        component={Profile}
        options={{
          headerTitle: 'My Profile',
          headerStyle: { backgroundColor: '#6b21a8' },
          headerTintColor: '#fff',
          headerRight: () => <NotificationBell />,
          drawerIcon: ({ color }) => (
            <Ionicons name="person" size={20} color={color} />
          )
        }}
      />
      <Drawer.Screen
        name="Leaves"
        component={LeaveForm}
        options={{
          headerTitle: 'Leaves',
          headerStyle: { backgroundColor: '#6b21a8' },
          headerTintColor: '#fff',
          headerRight: () => <NotificationBell />,
          drawerIcon: ({ color }) => (
            <Ionicons name="calendar" size={20} color={color} />
          )
        }}
      />
      <Drawer.Screen
        name="OD"
        component={ODForm}
        options={{
          headerTitle: 'OD',
          headerStyle: { backgroundColor: '#6b21a8' },
          headerTintColor: '#fff',
          headerRight: () => <NotificationBell />,
          drawerIcon: ({ color }) => (
            <Ionicons name="document" size={20} color={color} />
          )
        }}
      />
      <Drawer.Screen
        name="Attendance"
        component={Attendance}
        options={{
          headerTitle: 'Attendance',
          headerStyle: { backgroundColor: '#6b21a8' },
          headerTintColor: '#fff',
          headerRight: () => <NotificationBell />,
          drawerIcon: ({ color }) => (
            <Ionicons name="time" size={20} color={color} />
          )
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    marginLeft: 15,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b21a8',
    marginLeft: 15,
  },
});

export default EmployeeScreen;
