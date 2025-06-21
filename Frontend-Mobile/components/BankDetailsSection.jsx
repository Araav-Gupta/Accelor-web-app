// components/BankDetailsSection.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BankDetailsSection = ({ profile = {}, errors = {}, onChange = () => {}, isLocked = false }) => {
  const [showPaymentTypePicker, setShowPaymentTypePicker] = useState(false);
  
  const paymentTypeOptions = [
    { label: 'Select Payment Type', value: '' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
    { label: 'Cheque', value: 'Cheque' },
    { label: 'Cash', value: 'Cash' },
  ];
  
  const selectedPaymentType = paymentTypeOptions.find(opt => opt.value === profile.paymentType) || paymentTypeOptions[0];
  const handleBankField = (label, field, keyboardType = 'default', placeholder = '') => (
    <View key={field} style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors?.[field] && styles.inputError]}
        value={profile.bankDetails?.[field] || ''}
        onChangeText={(text) => onChange(`bankDetails.${field}`, text)}
        editable={!isLocked}
        keyboardType={keyboardType}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      />
      {errors?.[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={true}
        bounces={true}
        showsVerticalScrollIndicator={true}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          {handleBankField('Bank Name', 'bankName')}
          {handleBankField('Bank Branch', 'bankBranch')}
          {handleBankField('Account Number', 'accountNumber', 'numeric')}
          {handleBankField('IFSC Code', 'ifscCode')}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Type</Text>
            <TouchableOpacity 
              style={[styles.dropdownContainer, errors?.paymentType && styles.inputError]}
              onPress={() => !isLocked && setShowPaymentTypePicker(true)}
              disabled={isLocked}
            >
              <Text style={styles.dropdownText}>
                {selectedPaymentType.label}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
            {errors?.paymentType && <Text style={styles.errorText}>{errors.paymentType}</Text>}
            
            <Modal
              visible={showPaymentTypePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPaymentTypePicker(false)}
            >
              <TouchableWithoutFeedback onPress={() => setShowPaymentTypePicker(false)}>
                <View style={styles.modalOverlay} />
              </TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {paymentTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.option}
                    onPress={() => {
                      onChange('paymentType', option.value);
                      setShowPaymentTypePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      option.value === profile.paymentType && styles.selectedOption
                    ]}>
                      {option.label}
                    </Text>
                    {option.value === profile.paymentType && (
                      <MaterialIcons name="check" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Modal>
          </View>
        </View>
      </ScrollView>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Extra space for the save button
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default BankDetailsSection;
