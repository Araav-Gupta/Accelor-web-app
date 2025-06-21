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
  duration: 'full',
  fullDay: { from: '', to: '' },
  halfDay: { date: '', session: 'forenoon' },
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
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.key]: action.value };
    case 'UPDATE_FULL_DAY':
      return {
        ...state,
        fullDay: { ...state.fullDay, ...action.payload },
        halfDay: state.duration === 'full' ? { date: '', session: 'forenoon' } : state.halfDay,
      };
    case 'UPDATE_HALF_DAY':
      return {
        ...state,
        halfDay: { ...state.halfDay, ...action.payload },
        fullDay: state.duration === 'half' ? { from: '', to: '' } : state.fullDay,
      };
    case 'RESET':
      return { ...initialState, designation: action.payload };
    default:
      return state;
  }
};

const LeaveForm = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [form, dispatch] = useReducer(leaveReducer, { ...initialState, designation: user?.role || '' });
  const [leaveTypeVisible, setLeaveTypeVisible] = useState(false);
  const [, forceUpdate] = useState({});
  const [restrictedHolidayVisible, setRestrictedHolidayVisible] = useState(false);
  const [sessionVisible, setSessionVisible] = useState(false);
  const [compensatoryVisible, setCompensatoryVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compensatoryBalance, setCompensatoryBalance] = useState(0);
  const [compensatoryEntries, setCompensatoryEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canApplyEmergencyLeave, setCanApplyEmergencyLeave] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState({ fromDate: false, toDate: false, date: false });
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const handleEmployeeSelect = (employee) => {
    console.log('Selected employee:', employee);
    setEmployeeSearch('');
    setShowEmployeeDropdown(false);
    const employeeId = employee?._id || employee?.id || '';
    console.log('Storing employee ID:', employeeId);
    dispatch({ type: 'UPDATE_FIELD', key: 'chargeTo', value: employeeId });
  };

  const fetchLeaveRecords = useCallback(async () => {
    console.log('fetchLeaveRecords called');
    try {
      const response = await api.get('/leaves', {
        params: { limit: 10, page: 1, sort: 'createdAt:-1', mine: true },
      });
      console.log('Leave records response:', response.data);
      const records = Array.isArray(response.data.leaves) ? response.data.leaves : [];
      console.log('Setting leave records:', JSON.stringify(records.length, null, 2));
      setLeaveRecords(records);
      return records;
    } catch (error) {
      console.error('Error fetching leave records:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch leave records');
      setLeaveRecords([]);
      throw error;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchEmployeeData = useCallback(async () => {
    console.log('fetchEmployeeData called');
    try {
      const res = await api.get('/dashboard/employee-info');
      console.log('Employee data response:', res.data);

      const { compensatoryLeaves = 0, compensatoryAvailable = [], canApplyEmergencyLeave = false } = res.data;

      console.log('Setting employee data:', {
        compensatoryLeaves,
        compensatoryAvailableCount: compensatoryAvailable.length,
        canApplyEmergencyLeave
      });

      setCompensatoryBalance(compensatoryLeaves);
      setCompensatoryEntries(compensatoryAvailable);
      setCanApplyEmergencyLeave(canApplyEmergencyLeave);
      console.log('Emergency permission:', canApplyEmergencyLeave);
      console.log('Date:', res.data);
      return res.data;
    } catch (err) {
      console.error('Error fetching employee data:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      if (err.response?.status === 401) {
        const errorMsg = 'Your session has expired. Please log in again.';
        console.log(errorMsg);
        Alert.alert('Session Expired', errorMsg, [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to fetch employee data';
        console.error(errorMsg);
        Alert.alert('Error', errorMsg);
      }

      throw err;
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    console.log('handleRefresh called');
    setRefreshing(true);
    setIsLoading(true);

    try {
      console.log('Refreshing data...');
      await Promise.all([
        fetchEmployeeData(),
        fetchLeaveRecords()
      ]);
      console.log('Refresh completed successfully');
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      console.log('Refreshing done, updating UI state');
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchEmployeeData, fetchLeaveRecords]);

  useEffect(() => {
    console.log('useEffect triggered', { user, hasUser: !!user });
    let isMounted = true;
    console.log('User object:', user);
    console.log('user role', user.role);
    const loadData = async () => {
      console.log('loadData called', { user });

      if (user === null) {
        console.log('User is null, redirecting to login');
        navigation.navigate('Login');
        return;
      }

      const userId = user?._id || user?.id;
      console.log('Using user ID:', userId);

      if (!userId) {
        console.log('User ID not available yet, waiting...');
        return;
      }

      console.log('Starting data fetch...');
      setIsLoading(true);
      try {
        const results = await Promise.all([
          fetchEmployeeData().catch(e => {
            console.error('Error in fetchEmployeeData:', e);
            return null;
          }),
          fetchLeaveRecords().catch(e => {
            console.error('Error in fetchLeaveRecords:', e);
            return null;
          })
        ]);
        console.log('Data fetch completed', { results });
      } catch (error) {
        console.error('Error in Promise.all:', error);
      } finally {
        console.log('Setting loading to false');
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      console.log('Cleaning up...');
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
        if (form.duration === 'full' && form.fullDay.from && form.fullDay.to) {
          params.append('startDate', form.fullDay.from);
          params.append('endDate', form.fullDay.to);
        } else if (form.duration === 'half' && form.halfDay.date) {
          params.append('startDate', form.halfDay.date);
          params.append('endDate', form.halfDay.date);
        } else {
          setEmployees([]);
          return;
        }

        console.log('Fetching department employees with params:', params.toString());
        const res = await api.get(`/employees/department?${params.toString()}`);
        console.log('Department employees response:', res.data);

        const filteredEmployees = Array.isArray(res.data)
          ? res.data.filter(emp => (emp._id || emp.id) !== userId)
          : [];

        console.log('Filtered employees:', filteredEmployees);
        setEmployees(filteredEmployees);

        if (form.chargeTo && !filteredEmployees.some(emp => (emp._id || emp.id) === form.chargeTo)) {
          console.log('Resetting chargeTo as selected employee is no longer available');
          dispatch({ type: 'UPDATE_FIELD', key: 'chargeTo', value: '' });
          Alert.alert('Info', 'Selected employee is no longer available for the chosen dates.');
        }
      } catch (err) {
        console.error('Error fetching department employees:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setEmployeeError('Failed to load employees. Please try again.');
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchDepartmentEmployees();
  }, [form.duration, form.fullDay.from, form.fullDay.to, form.halfDay.date, form.chargeTo, user]);

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
      console.error('Error picking document:', err);
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
    console.log('handleChange called with:', { key, value });
    if (key === 'leaveType') {
      dispatch({ type: 'UPDATE_FIELD', key, value });
    } else if (key.includes('fullDay.')) {
      const field = key.split('.')[1];
      dispatch({ type: 'UPDATE_FULL_DAY', payload: { [field]: value } });
    } else if (key.includes('halfDay.')) {
      const field = key.split('.')[1];
      dispatch({ type: 'UPDATE_HALF_DAY', payload: { [field]: value } });
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
    if (field === 'fromDate' || field === 'toDate') {
      const fieldName = field === 'fromDate' ? 'from' : 'to';
      dispatch({ type: 'UPDATE_FULL_DAY', payload: { [fieldName]: formattedDate } });
      if (field === 'fromDate' && (!form.fullDay.to || new Date(form.fullDay.to) < new Date(formattedDate))) {
        dispatch({ type: 'UPDATE_FULL_DAY', payload: { to: formattedDate } });
      }
    } else if (field === 'date') {
      dispatch({ type: 'UPDATE_HALF_DAY', payload: { date: formattedDate } });
    }
  };

  const showDatepicker = (field) => {
    setShowDatePicker(prev => ({ ...prev, [field]: true }));
  };

  const calculateLeaveDays = useCallback(() => {
    if (form.duration === 'half' && form.halfDay.date) return 0.5;
    if (form.duration === 'full' && form.fullDay.from && form.fullDay.to) {
      const from = new Date(form.fullDay.from);
      const to = new Date(form.fullDay.to);
      return to >= from ? (to - from) / (1000 * 60 * 60 * 24) + 1 : 0;
    }
    return 0;
  }, [form.duration, form.fullDay.from, form.fullDay.to, form.halfDay.date]);

  const formatDateForBackend = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form state before submission:', {
      leaveType: form.leaveType,
      chargeTo: form.chargeTo,
      reason: form.reason,
      duration: form.duration,
      fullDay: form.fullDay,
      halfDay: form.halfDay
    });

    dispatch({ type: 'UPDATE_FIELD', key: 'submitCount', value: form.submitCount + 1 });
    if (!form.chargeTo) {
      Alert.alert('Error', 'Please select an employee to charge');
      return;
    }
    const leaveDays = calculateLeaveDays();
    console.log('Validating with:', {
      form: {
        ...form,
        emergencyContact: form.emergencyContact,
        duration: form.duration,
        leaveType: form.leaveType,
        reason: form.reason,
        chargeTo: form.chargeTo
      },
      leaveDays,
      hasEmergencyContact: !!form.emergencyContact,
      hasDuration: !!form.duration,
      hasLeaveType: !!form.leaveType,
      hasReason: !!form.reason,
      hasChargeTo: !!form.chargeTo
    });

    const validationError = validateLeaveForm(
      form,
      user,
      leaveDays,
      compensatoryEntries,
      canApplyEmergencyLeave
    );

    console.log('Validation error:', validationError);
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }
    setSubmitting(true);
    try {
      const leaveData = new FormData();
      const fromDate = form.duration === 'full' ? formatDateForBackend(form.fullDay.from) : formatDateForBackend(form.halfDay.date);
      const toDate = form.duration === 'full' ? formatDateForBackend(form.fullDay.to) : formatDateForBackend(form.halfDay.date);
      leaveData.append('leaveType', form.leaveType);
      leaveData.append('duration', form.duration);
      if (form.duration === 'half') {
        leaveData.append('halfDay[date]', fromDate);
        leaveData.append('session', form.halfDay.session);
      } else {
        leaveData.append('fullDay[from]', fromDate);
        leaveData.append('fullDay[to]', toDate);
      }
      leaveData.append('reason', form.reason);
      leaveData.append('chargeGivenTo', form.chargeTo);
      leaveData.append('emergencyContact', form.emergencyContact);
      if (form.leaveType === 'Compensatory') {
        leaveData.append('compensatoryEntryId', form.compensatoryEntry);
      }
      if (form.leaveType === 'Restricted Holidays') {
        leaveData.append('restrictedHoliday', form.restrictedHoliday);
      }
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
      await api.post('/leaves', leaveData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Leave submitted successfully');
      await fetchLeaveRecords();
      dispatch({ type: 'RESET', payload: user?.Designation || '' });
      const res = await api.get('/dashboard/employee-info');
      setCompensatoryBalance(res.data.compensatoryLeaves || 0);
      setCompensatoryEntries(res.data.compensatoryAvailable || []);
    } catch (err) {
      console.error('Leave submit error:', err.response?.data || err.message);
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
              <View>
                <LeaveTypeSelector
                  leaveType={form.leaveType}
                  setLeaveType={(value) => {
                    console.log('Setting leave type to:', value);
                    let leaveTypeValue = '';
                    if (typeof value === 'string') {
                      leaveTypeValue = value;
                    } else if (value && typeof value === 'object') {
                      leaveTypeValue = value.name || JSON.stringify(value);
                    }
                    console.log('Storing leave type as:', leaveTypeValue);
                    dispatch({ type: 'UPDATE_FIELD', key: 'leaveType', value: leaveTypeValue });
                  }}
                  canApplyEmergencyLeave={canApplyEmergencyLeave}
                  leaveTypeVisible={leaveTypeVisible}
                  setLeaveTypeVisible={setLeaveTypeVisible}
                />
                {!form.leaveType && form.submitCount > 0 && (
                  <Text style={styles.errorText}>Leave Type is required</Text>
                )}
              </View>
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
                                ? `${new Date(compensatoryEntries.find(e => e._id === form.compensatoryEntry).date).toLocaleDateString()} - ${compensatoryEntries.find(e => e._id === form.compensatoryEntry).hours
                                } hours`
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

            <View style={styles.formGroup}>
              <Text style={styles.labelText}>Leave Duration</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={[styles.durationButton, form.duration === 'full' && styles.activeDuration]}
                  onPress={() => handleChange('duration', 'full')}
                >
                  <Text style={form.duration === 'full' ? styles.activeText : styles.inactiveText}>Full Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    form.duration === 'half' && styles.activeDuration,
                    form.leaveType === 'Medical' && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (form.leaveType !== 'Medical') {
                      handleChange('duration', 'half');
                    }
                  }}
                  disabled={form.leaveType === 'Medical'}
                >
                  <Text style={form.duration === 'half' ? styles.activeText : styles.inactiveText}>Half Day</Text>
                </TouchableOpacity>
              </View>
            </View>

            {form.duration === 'half' ? (
              <View style={styles.halfDayContainer}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.labelText}>Session</Text>
                  <Menu
                    visible={sessionVisible}
                    onDismiss={() => setSessionVisible(false)}
                    contentStyle={{ backgroundColor: '#ffffff' }}
                    style={{ marginTop: '-80' }}
                    anchor={
                      <TouchableOpacity style={[styles.dropdownButton, { flex: 1 }]} onPress={() => setSessionVisible(true)}>
                        <Text style={styles.dropdownText}>
                          {form.halfDay.session.charAt(0).toUpperCase() + form.halfDay.session.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    }
                  >
                    {SESSIONS.map((session) => (
                      <Menu.Item
                        key={session}
                        onPress={() => {
                          handleChange('halfDay.session', session);
                          setSessionVisible(false);
                        }}
                        title={session.charAt(0).toUpperCase() + session.slice(1)}
                        titleStyle={styles.titleStyle}
                      />
                    ))}
                  </Menu>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.labelText}>Date</Text>
                  <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => showDatepicker('date')}>
                    <Text style={form.halfDay.date ? styles.dropdownText : styles.dropdownDay}>
                      {form.halfDay.date || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showDatePicker.date && (
                    <View style={[styles.datePickerContainer, { marginTop: 10 }]}>
                      <DateTimePicker
                        value={form.halfDay.date ? new Date(form.halfDay.date) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => onDateChange(event, date, 'date')}
                        minimumDate={new Date()}
                      />
                      {Platform.OS === 'ios' && (
                        <Button
                          mode="contained"
                          onPress={() => setShowDatePicker(prev => ({ ...prev, date: false }))}
                          style={styles.dateButton}
                        >
                          Done
                        </Button>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.fullDayContainer}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.labelText}>From Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => showDatepicker('fromDate')}
                  >
                    <Text style={form.fullDay.from ? styles.dropdownText : styles.dropdownDay}>
                      {form.fullDay.from || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.labelText}>To Date</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: 'center', opacity: !form.fullDay.from ? 0.6 : 1 }]}
                    onPress={() => form.fullDay.from && showDatepicker('toDate')}
                    disabled={!form.fullDay.from}
                  >
                    <Text style={form.fullDay.to ? styles.dropdownText : styles.dropdownDay}>
                      {form.fullDay.to || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showDatePicker.fromDate && (
              <View style={[styles.datePickerContainer, { marginTop: 10 }]}>
                <DateTimePicker
                  value={form.fullDay.from ? new Date(form.fullDay.from) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'fromDate')}
                  minimumDate={form.leaveType === 'Medical' ? null : new Date()}
                />
                {Platform.OS === 'ios' && (
                  <Button
                    mode="contained"
                    onPress={() => setShowDatePicker(prev => ({ ...prev, fromDate: false }))}
                    style={styles.dateButton}
                  >
                    Done
                  </Button>
                )}
              </View>
            )}

            {showDatePicker.toDate && (
              <View style={[styles.datePickerContainer, { marginTop: 10 }]}>
                <DateTimePicker
                  value={form.fullDay.to ? new Date(form.fullDay.to) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'toDate')}
                  minimumDate={form.leaveType === 'Medical' ? null : new Date()}
                />
                {Platform.OS === 'ios' && (
                  <Button
                    mode="contained"
                    onPress={() => setShowDatePicker(prev => ({ ...prev, toDate: false }))}
                    style={styles.dateButton}
                  >
                    Done
                  </Button>
                )}
              </View>
            )}

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
                error={form.submitCount > 0 && !form.reason.trim()}
              />
              {form.submitCount > 0 && !form.reason.trim() && (
                <Text style={styles.errorText}>Reason is required</Text>
              )}
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
                          title={`${emp.name} (${emp.personId || 'N/A'})`}
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
                                  {emp.name} ({emp.personId || 'N/A'})
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
                placeholder="Enter contact number"
                keyboardType="phone-pad"
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

            <View style={styles.formGroup}>
              <Text style={styles.labelText}>Supporting Documents</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickDocument('supporting')}>
                <Text style={{ color: '#666', fontSize: 16 }}>
                  {form.supportingDocuments.length > 0 ? 'Add More Supporting Documents' : 'Upload Supporting Documents'}
                </Text>
              </TouchableOpacity>
              {form.supportingDocuments.length > 0 && (
                <View>
                  {form.supportingDocuments.map((doc, index) => (
                    <View key={index} style={styles.fileInfo}>
                      <Text style={styles.fileName}>{doc.name}</Text>
                      <TouchableOpacity onPress={() => removeDocument(index, 'supporting')}>
                        <Text style={{ color: '#666' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

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
  halfDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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