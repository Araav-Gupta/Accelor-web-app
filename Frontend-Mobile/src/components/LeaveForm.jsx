import React, { useState, useContext, useEffect, useReducer, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  Modal,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Card, Button, Provider as PaperProvider, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { validateLeaveForm } from '../services/validateForm';
import LeaveTypeSelector from '../services/leaveTypeSelector';
import LeaveRecordsTable from '../services/leaveRecordsTable';
import { SESSIONS, RESTRICTED_HOLIDAYS } from '../services/constants';

const initialState = {
  leaveType: '',
  dates: {
    from: '',
    to: '',
    fromDuration: 'full',
    fromSession: 'afternoon',
    toDuration: 'full',
    toSession: 'forenoon',
  },
  reason: '',
  chargeTo: '',
  emergencyContact: '',
  compensatoryEntry: '',
  restrictedHoliday: '',
  projectDetails: '',
  medicalCertificate: null,
  supportingDocuments: [],
  designation: '',
  submitCount: 0,
};

const leaveReducer = (state, action) => {
  let newState;
  
  switch (action.type) {
    case 'UPDATE_FIELD':
      newState = { ...state, [action.key]: action.value };
      break;
      
    case 'UPDATE_DATES':
      const newDates = { ...state.dates, ...action.payload };
      // Ensure toSession is 'afternoon' when toDuration is 'half'
      if (action.payload.toDuration === 'half') {
        newDates.toSession = 'forenoon';
      }
      newState = { ...state, dates: newDates };
      break;
      
    case 'RESET':
      newState = { ...initialState, designation: action.payload };
      break;
      
    default:
      return state;
  }
  
  // Execute callback with new state if provided
  if (action.callback) {
    setTimeout(() => action.callback(newState), 0);
  }
  
  return newState;
};

const LeaveForm = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [form, dispatch] = useReducer(leaveReducer, { ...initialState, designation: user?.designation || '' });
  const [leaveTypeVisible, setLeaveTypeVisible] = useState(false);
  const [restrictedHolidayVisible, setRestrictedHolidayVisible] = useState(false);
  const [fromSessionVisible, setFromSessionVisible] = useState(false);
  const [toSessionVisible, setToSessionVisible] = useState(false);
  const [compensatoryVisible, setCompensatoryVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compensatoryBalance, setCompensatoryBalance] = useState(0);
  const [compensatoryEntries, setCompensatoryEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canApplyEmergencyLeave, setCanApplyEmergencyLeave] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState({ from: false, to: false });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Force re-render when form dates change


  const handleEmployeeSelect = (employee) => {
    console.log('Selectted employee:', employee);
    setEmployeeSearch(employee ? `${employee.firstName} ${employee.lastName}`.trim() : '');
    setShowEmployeeDropdown(false);
    const employeeId = employee?._id || employee?.id || '';
    console.log('Storing employee ID:', employeeId);
    dispatch({ type: 'UPDATE_FIELD', key: 'chargeTo', value: employeeId });
  };

  const fetchLeaveRecords = useCallback(async () => {
    try {
      const response = await api.get('/leaves', {
        params: { limit: 20, page: 1, sort: 'createdAt:-1', mine: true },
      });
      const records = Array.isArray(response.data.leaves) ? response.data.leaves : [];
      setLeaveRecords(records);
      return records;
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch leave records');
      setLeaveRecords([]);
      throw error;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchEmployeeData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/employee-info');
      const { compensatoryLeaves = 0, compensatoryAvailable = [], canApplyEmergencyLeave = false } = res.data;
      setCompensatoryBalance(compensatoryLeaves);
      setCompensatoryEntries(compensatoryAvailable);
      setCanApplyEmergencyLeave(canApplyEmergencyLeave);
      return res.data;
    } catch (err) {
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to fetch employee data');
      }
      throw err;
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsLoading(true);
    try {
      await Promise.all([fetchEmployeeData(), fetchLeaveRecords()]);
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchEmployeeData, fetchLeaveRecords, calculateLeaveDays]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!user) {
        navigation.navigate('Login');
        return;
      }
      setIsLoading(true);
      try {
        await Promise.all([fetchEmployeeData(), fetchLeaveRecords()]);
      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, navigation, fetchEmployeeData, fetchLeaveRecords]);

  useEffect(() => {
    const fetchDepartmentEmployees = async () => {
      const userId = user?._id || user?.id;
      if (!userId) return;
      setLoadingEmployees(true);
      setEmployeeError('');
      try {
        const params = new URLSearchParams();
        if (form.dates.from) {
          params.append('startDate', form.dates.from);
          params.append('endDate', form.dates.to || form.dates.from);
          params.append('fromDuration', form.dates.fromDuration);
          params.append('fromSession', form.dates.fromDuration === 'half' ? form.dates.fromSession : undefined);
          params.append('toDuration', form.dates.to ? form.dates.toDuration : undefined);
          params.append('toSession', form.dates.to && form.dates.toDuration === 'half' ? form.dates.toSession : undefined);
        }
        const res = await api.get(`/employees/department?${params.toString()}`);
        const apiEmployees = Array.isArray(res.data) ? res.data : [];
        const filteredEmployees = apiEmployees.filter(emp => (emp._id || emp.id) !== userId);
        setEmployees(filteredEmployees);
        if (form.chargeTo && !filteredEmployees.some(emp => (emp._id || emp.id) === form.chargeTo)) {
          dispatch({ type: 'UPDATE_FIELD', key: 'chargeTo', value: '' });
          setEmployeeSearch('');
          Alert.alert('Info', 'Selected employee is no longer available for the chosen dates.');
        }
      } catch (err) {
        setEmployeeError('Failed to load employees. Please try again.');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchDepartmentEmployees();
  }, [form.dates.from, form.dates.to, form.dates.fromDuration, form.dates.fromSession, form.dates.toDuration, form.dates.toSession, user]);

  const pickDocument = async (type = 'medical') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: type === 'supporting',
      });
      if (result.canceled) return;
      const files = result.assets || [];
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo.size > 5 * 1024 * 1024) {
          Alert.alert('Error', 'File size exceeds 5MB limit');
          return;
        }
      }
      if (type === 'medical') {
        dispatch({ type: 'UPDATE_FIELD', key: 'medicalCertificate', value: files[0] });
      } else {
        dispatch({
          type: 'UPDATE_FIELD',
          key: 'supportingDocuments',
          value: [...form.supportingDocuments, ...files],
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index, type = 'supporting') => {
    if (type === 'medical') {
      dispatch({ type: 'UPDATE_FIELD', key: 'medicalCertificate', value: null });
    } else {
      dispatch({
        type: 'UPDATE_FIELD',
        key: 'supportingDocuments',
        value: form.supportingDocuments.filter((_, i) => i !== index),
      });
    }
  };

  const handleChange = (key, value) => {
    if (key.includes('dates.')) {
      const field = key.split('.')[1];
      
      // If fromDuration is being set to 'half' or fromSession is set to 'forenoon', reset the to date fields
      if (field === 'fromSession' && value === 'forenoon' && form.dates.fromDuration === 'half') {
        const updatedDates = {
          fromSession: value,
          to: form.dates.from,  // Reset to the same as from date
          toDuration: 'half',   // Set to half day
          toSession: 'afternoon' // Set to afternoon session
        };
        
        dispatch({ 
          type: 'UPDATE_DATES', 
          payload: updatedDates
        });
      }  else {
        dispatch({ 
          type: 'UPDATE_DATES', 
          payload: { [field]: value }
        });
      }
    } else {
      dispatch({ type: 'UPDATE_FIELD', key, value });
    }
  };

  const onDateChange = (event, selectedDate, field) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(prev => ({ ...prev, [field]: false }));
    }
    if (event.type === 'dismissed' || !selectedDate || isNaN(selectedDate.getTime())) {
      return;
    }
    const formattedDate = selectedDate.toISOString().split('T')[0];
    dispatch({ type: 'UPDATE_DATES', payload: { [field]: formattedDate } });
    if (field === 'from' && (!form.dates.to || new Date(form.dates.to) < new Date(formattedDate))) {
      dispatch({ type: 'UPDATE_DATES', payload: { to: formattedDate } });
    }
  };

  const showDatepicker = (field) => {
    setShowDatePicker(prev => ({ ...prev, [field]: true }));
  };

  const calculateLeaveDays = useCallback(() => {
    if (!form.dates.from) return 0;
    
    // Single day leave
    if (!form.dates.to || form.dates.from === form.dates.to) {
      return form.dates.fromDuration === 'half' ? 0.5 : 1;
    }
    
    // Multi-day leave
    const from = new Date(form.dates.from);
    const to = new Date(form.dates.to);
    
    if (from > to) return 0; // Invalid date range
    
    const totalDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    
    // If it's a single day but with to date set, still count as single day
    if (totalDays === 1) {
      return form.dates.fromDuration === 'half' ? 0.5 : 1;
    }
    
    // For multiple days, calculate full days and handle first/last day sessions
    let leaveDays = 0;
    
    // First day
    if (form.dates.fromDuration === 'half') {
      leaveDays += 0.5;
    } else {
      leaveDays += 1;
    }
    
    // Middle days (full days)
    if (totalDays > 2) {
      leaveDays += (totalDays - 2);
    }
    
    // Last day (if different from first day)
    if (totalDays > 1) {
      if (form.dates.toDuration === 'half') {
        leaveDays += 0.5;
      } else {
        leaveDays += 1;
      }
    }
    
    return leaveDays;
  }, [form.dates.from, form.dates.to, form.dates.fromDuration, form.dates.toDuration, form.dates.fromSession, form.dates.toSession]);

  const formatDateForBackend = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      // Create a date object and handle timezone offset
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Get local date components (this handles timezone automatically)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Format as YYYY-MM-DD
      const formattedDate = `${year}-${month}-${day}`;
      
      // Debug log
      console.log('Formatted date:', { input: dateString, output: formattedDate });
      
      return formattedDate;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.leaveType) newErrors.leaveType = 'Leave Type is required';
    if (!form.reason.trim()) newErrors.reason = 'Reason is required';
    if (!form.chargeTo) newErrors.chargeTo = 'Please select an employee to charge';
    if (form.dates.fromDuration === 'full' && (!form.dates.from || !form.dates.to)) {
      newErrors.dates = 'Both From and To dates are required for full-day leave';
    }
    if (form.dates.fromDuration === 'half' && !form.dates.from) {
      newErrors.dates = 'Date is required for half-day leave';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] Form submission started');
    
    // Log current form state
    console.log('[DEBUG] Current form state:', {
      ...form,
      dates: {
        ...form.dates,
        // Add human-readable dates for debugging
        fromDate: form.dates.from ? new Date(form.dates.from).toISOString() : null,
        toDate: form.dates.to ? new Date(form.dates.to).toISOString() : null
      }
    });
    
    if (!validateForm()) {
      console.log('[DEBUG] Form validation failed');
      return;
    }
    
    setSubmitting(true);
    console.log('[DEBUG] Setting submitting to true');
    
    try {
      const leaveData = new FormData();
      
      // Format and validate dates
      // Ensure dates are in YYYY-MM-DD format without time
      const fromDate = new Date(form.dates.from);
      const toDate = form.dates.to ? new Date(form.dates.to) : fromDate;
      
      const formatDateForBackend = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
      };
      
      const fromDateStr = formatDateForBackend(fromDate);
      const toDateStr = form.dates.to ? formatDateForBackend(toDate) : fromDateStr;
      
      // Debug log the dates being sent
      console.log('[DEBUG] Formatted dates:', {
        rawFrom: form.dates.from,
        rawTo: form.dates.to,
        formattedFrom: fromDate,
        formattedTo: toDate,
        fromDuration: form.dates.fromDuration,
        toDuration: form.dates.toDuration,
        fromSession: form.dates.fromSession,
        toSession: form.dates.toSession,
        currentDate: new Date().toISOString()
      });
      
      // Basic date validation
      if (!fromDate) {
        const error = new Error('From date is required');
        console.error('[ERROR] Validation failed:', error);
        throw error;
      }
      
      // If it's a full day leave or multi-day leave, ensure toDate is valid
      if (form.dates.fromDuration === 'full' && !toDate) {
        const error = new Error('To date is required for full-day leave');
        console.error('[ERROR] Validation failed:', error);
        throw error;
      }
      
      // Prepare the fullDay object that matches backend expectations
      const fullDay = {
        from: fromDateStr,
        fromDuration: form.dates.fromDuration,
      };
      
      // Add session only for half-day leaves
      if (form.dates.fromDuration === 'half') {
        fullDay.fromSession = form.dates.fromSession || 'forenoon';
      }
      
      // Add to date and duration if it's a multi-day leave
      if (form.dates.to && form.dates.to !== form.dates.from) {
        fullDay.to = toDateStr;
        fullDay.toDuration = form.dates.toDuration || 'full';
        
        if (fullDay.toDuration === 'half') {
          fullDay.toSession = form.dates.toSession || 'forenoon';
        }
      } else if (form.dates.fromDuration === 'full') {
        // For single full day, set toDate same as fromDate
        fullDay.to = fromDateStr;
      }
      
      // Append the structured data to FormData
      leaveData.append('leaveType', form.leaveType);
      
      // Append each property of fullDay individually
      Object.entries(fullDay).forEach(([key, value]) => {
        if (value !== undefined) {
          leaveData.append(`fullDay[${key}]`, value);
        }
      });
      
      // Debug log how the FormData will be sent
      console.log('[DEBUG] FormData entries:');
      for (let [key, value] of leaveData._parts) {
        console.log(`${key}:`, value);
      }
      
      // Debug log the fullDay object
      console.log('[DEBUG] fullDay object:', JSON.stringify(fullDay, null, 2));
      console.log('[DEBUG] Raw date values:', {
        rawFrom: form.dates.from,
        rawTo: form.dates.to,
        formattedFrom: fromDateStr,
        formattedTo: toDateStr,
        fromDuration: form.dates.fromDuration,
        toDuration: form.dates.toDuration,
        fromSession: form.dates.fromSession,
        toSession: form.dates.toSession
      });
      // Add other form fields
      leaveData.append('reason', form.reason);
      leaveData.append('chargeGivenTo', form.chargeTo);
      leaveData.append('emergencyContact', form.emergencyContact);
      
      // Add compensatory leave details if applicable
      if (form.leaveType === 'Compensatory') {
        leaveData.append('compensatoryEntryId', form.compensatoryEntry);
      }
      
      // Add restricted holiday details if applicable
      if (form.leaveType === 'Restricted Holidays') {
        leaveData.append('restrictedHoliday', form.restrictedHoliday);
      }
      
      // Log the final payload (without files)
      const payload = {};
      for (let [key, value] of leaveData._parts) {
        payload[key] = value;
      }
      console.log('Final leave request payload:', JSON.stringify(payload, null, 2));
      if (form.projectDetails) {
        leaveData.append('projectDetails', form.projectDetails);
      }
      if (form.medicalCertificate) {
        const file = {
          uri: form.medicalCertificate.uri,
          name: form.medicalCertificate.name || 'medical_certificate.jpg',
          type: form.medicalCertificate.mimeType || 'image/jpeg',
        };
        leaveData.append('medicalCertificate', file);
      }
      form.supportingDocuments.forEach((doc, index) => {
        const file = {
          uri: doc.uri,
          name: doc.name || `document_${index}.${doc.mimeType?.split('/')[1] || 'pdf'}`,
          type: doc.mimeType || 'application/pdf',
        };
        leaveData.append('supportingDocuments', file);
      });
      console.log('[DEBUG] Sending leave request...');
      const response = await api.post('/leaves', leaveData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        transformRequest: (data) => {
          // Let axios handle the FormData
          console.log('[DEBUG] Transform request data:', data);
          return data;
        }
      });
      
      console.log('[DEBUG] Leave submission successful:', response.data);
      Alert.alert('Success', 'Leave submitted successfully');
      
      // Refresh data
      await fetchLeaveRecords();
      dispatch({ type: 'RESET', payload: user?.designation || '' });
      const res = await api.get('/dashboard/employee-info');
      setCompensatoryBalance(res.data.compensatoryLeaves || 0);
      setCompensatoryEntries(res.data.compensatoryAvailable || []);
      setEmployeeSearch('');
      setErrors({});
    } catch (err) {
      console.error('[ERROR] Leave submission failed:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          data: err.config?.data
        }
      });
      Alert.alert('Error', err.response?.data?.message || 'An error occurred while submitting the leave');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <PaperProvider>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} tintColor="#2563eb" />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Apply for Leave</Text>

            <View>
              <LeaveTypeSelector
                leaveType={form.leaveType}
                userDepartment={user?.department?.name}
                setLeaveType={(value) => dispatch({ type: 'UPDATE_FIELD', key: 'leaveType', value })}
                canApplyEmergencyLeave={canApplyEmergencyLeave}
                leaveTypeVisible={leaveTypeVisible}
                setLeaveTypeVisible={setLeaveTypeVisible}
                error={errors.leaveType}
              />
              {errors.leaveType && <Text style={styles.errorText}>{errors.leaveType}</Text>}
            </View>

            {form.leaveType === 'Compensatory' && (
              <View style={styles.compensatorySection}>
                <View style={styles.formGroup}>
                  <Text style={styles.labelText}>Compensatory Leave Balance</Text>
                  <Text style={styles.balanceText}>{compensatoryBalance} hours</Text>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.labelText}>Compensatory Leave Entry</Text>
                  <Menu
                    visible={compensatoryVisible}
                    onDismiss={() => setCompensatoryVisible(false)}
                    anchor={
                      <TouchableOpacity
                        style={[styles.dropdownButton, !compensatoryEntries.length && styles.disabledButton]}
                        onPress={() => compensatoryEntries.length > 0 && setCompensatoryVisible(true)}
                        disabled={!compensatoryEntries.length}
                      >
                        <Text style={form.compensatoryEntry ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder}>
                          {compensatoryEntries.length === 0
                            ? 'No available entries'
                            : form.compensatoryEntry
                              ? compensatoryEntries.find(e => e._id === form.compensatoryEntry)?.date
                                ? `${new Date(compensatoryEntries.find(e => e._id === form.compensatoryEntry).date).toLocaleDateString()} - ${compensatoryEntries.find(e => e._id === form.compensatoryEntry).hours} hours`
                                : 'Select compensatory entry'
                              : 'Select compensatory entry'}
                        </Text>
                      </TouchableOpacity>
                    }
                  >
                    {compensatoryEntries
                      .filter(entry => entry.status === 'Available')
                      .map(entry => (
                        <Menu.Item
                          key={entry._id}
                          onPress={() => {
                            handleChange('compensatoryEntry', entry._id);
                            setCompensatoryVisible(false);
                          }}
                          title={`${new Date(entry.date).toLocaleDateString()} - ${entry.hours} hours`}
                          titleStyle={styles.titleStyle}
                        />
                      ))}
                  </Menu>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.labelText}>Project Details</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.projectDetails}
                    onChangeText={(text) => handleChange('projectDetails', text)}
                    multiline
                    numberOfLines={4}
                    placeholder="Enter project details"
                  />
                </View>
              </View>
            )}

            {form.leaveType === 'Restricted Holidays' && (
              <View style={styles.formGroup}>
                <Text style={styles.labelText}>Restricted Holiday</Text>
                <Menu
                  visible={restrictedHolidayVisible}
                  onDismiss={() => setRestrictedHolidayVisible(false)}
                  contentStyle={{ backgroundColor: '#ffffff' }}
                  style={{ marginTop: -80 }}
                  anchor={
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setRestrictedHolidayVisible(true)}>
                      <Text style={form.restrictedHoliday ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {form.restrictedHoliday || 'Select Holiday'}
                      </Text>
                    </TouchableOpacity>
                  }
                >
                  {RESTRICTED_HOLIDAYS.map((holiday) => (
                    <Menu.Item
                      key={holiday}
                      onPress={() => {
                        handleChange('restrictedHoliday', holiday);
                        setRestrictedHolidayVisible(false);
                      }}
                      title={holiday}
                      titleStyle={styles.titleStyle}
                    />
                  ))}
                </Menu>
              </View>
            )}

            <View style={styles.fullDayContainer}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.labelText}>From Date</Text>
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center' }]}
                  onPress={() => showDatepicker('from')}
                >
                  <Text style={form.dates.from ? styles.dropdownText : styles.dropdownDay}>
                    {form.dates.from || 'Select date'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.durationContainer}>
                  <TouchableOpacity
                    style={[styles.durationButton, form.dates.fromDuration === 'full' && styles.activeDuration]}
                    onPress={() => handleChange('dates.fromDuration', 'full')}
                  >
                    <Text style={form.dates.fromDuration === 'full' ? styles.activeText : styles.inactiveText}>Full Day</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.durationButton, form.dates.fromDuration === 'half' && styles.activeDuration]}
                    onPress={() => handleChange('dates.fromDuration', 'half')}
                  >
                    <Text style={form.dates.fromDuration === 'half' ? styles.activeText : styles.inactiveText}>Half Day</Text>
                  </TouchableOpacity>
                </View>

                {form.dates.fromDuration === 'half' && (
                  <>
                    <Text style={[styles.labelText, { marginTop: 10 }]}>Session</Text>
                    <Menu
                      visible={fromSessionVisible}
                      onDismiss={() => setFromSessionVisible(false)}
                      contentStyle={{ backgroundColor: '#ffffff', marginTop: -40 }}
                      anchor={
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => setFromSessionVisible(true)}
                        >
                          <Text style={styles.dropdownText}>
                            {form.dates.fromSession.charAt(0).toUpperCase() + form.dates.fromSession.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      }
                    >
                      {SESSIONS.map((session) => (
                        <Menu.Item
                          key={session}
                          onPress={() => {
                            handleChange('dates.fromSession', session);
                            setFromSessionVisible(false);
                          }}
                          title={session.charAt(0).toUpperCase() + session.slice(1)}
                          titleStyle={styles.titleStyle}
                        />
                      ))}
                    </Menu>
                  </>
                )}
              </View>
                      

              {form.dates.from && (
                form.dates.fromDuration?.toLowerCase() === 'full' || 
                (form.dates.fromDuration?.toLowerCase() === 'half' && form.dates.fromSession?.toLowerCase() === 'afternoon')
              ) && (
                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.labelText}>To Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => showDatepicker('to')}
                  >
                    <Text style={form.dates.to ? styles.dropdownText : styles.dropdownDay}>
                      {form.dates.to || 'Select date'}
                    </Text>
                  </TouchableOpacity>

                  {/* <Text style={styles.labelText}>To Duration</Text> */}
                  <View style={styles.durationContainer}>
                    <TouchableOpacity
                      style={[styles.durationButton, form.dates.toDuration === 'full' && styles.activeDuration]}
                      onPress={() => handleChange('dates.toDuration', 'full')}
                    >
                      <Text style={form.dates.toDuration === 'full' ? styles.activeText : styles.inactiveText}>Full Day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.durationButton, form.dates.toDuration === 'half' && styles.activeDuration]}
                      onPress={() => handleChange('dates.toDuration', 'half')}
                    >
                      <Text style={form.dates.toDuration === 'half' ? styles.activeText : styles.inactiveText}>Half Day</Text>
                    </TouchableOpacity>
                  </View>

                  {form.dates.toDuration === 'half' && (
                    <>
                      <Text style={[styles.labelText, { marginTop: 10 }]}>Session</Text>
                      <Menu
                        visible={toSessionVisible}
                        onDismiss={() => setToSessionVisible(false)}
                        contentStyle={{ backgroundColor: '#ffffff', marginTop: -40 }}
                        anchor={
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setToSessionVisible(true)}
                          >
                            <Text style={styles.dropdownText}>
                              {form.dates.toSession.charAt(0).toUpperCase() + form.dates.toSession.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        }
                      >
                        <Menu.Item
                          key="forenoon"
                          onPress={() => {
                            handleChange('dates.toSession', 'forenoon');
                            setToSessionVisible(false);
                          }}
                          title="Forenoon"
                          titleStyle={styles.titleStyle}
                        />
                      </Menu>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* <View style={styles.formGroup}>
              <Text style={styles.labelText}>Leave Duration</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={[styles.durationButton, form.dates.fromDuration === 'full' && styles.activeDuration]}
                  onPress={() => handleChange('dates.fromDuration', 'full')}
                >
                  <Text style={form.dates.fromDuration === 'full' ? styles.activeText : styles.inactiveText}>Full Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    form.dates.fromDuration === 'half' && styles.activeDuration,
                    form.leaveType === 'Medical' && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (form.leaveType !== 'Medical') {
                      handleChange('dates.fromDuration', 'half');
                    }
                  }}
                  disabled={form.leaveType === 'Medical'}
                >
                  <Text style={form.dates.fromDuration === 'half' ? styles.activeText : styles.inactiveText}>Half Day</Text>
                </TouchableOpacity>
              </View>
            </View> */}

            {showDatePicker.from && (
              <View style={[styles.datePickerContainer, { marginTop: 10 }]}>
                <DateTimePicker
                  value={form.dates.from ? new Date(form.dates.from) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'from')}
                  minimumDate={form.leaveType === 'Medical' ? null : new Date()}
                />
                {Platform.OS === 'ios' && (
                  <Button
                    mode="contained"
                    onPress={() => setShowDatePicker(prev => ({ ...prev, from: false }))}
                    style={styles.dateButton}
                  >
                    Done
                  </Button>
                )}
              </View>
            )}

            {showDatePicker.to && (
              <View style={[styles.datePickerContainer, { marginTop: 10 }]}>
                <DateTimePicker
                  value={form.dates.to ? new Date(form.dates.to) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'to')}
                  minimumDate={form.leaveType === 'Medical' ? null : new Date(form.dates.from)}
                />
                {Platform.OS === 'ios' && (
                  <Button
                    mode="contained"
                    onPress={() => setShowDatePicker(prev => ({ ...prev, to: false }))}
                    style={styles.dateButton}
                  >
                    Done
                  </Button>
                )}
              </View>
            )}

            {errors.dates && <Text style={styles.errorText}>{errors.dates}</Text>}

            <View style={[styles.formGroup, { marginTop: 10 }]}>
              <Text style={styles.labelText}>Leave Days</Text>
              <Text style={styles.daysText}>{calculateLeaveDays()} days</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.labelText}>Reason for Leave</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.reason}
                onChangeText={(text) => handleChange('reason', text)}
                placeholder="Enter reason for leave"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.labelText}>Charge Given To *</Text>
              {loadingEmployees ? (
                <ActivityIndicator size="small" color="#666" />
              ) : employeeError ? (
                <Text style={styles.errorText}>{employeeError}</Text>
              ) : employees.length === 0 ? (
                <Text style={[styles.input, { color: '#666' }]}>
                  {form.duration ? 'No employees available for the selected dates' : 'Select dates first'}
                </Text>
              ) : Platform.OS === 'ios' ? (
                <Menu
                  visible={showEmployeeDropdown}
                  onDismiss={() => setShowEmployeeDropdown(false)}
                  contentStyle={{ backgroundColor: '#ffffff', maxHeight: 300 }}
                  style={{ marginTop: 170 }}
                  anchor={
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownButton]}
                      onPress={() => setShowEmployeeDropdown(true)}
                    >
                      <Text style={form.chargeTo ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {form.chargeTo
                          ? employees.find(e => (e._id || e.id) === form.chargeTo)?.name || 'Select an employee'
                          : 'Select an employee'}
                      </Text>
                    </TouchableOpacity>
                  }
                >
                  <ScrollView>
                    {employees.map(emp => {
                      const empId = emp._id || emp.id;
                      return (
                        <Menu.Item
                          key={empId}
                          onPress={() => {
                            console.log('Selected employee ID:', empId);
                            handleEmployeeSelect({ _id: empId, name: emp.name });
                          }}
                          title={`${emp.name} `}
                          titleStyle={styles.titleStyle}
                        />
                      );
                    })}
                  </ScrollView>
                </Menu>
              ) : (
                <View>
                  <TouchableOpacity
                    style={[styles.input, styles.dropdownButton]}
                    onPress={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  >
                    <Text style={form.chargeTo ? styles.dropdownText : { color: '#666' }}>
                      {form.chargeTo
                        ? employees.find(e => (e._id || e.id) === form.chargeTo)?.name || 'Select an employee'
                        : 'Select an employee'}
                    </Text>
                  </TouchableOpacity>
                  <Modal
                    visible={showEmployeeDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowEmployeeDropdown(false)}
                  >
                    <TouchableOpacity
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={() => setShowEmployeeDropdown(false)}
                    >
                      <View style={styles.dropdownContainer}>
                        <ScrollView style={styles.dropdownList}>
                          {employees.map(emp => {
                            const empId = emp._id || emp.id;
                            return (
                              <TouchableOpacity
                                key={empId}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  console.log('Selected employee ID:', empId);
                                  handleEmployeeSelect({ _id: empId, name: emp.name });
                                }}
                              >
                                <Text style={styles.dropdownItemText}>
                                  {emp.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>
              )}
              {!form.chargeTo && form.submitCount > 0 && (
                <Text style={styles.errorText}>Please select an employee to charge</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.labelText}>Emergency Contact</Text>
              <TextInput
                style={styles.input}
                value={form.emergencyContact}
                onChangeText={(text) => handleChange('emergencyContact', text)}
                placeholder="Enter contact Address, Number"
                keyboardType="default"
              />
            </View>

            {form.leaveType === 'Medical' && (
              <View style={styles.formGroup}>
                <Text style={styles.labelText}>Medical Certificate</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => pickDocument('medical')}>
                  <Text style={{ color: '#666', fontSize: 16 }}>
                    {form.medicalCertificate ? 'Update Medical Certificate' : 'Upload Medical Certificate'}
                  </Text>
                </TouchableOpacity>
                {form.medicalCertificate && (
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{form.medicalCertificate.name}</Text>
                    <TouchableOpacity onPress={() => removeDocument(0, 'medical')}>
                      <Text style={{ color: '#666' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Leave</Text>
              )}
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <LeaveRecordsTable
          leaveRecords={leaveRecords}
          selectedRecord={selectedRecord}
          setSelectedRecord={setSelectedRecord}
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      </ScrollView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  card: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 3,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  formGroup: {
    marginBottom: 15,
  },
  labelText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePickerContainer: {
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    borderRadius: 5,
    padding: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  dateButton: {
    marginTop: 10,
    backgroundColor: '#2563eb',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeDuration: {
    backgroundColor: '#1e88e5',
    borderColor: '#1976d2',
  },
  activeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inactiveText: {
    color: '#666',
  },
  fullDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compensatorySection: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  balanceText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  daysText: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#1e88e5',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#90caf9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 6,
    padding: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    height: 46,
    marginTop: 0,
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  dropdownText: {
    color: '#1f2937',
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
  },
  dropdownButtonText: {
    color: '#1f2937',
    fontSize: 16,
  },
  dropdownButtonPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
  },
  titleStyle: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 5,
    maxHeight: 300,
  },
  dropdownList: {
    padding: 10,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 5,
    padding: 12,
    marginTop: 6,
    alignItems: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default LeaveForm;