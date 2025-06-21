// components/BasicInfoSection.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const BasicInfoSection = ({ profile, errors, onChange, onImagePick, isLocked }) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);
    const [showMaritalStatusPicker, setShowMaritalStatusPicker] = useState(false);
    const [showEmploymentStatusPicker, setShowEmploymentStatusPicker] = useState(false);
    
    const genderOptions = [
        { label: 'Select Gender', value: '' },
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' },
    ];
    
    const selectedGender = genderOptions.find(opt => opt.value === profile.gender) || genderOptions[0];
    
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const selectedBloodGroup = profile.bloodGroup ? profile.bloodGroup : 'Select Blood Group';
    
    const maritalStatusOptions = [
        { label: 'Select', value: '' },
        { label: 'Single', value: 'Single' },
        { label: 'Married', value: 'Married' },
    ];
    const selectedMaritalStatus = maritalStatusOptions.find(opt => opt.value === profile.maritalStatus) || maritalStatusOptions[0];
    
    const employmentStatusOptions = [
        { label: 'Select Status', value: '' },
        { label: 'Working', value: 'Working' },
        { label: 'Resigned', value: 'Resigned' },
    ];
    const selectedEmploymentStatus = employmentStatusOptions.find(opt => opt.value === profile.employmentStatus) || employmentStatusOptions[0];

    const fields = [
        { label: 'Full Name', name: 'name', keyboardType: 'default' },
        { label: 'Email', name: 'email', keyboardType: 'email-address' },
        { label: 'Mobile Number', name: 'mobileNumber', keyboardType: 'phone-pad' },
        { label: "Father's Name", name: 'fatherName', keyboardType: 'default' },
        { label: "Mother's Name", name: 'motherName', keyboardType: 'default' },
        { label: 'Permanent Address', name: 'permanentAddress', keyboardType: 'default' },
        { label: 'Current Address', name: 'currentAddress', keyboardType: 'default' },
        { label: 'Aadhar Number', name: 'aadharNumber', keyboardType: 'numeric' },
        { label: 'Emergency Contact Name', name: 'emergencyContactName', keyboardType: 'default' },
        { label: 'Emergency Contact Number', name: 'emergencyContactNumber', keyboardType: 'phone-pad' },
        { label: 'Employee ID', name: 'employeeId', keyboardType: 'default' }, // Added
        { label: 'User ID', name: 'userId', keyboardType: 'default' }, // Added
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                scrollEnabled={true}
                bounces={true}
                showsVerticalScrollIndicator={true}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <TouchableOpacity onPress={onImagePick} disabled={isLocked} style={styles.imagePicker}>
                        {profile.profilePicture ? (
                            <MaterialIcons name="person" size={50} color="#666" />
                        ) : (
                            <MaterialIcons name="add-a-photo" size={50} color="#aaa" />
                        )}
                    </TouchableOpacity>

                    {fields.map((field) => (
                        <View key={field.name} style={styles.inputGroup}>
                            <Text style={styles.label}>{field.label}</Text>
                            <TextInput
                                style={[styles.input, errors[field.name] && styles.inputError]}
                                value={profile[field.name]}
                                onChangeText={(text) => onChange(field.name, text)}
                                keyboardType={field.keyboardType}
                                editable={!isLocked}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                            {errors[field.name] && <Text style={styles.errorText}>{errors[field.name]}</Text>}
                        </View>
                    ))}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <TouchableOpacity
                            onPress={() => !isLocked && setShowDatePicker(true)}
                            style={[styles.input, styles.dateInput, errors.dateOfBirth && styles.inputError]}
                        >
                            <Text style={{ color: profile.dateOfBirth ? '#000' : '#aaa' }}>
                                {profile.dateOfBirth || 'Select date of birth'}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        onChange('dateOfBirth', selectedDate.toISOString().split('T')[0]);
                                    }
                                }}
                            />
                        )}
                        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <TouchableOpacity 
                            style={[styles.dropdownContainer, errors.gender && styles.inputError]}
                            onPress={() => !isLocked && setShowGenderPicker(true)}
                            disabled={isLocked}
                        >
                            <Text style={styles.dropdownText}>
                                {selectedGender.label}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                        </TouchableOpacity>
                        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                        
                        <Modal
                            visible={showGenderPicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowGenderPicker(false)}
                        >
                            <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
                                <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {genderOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.option}
                                        onPress={() => {
                                            onChange('gender', option.value);
                                            setShowGenderPicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            option.value === profile.gender && styles.selectedOption
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {option.value === profile.gender && (
                                            <MaterialIcons name="check" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Modal>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Group</Text>
                        <TouchableOpacity 
                            style={[styles.dropdownContainer, errors.bloodGroup && styles.inputError]}
                            onPress={() => !isLocked && setShowBloodGroupPicker(true)}
                            disabled={isLocked}
                        >
                            <Text style={styles.dropdownText}>
                                {profile.bloodGroup || 'Select Blood Group'}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                        </TouchableOpacity>
                        {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
                        
                        <Modal
                            visible={showBloodGroupPicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowBloodGroupPicker(false)}
                        >
                            <TouchableWithoutFeedback onPress={() => setShowBloodGroupPicker(false)}>
                                <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {['', ...bloodGroups].map((bg) => (
                                    <TouchableOpacity
                                        key={bg || 'select'}
                                        style={styles.option}
                                        onPress={() => {
                                            onChange('bloodGroup', bg);
                                            setShowBloodGroupPicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            bg === profile.bloodGroup && styles.selectedOption
                                        ]}>
                                            {bg || 'Select Blood Group'}
                                        </Text>
                                        {bg === profile.bloodGroup && (
                                            <MaterialIcons name="check" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Modal>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Marital Status</Text>
                        <TouchableOpacity 
                            style={[styles.dropdownContainer, errors.maritalStatus && styles.inputError]}
                            onPress={() => !isLocked && setShowMaritalStatusPicker(true)}
                            disabled={isLocked}
                        >
                            <Text style={styles.dropdownText}>
                                {selectedMaritalStatus.label}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                        </TouchableOpacity>
                        {errors.maritalStatus && <Text style={styles.errorText}>{errors.maritalStatus}</Text>}
                        
                        <Modal
                            visible={showMaritalStatusPicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowMaritalStatusPicker(false)}
                        >
                            <TouchableWithoutFeedback onPress={() => setShowMaritalStatusPicker(false)}>
                                <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {maritalStatusOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.option}
                                        onPress={() => {
                                            onChange('maritalStatus', option.value);
                                            setShowMaritalStatusPicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            option.value === profile.maritalStatus && styles.selectedOption
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {option.value === profile.maritalStatus && (
                                            <MaterialIcons name="check" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Modal>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Employment Status</Text>
                        <TouchableOpacity 
                            style={[styles.dropdownContainer, errors.employmentStatus && styles.inputError]}
                            onPress={() => !isLocked && setShowEmploymentStatusPicker(true)}
                            disabled={isLocked}
                        >
                            <Text style={styles.dropdownText}>
                                {selectedEmploymentStatus.label}
                            </Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                        </TouchableOpacity>
                        {errors.employmentStatus && <Text style={styles.errorText}>{errors.employmentStatus}</Text>}
                        
                        <Modal
                            visible={showEmploymentStatusPicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowEmploymentStatusPicker(false)}
                        >
                            <TouchableWithoutFeedback onPress={() => setShowEmploymentStatusPicker(false)}>
                                <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {employmentStatusOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.option}
                                        onPress={() => {
                                            onChange('employmentStatus', option.value);
                                            setShowEmploymentStatusPicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            option.value === profile.employmentStatus && styles.selectedOption
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {option.value === profile.employmentStatus && (
                                            <MaterialIcons name="check" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Modal>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Joining</Text>
                        <TextInput
                            style={[styles.input, errors.dateOfJoining && styles.inputError]}
                            value={profile.dateOfJoining}
                            onChangeText={(text) => onChange('dateOfJoining', text)}
                            editable={!isLocked}
                            placeholder="YYYY-MM-DD"
                        />
                        {errors.dateOfJoining && <Text style={styles.errorText}>{errors.dateOfJoining}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Status</Text>
                        <TextInput
                            style={[styles.input, errors.status && styles.inputError]}
                            value={profile.status}
                            onChangeText={(text) => onChange('status', text)}
                            editable={!isLocked}
                            placeholder="Enter Status"
                        />
                        {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Extra space for the save button
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
    inputError: {
        borderColor: 'red',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        backgroundColor: '#f9f9f9',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
    imagePicker: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    dateInput: {
        justifyContent: 'center',
        height: 50,
    },
});

export default BasicInfoSection;