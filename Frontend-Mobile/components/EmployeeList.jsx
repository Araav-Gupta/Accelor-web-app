import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Searchbar, Button } from 'react-native-paper';
import api from '../services/api';
import { useContext } from 'react';
import {AuthContext} from '../context/AuthContext';
import {ProfileScreen} from './HODEmployeeProfile.jsx'

const EmployeeList = () => {
  const {user} = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  const fetchData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch employees for HOD's department
      const empRes = await api.get('/employees/department');
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigation.navigate('Login');
      } else {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...employees];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query)
      );
    }

    // Apply department filter
    if (user.loginType !== 'HOD' && departmentFilter && departmentFilter !== 'all') {
      result = result.filter(emp => 
        emp.department && emp.department._id && 
        emp.department._id.toString() === departmentFilter
      );
    }

    setFilteredEmployees(result);
  }, [employees, searchQuery]);

  const handleViewProfile = (employee) => {
    navigation.navigate('HODEmployeeProfile', { 
      employeeId: employee._id,
      isViewingOther: true
    });
  };

  const renderEmployeeItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.employeeName}>{item.name}</Text>
        <Text style={styles.employeeId}>ID: {item.employeeId}</Text>
        <Text style={styles.department}>
          Department: {item.department?.name || 'Not assigned'}
        </Text>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="outlined" 
          onPress={() => handleViewProfile(item)}
          style={styles.viewButton}
        >
          View Profile
        </Button>
      </Card.Actions>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search employees..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No employees found in your department</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },

  listContent: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  employeeId: {
    color: '#666',
    marginBottom: 4,
  },
  department: {
    color: '#666',
    marginBottom: 8,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewButton: {
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
    padding: 16,
  },

});

export default EmployeeList;
