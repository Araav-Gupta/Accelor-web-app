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
import { validateLeaveForm } from '../services/validateForm';
import LeaveTypeSelector from '../services/leaveTypeSelector';
import LeaveRecordsTable from '../services/leaveRecordsTable';
import { SESSIONS, RESTRICTED_HOLIDAYS } from '../services/constants';
import DocumentUploader from '../Hooks/documentUploader';
import { useImagePicker } from '../Hooks/ImagePicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ImageViewing from 'react-native-image-viewing';

const initialState = {
    leaveType: '',
    dates: {
        from: '',
        to: '',
        fromDuration: 'full',
        fromSession: '',
        toDuration: 'full',
        toSession: '',
    },
    reason: '',
    chargeTo: '',
    emergencyContact: '',
    compensatoryEntry: '',
    restrictedHoliday: '',
    projectDetails: '',
    medicalCertificate: null,
    designation: '',
    submitCount: 0,
};


const LeaveForm = ({ navigation }) => {
    const { user } = useContext(AuthContext);
    const [form, setForm] = useState({ ...initialState, designation: user?.loginType || '' });
    const [leaveTypeVisible, setLeaveTypeVisible] = useState(false);
    const [restrictedHolidayVisible, setRestrictedHolidayVisible] = useState(false);
    const [sessionVisible, setSessionVisible] = useState(false);
    const [compensatoryVisible, setCompensatoryVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [compensatoryBalance, setCompensatoryBalance] = useState(0);
    const [compensatoryEntries, setCompensatoryEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [canApplyEmergencyLeave, setCanApplyEmergencyLeave] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState({ fromDate: false, toDate: false });
    const [leaveRecords, setLeaveRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [employeeError, setEmployeeError] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [fileErrors, setFileErrors] = useState({});

    // Use ImagePicker for medicalCertificate
    const { handleImagePick } = useImagePicker({
        setProfile: () => { }, // Not used here
        setFiles: (newFiles) => {
            setForm(prev => ({
                ...prev,
                medicalCertificate: newFiles.profilePicture
            }));
        },
    });

    const handleEmployeeSelect = (employee) => {
        console.log('Selected employee:', employee);
        setEmployeeSearch('');
        setShowEmployeeDropdown(false);
        const employeeId = employee?._id || employee?.id || '';
        console.log('Storing employee ID:', employeeId);
        setForm(prev => ({ ...prev, chargeTo: employeeId }));
    };

    const fetchLeaveRecords = useCallback(async () => {
        console.log('fetchLeaveRecords called');
        try {
            const response = await api.get('/leaves', {
                params: { limit: 20, page: 1, sort: 'createdAt:-1', mine: true },
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
                canApplyEmergencyLeave,
            });
            setCompensatoryBalance(compensatoryLeaves);
            setCompensatoryEntries(compensatoryAvailable);
            setCanApplyEmergencyLeave(canApplyEmergencyLeave);
            console.log('Emergency permission:', canApplyEmergencyLeave);
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
                    { text: 'OK', onPress: () => navigation.navigate('Login') },
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
            await Promise.all([fetchEmployeeData(), fetchLeaveRecords()]);
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
        let isMounted = true;
        const loadData = async () => {
            if (user === null) {
                navigation.navigate('Login');
                return;
            }
            const userId = user?._id || user?.id;
            if (!userId) {
                return;
            }
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchEmployeeData().catch(e => {
                        console.error('Error in fetchEmployeeData:', e);
                        return null;
                    }),
                    fetchLeaveRecords().catch(e => {
                        console.error('Error in fetchLeaveRecords:', e);
                        return null;
                    }),
                ]);
            } catch (error) {
                console.error('Error in Promise.all:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
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
                if (form.fullDay.from) {
                    params.append('startDate', form.fullDay.from);
                    params.append('endDate', form.fullDay.to || form.fullDay.from);
                } else {
                    setEmployees([]);
                    return;
                }

                // Add duration and session parameters
                if (form.fullDay.fromDuration) {
                    params.append('fromDuration', form.fullDay.fromDuration);

                    if (form.fullDay.fromDuration === 'half' && form.fullDay.fromSession) {
                        params.append('fromSession', form.fullDay.fromSession);
                    }
                }

                if (form.fullDay.to && form.fullDay.toDuration) {
                    params.append('toDuration', form.fullDay.toDuration);

                    if (form.fullDay.toDuration === 'half' && form.fullDay.toSession) {
                        params.append('toSession', form.fullDay.toSession);
                    }
                }
                const res = await api.get(`/employees/department?${params.toString()}`);
                // Process the response
                const filteredEmployees = Array.isArray(res.data)
                    ? res.data.filter(emp => (emp._id || emp.id) !== userId)
                    : [];

                setEmployees(filteredEmployees);

                // Update chargeTo if the selected employee is no longer available
                if (form.chargeTo && !filteredEmployees.some(emp => (emp._id || emp.id) === form.chargeTo)) {
                    setForm(prev => ({ ...prev, chargeTo: '' }));
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
    }, [form.fullDay.from, form.fullDay.to, form.fullDay.fromDuration, form.fullDay.fromSession, form.fullDay.toDuration, form.fullDay.toSession, form.chargeTo, user]);

    const handleChange = (key, value) => {
        console.log('handleChange called with:', { key, value });

        setForm(prevForm => {
            // For leaveType changes
            if (key === 'leaveType') {
                const updates = { leaveType: value };

                // If it's a Medical leave, set duration to full and update fullDay
                if (value === 'Medical') {
                    updates.fullDay = {
                        ...prevForm.fullDay,
                        fromDuration: 'full',
                        fromSession: ''
                    };
                }

                return { ...prevForm, ...updates };
            }

            // For nested fullDay changes
            if (key.includes('fullDay.')) {
                const field = key.split('.')[1];
                const updatedFullDay = { ...prevForm.fullDay, [field]: value };

                // If changing 'from' date and either there's no 'to' date or it's before the new 'from' date
                if (field === 'from' && (!prevForm.fullDay.to || new Date(prevForm.fullDay.to) < new Date(value))) {
                    updatedFullDay.to = value;
                }

                // If changing fromDuration to 'full', clear fromSession
                if (field === 'fromDuration' && value === 'full') {
                    updatedFullDay.fromSession = '';
                }

                return { ...prevForm, fullDay: updatedFullDay };
            }

            // For all other fields
            return { ...prevForm, [key]: value };
        });
    };

    const onDateChange = (event, selectedDate, field) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(prev => ({ ...prev, [field]: false }));
        }
        if (event.type === 'dismissed' || !selectedDate || isNaN(selectedDate.getTime())) {
            return;
        }
        const formattedDate = selectedDate.toISOString().split('T')[0];
        const dateField = field === 'fromDate' ? 'from' : 'to';
        setForm(prevForm => ({
            ...prevForm,
            fullDay: {
                ...prevForm.fullDay,
                [dateField]: formattedDate
            }
        }));
    };

    const showDatepicker = (field) => {
        setShowDatePicker(prev => ({ ...prev, [field]: true }));
    };


    const calculateLeaveDays = useCallback(() => {
        if (form.fullDay.from && form.fullDay.fromDuration === 'half') {
            return 0.5;
        }
        if (form.fullDay.from && form.fullDay.to) {
            const from = new Date(form.fullDay.from);
            const to = new Date(form.fullDay.to);
            let days = to >= from ? (to - from) / (1000 * 60 * 60 * 24) + 1 : 0;
            if (form.fullDay.fromDuration === 'half') days -= 0.5;
            if (form.fullDay.toDuration === 'half') days -= 0.5;
            return Math.max(0, days);
        }
        return 0;
    }, [form.fullDay]);


    const formatDateForBackend = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form state before submission:', {
            leaveType,
            chargeTo,
            reason,
            fullDay,
            medicalCertificate,
            emergencyContact,
        });

        setSubmitCount(prev => prev + 1);

        if (!chargeTo) {
            Alert.alert('Error', 'Please select an employee to charge');
            return;
        }

        if (!emergencyContact) {
            Alert.alert('Error', 'Emergency Contact is required');
            return;
        }

        const leaveDays = calculateLeaveDays();

        const validationError = validateLeaveForm(
            {
                leaveType,
                duration,
                fullDay,
                reason,
                chargeTo,
                emergencyContact,
                compensatoryEntry,
                restrictedHoliday,
                projectDetails,
                medicalCertificate,
                designation,
                dates: {
                    from: fullDay.from,
                    to: fullDay.fromDuration !== 'half' ? fullDay.to : '',
                    fromDuration: fullDay.fromDuration,
                    toDuration: fullDay.toDuration,
                    fromSession: fullDay.fromSession,
                    toSession: fullDay.toSession,
                }
            },
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

            const fullDayData = {
                from: formatDateForBackend(fullDay.from),
                fromDuration: fullDay.fromDuration,
            };

            if (fullDay.fromDuration === 'half') {
                fullDayData.fromSession = fullDay.fromSession || 'forenoon';
            }

            if (fullDay.to && fullDay.fromDuration !== 'half') {
                fullDayData.to = formatDateForBackend(fullDay.to);
                fullDayData.toDuration = fullDay.toDuration || 'full';

                if (fullDay.toDuration === 'half') {
                    fullDayData.toSession = fullDay.toSession || 'forenoon';
                }
            }

            leaveData.append('leaveType', form.leaveType);
            leaveData.append('chargeGivenTo', form.chargeGivenTo);
            leaveData.append('reason', form.reason);
            leaveData.append('emergencyContact', form.emergencyContact);

            leaveData.append('fullDay', JSON.stringify(fullDayData));

            if (leaveType === 'Compensatory' && form.compensatoryEntry) {
                leaveData.append('compensatoryEntryId', form.compensatoryEntry);
            }

            if (leaveType === 'Restricted Holidays' && form.restrictedHoliday) {
                leaveData.append('restrictedHoliday', form.restrictedHoliday);
            }

            if (form.projectDetails) {
                leaveData.append('projectDetails', form.projectDetails);
            }

            if (medicalCertificate) {
                leaveData.append('medicalCertificate', {
                    uri: medicalCertificate.uri,
                    name: medicalCertificate.name || 'medical_certificate.jpg',
                    type: medicalCertificate.type || 'image/jpeg',
                });
            }

            console.log('Submitting leave data:', {
                ...Object.fromEntries(leaveData),
                fullDay: fullDayData
            });

            const response = await api.post('/leaves', leaveData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Leave submission response:', response.data);

            Alert.alert('Success', 'Leave submitted successfully');
            await fetchLeaveRecords();
            setLeaveType('');
            setDuration('full');
            setFullDay({
                from: '',
                to: '',
                fromDuration: 'full',
                fromSession: '',
                toDuration: 'full',
                toSession: '',
            });
            setReason('');
            setChargeTo('');
            setEmergencyContact('');
            setCompensatoryEntry('');
            setRestrictedHoliday('');
            setProjectDetails('');
            setMedicalCertificate(null);
            setDesignation(user?.designation || '');
            setSubmitCount(0);
            setFileErrors({});
        } catch (err) {
            console.error('Leave submit error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            });
            const errorMessage = err.response?.data?.message || 'An error occurred while submitting the leave';
            Alert.alert('Error', errorMessage);
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

    // Add the rest of your component's JSX here
    return (
        <View style={styles.container}>
            {/* Your form JSX goes here */}
        </View>
    );
}