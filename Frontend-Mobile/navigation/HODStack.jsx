import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HODDashboard from '../screens/HODDashboard';
import HODEmployeeProfile from '../components/HODEmployeeProfile';

const Stack = createStackNavigator();

const HODStack = () => {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="HODMain" component={HODDashboard} />
      <Stack.Screen 
        name="hod-employeeProfile" 
        component={HODEmployeeProfile}
        options={{
          headerShown: true,
          title: 'Employee Profile',
          headerBackTitle: 'Back'
        }}
      />
    </Stack.Navigator>
  );
};

export default HODStack;
