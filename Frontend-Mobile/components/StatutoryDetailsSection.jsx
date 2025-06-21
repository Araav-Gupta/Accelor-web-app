// components/StatutoryDetailsSection.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const StatutoryDetailsSection = ({ profile = { statutoryDetails: {} }, errors = {}, onChange = () => {}, isLocked = false }) => {
  const [showTaxRegimePicker, setShowTaxRegimePicker] = useState(false);
  
  const taxRegimeOptions = [
    { label: 'Select Tax Regime', value: '' },
    { label: 'Old Regime', value: 'old' },
    { label: 'New Regime', value: 'new' },
  ];
  
  const selectedTaxRegime = taxRegimeOptions.find(opt => opt.value === profile?.statutoryDetails?.taxRegime) || taxRegimeOptions[0];
  const handleField = (label, field, keyboardType = 'default', placeholder = '') => (
    <View style={styles.inputGroup} key={field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        value={profile?.statutoryDetails?.[field] || ''}
        onChangeText={(text) => onChange(`statutoryDetails.${field}`, text)}
        editable={!isLocked}
        keyboardType={keyboardType}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statutory Details</Text>
        
        {handleField('PAN Number', 'panNumber', 'default', 'Enter PAN number')}
        {handleField('PF Number', 'pfNumber', 'default', 'Enter PF number')}
        {handleField('UAN Number', 'uanNumber', 'default', 'Enter UAN number')}
        {handleField('ESIC Number', 'esicNumber', 'default', 'Enter ESIC number')}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tax Regime</Text>
          <TouchableOpacity 
            style={[styles.dropdownContainer, errors.taxRegime && styles.inputError]}
            onPress={() => !isLocked && setShowTaxRegimePicker(true)}
            disabled={isLocked}
          >
            <Text style={styles.dropdownText}>
              {selectedTaxRegime.label}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
          {errors.taxRegime && <Text style={styles.errorText}>{errors.taxRegime}</Text>}
          
          <Modal
            visible={showTaxRegimePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowTaxRegimePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowTaxRegimePicker(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {taxRegimeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onChange('statutoryDetails.taxRegime', option.value);
                    setShowTaxRegimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    option.value === profile?.statutoryDetails?.taxRegime && styles.selectedOption
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === profile?.statutoryDetails?.taxRegime && (
                    <MaterialIcons name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Modal>
        </View>
        
        {handleField('Nominee Name', 'nomineeName', 'default', 'Enter nominee name')}
        {handleField('Nominee Relation', 'nomineeRelation', 'default', 'Enter relation with nominee')}
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
    padding: 16,
    paddingBottom: 80, // Extra space for the save button
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
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

export default StatutoryDetailsSection;