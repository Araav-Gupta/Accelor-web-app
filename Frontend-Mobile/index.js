import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Text, Button } from 'react-native';
import { AuthProvider, AuthContext } from './src/context/AuthContext.jsx';
import { NotificationProvider } from './src/context/NotificationContext';
import LoginScreen from './src/screens/LoginScreen.jsx';
import EmployeeScreen from './src/screens/Employee.jsx';
import HODStack from './src/navigation/HODStack';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { user, loading, error, refreshAuth } = React.useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6b21a8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }



  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6b21a8',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: true }}
          />
        ) : user.loginType === 'HOD' ? (
          <Stack.Screen
            name="HOD"
            component={HODStack}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Employee"
            component={EmployeeScreen}
            options={{ title: 'Employee Dashboard', headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b21a8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default App;