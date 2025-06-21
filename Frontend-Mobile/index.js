import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Text, Button, BackHandler } from 'react-native';
import { AuthProvider, AuthContext } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext';
import LoginScreen from './screens/LoginScreen.jsx';
import EmployeeScreen from './screens/Employee.jsx';
import HODStack from './navigation/HODStack';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { user, loading, error, refreshAuth } = React.useContext(AuthContext);

  const handleTryAgain = () => {
    refreshAuth(); // Implement this in your AuthContext
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6b21a8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error.message}</Text>
        <Button title="Try Again" onPress={handleTryAgain} />
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
            options={{ title: 'Employee Dashboard' ,
              headerShown: false
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      
        <AppContent />

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