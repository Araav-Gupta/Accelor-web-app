import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, Modal, TouchableWithoutFeedback, ActivityIndicator, ScrollView, Alert

 } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

const formatDate = (dateInput) => {
    if (!dateInput) return '';

    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const EmploymentDetailsSection = ({ profile, errors, onChange, isLocked, user, employeeId }) => {
    const [showResigningDatePicker, setShowResigningDatePicker] = useState(false);
    const [showConfirmationDatePicker, setShowConfirmationDatePicker] = useState(false);
    const [showManagerPicker, setShowManagerPicker] = useState(false);
    const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
    const [showEmployeeTypePicker, setShowEmployeeTypePicker] = useState(false);
    const [isEmergencyLeaveAllowed, setIsEmergencyLeaveAllowed] = useState(profile.isEmergencyLeaveAllowed || false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingPermission, setIsFetchingPermission] = useState(false);

    const managerOptions = [
        { label: 'Select Manager', value: '' },
        ...(profile.managers?.map(m => ({
            label: m.name,
            value: m.name,
        })) || []),
    ];

    const selectedManager = managerOptions.find(opt => opt.value === (typeof profile.reportingManager === 'object' ? profile.reportingManager?.name : profile.reportingManager)) || managerOptions[0];

    const departmentOptions = [
        { label: 'Select Department', value: '' },
        ...(profile.departments?.map(d => ({
            label: d.name,
            value: d.name,
        })) || []),
    ];

    const selectedDepartment = departmentOptions.find(opt => opt.value === (typeof profile.department === 'object' ? profile.department?.name : profile.department)) || departmentOptions[0];

    const employeeTypeOptions = [
        { label: 'Select Type', value: '' },
        { label: 'Permanent', value: 'Permanent' },
        { label: 'Probation', value: 'Probation' },
        { label: 'Contract', value: 'Contract' },
    ];

    const selectedEmployeeType = employeeTypeOptions.find(opt => opt.value === profile.employeeType) || employeeTypeOptions[0];

    // Fetch emergency leave permission when component mounts for HOD
  useEffect(() => {
    if (user?.loginType === 'HOD' && employeeId) {
      const fetchEmergencyLeavePermission = async () => {
        setIsFetchingPermission(true);
        try {
          const response = await api.get(`/employees/${employeeId}/emergency-leave-permission-existing`);
          const { canApplyEmergencyLeave } = response.data;
          console.log('Fetched emergency leave permission:', canApplyEmergencyLeave);
          setIsEmergencyLeaveAllowed(canApplyEmergencyLeave || false);
        } catch (error) {
          console.error('Error fetching emergency leave permission:', error);
          Alert.alert('Error', 'Failed to fetch emergency leave permission');
          setIsEmergencyLeaveAllowed(false); // Fallback to false on error
        } finally {
          setIsFetchingPermission(false);
        }
      };

      fetchEmergencyLeavePermission();
    }
  }, [user?.loginType, employeeId]);

    const handleEmergencyLeaveToggle = async (value) => {
      if (!employeeId) {
        Alert.alert('Error', 'Employee ID is required');
        return;
      }
      try {
        setIsLoading(true);
        await api.patch(`/employees/${employeeId}/emergency-leave-permission`, {
          emergencyLeaveAllowed: value
        });
        console.log('Emergency leave permission updated successfully to', value);
        setIsEmergencyLeaveAllowed(value);
        Alert.alert('Success', `Emergency leave permission ${value ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Error updating emergency leave permission:', error);
        Alert.alert('Error', 'Failed to update emergency leave permission');
        setIsEmergencyLeaveAllowed(!value); // Revert on error
      } finally {
        setIsLoading(false);
      }
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
        >
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Employment Details</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Designation</Text>
                    <TextInput
                        style={[styles.input, errors.designation && styles.inputError]}
                        value={profile.designation || ''}
                        onChangeText={(text) => onChange('designation', text)}
                        placeholder="Enter designation"
                        editable={!isLocked}
                    />
                    {errors.designation && <Text style={styles.errorText}>{errors.designation}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                        style={[styles.input, errors.location && styles.inputError]}
                        value={profile.location || ''}
                        onChangeText={(text) => onChange('location', text)}
                        placeholder="Enter location"
                        editable={!isLocked}
                    />
                    {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Reporting Manager</Text>
                    <TouchableOpacity
                        style={[styles.dropdownContainer, errors.reportingManager && styles.inputError]}
                        onPress={() => !isLocked && setShowManagerPicker(true)}
                        disabled={isLocked}
                    >
                        <Text style={styles.dropdownText}>{selectedManager.label}</Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                    </TouchableOpacity>
                    {errors.reportingManager && <Text style={styles.errorText}>{errors.reportingManager}</Text>}

                    <Modal
                        visible={showManagerPicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowManagerPicker(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowManagerPicker(false)}>
                            <View style={styles.modalOverlay} />
                        </TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            {managerOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.option}
                                    onPress={() => {
                                        onChange('reportingManager', option.value);
                                        setShowManagerPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        option.value === (typeof profile.reportingManager === 'object' ? profile.reportingManager?.name : profile.reportingManager) && styles.selectedOption
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {option.value === (typeof profile.reportingManager === 'object' ? profile.reportingManager?.name : profile.reportingManager) && (
                                        <MaterialIcons name="check" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Modal>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Department</Text>
                    <TouchableOpacity
                        style={[styles.dropdownContainer, errors.department && styles.inputError]}
                        onPress={() => !isLocked && setShowDepartmentPicker(true)}
                        disabled={isLocked}
                    >
                        <Text style={styles.dropdownText}>{selectedDepartment.label}</Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                    </TouchableOpacity>
                    {errors.department && <Text style={styles.errorText}>{errors.department}</Text>}

                    <Modal
                        visible={showDepartmentPicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowDepartmentPicker(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowDepartmentPicker(false)}>
                            <View style={styles.modalOverlay} />
                        </TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            {departmentOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.option}
                                    onPress={() => {
                                        onChange('department', option.value);
                                        setShowDepartmentPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        option.value === (typeof profile.department === 'object' ? profile.department?.name : profile.department) && styles.selectedOption
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {option.value === (typeof profile.department === 'object' ? profile.department?.name : profile.department) && (
                                        <MaterialIcons name="check" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Modal>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>PF Number</Text>
                    <TextInput
                        style={[styles.input, errors.pfNumber && styles.inputError]}
                        value={profile.pfNumber || ''}
                        onChangeText={(text) => onChange('pfNumber', text)}
                        placeholder="Enter PF number"
                        editable={!isLocked}
                    />
                    {errors.pfNumber && <Text style={styles.errorText}>{errors.pfNumber}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Employee Type</Text>
                    <TouchableOpacity
                        style={[styles.dropdownContainer, errors.employeeType && styles.inputError]}
                        onPress={() => !isLocked && setShowEmployeeTypePicker(true)}
                        disabled={isLocked}
                    >
                        <Text style={styles.dropdownText}>{selectedEmployeeType.label}</Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                    </TouchableOpacity>
                    {errors.employeeType && <Text style={styles.errorText}>{errors.employeeType}</Text>}

                    <Modal
                        visible={showEmployeeTypePicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowEmployeeTypePicker(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowEmployeeTypePicker(false)}>
                            <View style={styles.modalOverlay} />
                        </TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            {employeeTypeOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.option}
                                    onPress={() => {
                                        onChange('employeeType', option.value);
                                        setShowEmployeeTypePicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        option.value === profile.employeeType && styles.selectedOption
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {option.value === profile.employeeType && (
                                        <MaterialIcons name="check" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Modal>
                </View>

                {profile.employeeType === 'Probation' && (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Probation Period</Text>
                            <TextInput
                                style={[styles.input, errors.probationPeriod && styles.inputError]}
                                value={profile.probationPeriod || ''}
                                onChangeText={(text) => onChange('probationPeriod', text)}
                                placeholder="Enter probation period"
                                editable={!isLocked}
                            />
                            {errors.probationPeriod && <Text style={styles.errorText}>{errors.probationPeriod}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmation Date</Text>
                            <TouchableOpacity
                                onPress={() => !isLocked && setShowConfirmationDatePicker(true)}
                                style={[styles.input, styles.dateInput, errors.confirmationDate && styles.inputError]}
                            >
                                <Text style={{ color: profile.confirmationDate ? '#000' : '#aaa' }}>
                                    {profile.confirmationDate ? formatDate(profile.confirmationDate) : 'Select confirmation date'}
                                </Text>
                            </TouchableOpacity>
                            {showConfirmationDatePicker && (
                                <DateTimePicker
                                    value={profile.confirmationDate ? new Date(profile.confirmationDate) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowConfirmationDatePicker(false);
                                        if (selectedDate) {
                                            onChange('confirmationDate', formatDate(selectedDate));
                                        }
                                    }}
                                />
                            )}
                            {errors.confirmationDate && <Text style={styles.errorText}>{errors.confirmationDate}</Text>}
                        </View>
                    </>
                )}

                {profile.employmentStatus === 'Resigned' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Resigning</Text>
                        <TouchableOpacity
                            onPress={() => !isLocked && setShowResigningDatePicker(true)}
                            style={[styles.input, styles.dateInput, errors.dateOfResigning && styles.inputError]}
                        >
                            <Text style={{ color: profile.dateOfResigning ? '#000' : '#aaa' }}>
                                {profile.dateOfResigning ? formatDate(profile.dateOfResigning) : 'Select resigning date'}
                            </Text>
                        </TouchableOpacity>
                        {showResigningDatePicker && (
                            <DateTimePicker
                                value={profile.dateOfResigning ? new Date(profile.dateOfResigning) : new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowResigningDatePicker(false);
                                    if (selectedDate) {
                                        onChange('dateOfResigning', formatDate(selectedDate));
                                    }
                                }}
                            />
                        )}
                        {errors.dateOfResigning && <Text style={styles.errorText}>{errors.dateOfResigning}</Text>}
                    </View>
                )}

                {user?.loginType === 'HOD' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allow Emergency Leave</Text>
                        <View style={styles.switchContainer}>
                            {isFetchingPermission ? (
                                <ActivityIndicator size="small" color="#0000ff" />
                            ) : (
                                <Switch
                                    value={isEmergencyLeaveAllowed}
                                    onValueChange={handleEmergencyLeaveToggle}
                                    disabled={isLoading}
                                />
                            )}
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    section: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    dropdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 12,
        marginBottom: 5,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 16,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 10,
        padding: 10,
        maxHeight: 300,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOption: {
        color: '#007AFF',
        fontWeight: '600',
    },
    dateInput: {
        justifyContent: 'center',
        height: 50,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default EmploymentDetailsSection;