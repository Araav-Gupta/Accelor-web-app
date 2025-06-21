import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu } from 'react-native-paper';
import { LEAVE_TYPES } from './constants';

const LeaveTypeSelector = React.memo(({ leaveType, setLeaveType, canApplyEmergencyLeave, leaveTypeVisible, setLeaveTypeVisible }) => {
  const filteredLeaveTypes = canApplyEmergencyLeave
    ? LEAVE_TYPES
    : LEAVE_TYPES.filter(type => type !== 'Emergency');

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Leave Type</Text>
      <Menu
        visible={leaveTypeVisible}
        onDismiss={() => setLeaveTypeVisible(false)}
        contentStyle={{ backgroundColor: '#ffffff' }}
        style={{ marginTop: -80 }}
        anchor={
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setLeaveTypeVisible(true)}
          >
            <Text style={leaveType ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder}>
              {leaveType || 'Select Leave Type'}
            </Text>
          </TouchableOpacity>
        }
      >
        {filteredLeaveTypes.map((type) => (
          <Menu.Item
            key={type}
            onPress={() => {
              setLeaveType(type);
              setLeaveTypeVisible(false);
            }}
            title={type}
            titleStyle={styles.dropdownItemText}
          />
        ))}
      </Menu>
    </View>
  );
});

const styles = StyleSheet.create({
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
    fontWeight: '500',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 6,
    padding: 12,
    marginTop: 6,
    backgroundColor: 'white',
    justifyContent: 'center',
    height: 46,
  },
  dropdownButtonText: {
    color: '#1f2937',
    fontSize: 16,
  },
  dropdownButtonPlaceholder: {
    color: '#9ca3af',
    fontSize: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1f3337',
  },
});

export default LeaveTypeSelector;