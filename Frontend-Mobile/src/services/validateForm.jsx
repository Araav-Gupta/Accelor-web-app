import { LEAVE_TYPES } from './constants';

const validateBasicFields = (form) => {
  // Log the exact values being checked
  const values = {
    leaveType: form.leaveType,
    reason: form.reason,
    chargeTo: form.chargeTo,
    emergencyContact: form.emergencyContact,
    duration: form.duration
  };
  
  console.log('Validating basic fields with values:', JSON.stringify(values, null, 2));
  
  // Check each field individually with logging
  const leaveTypeValue = typeof form.leaveType === 'string' ? form.leaveType.trim() : '';
  if (!leaveTypeValue) {
    console.log('Validation failed: Leave Type is required', { leaveType: form.leaveType });
    return 'Leave Type is required';
  }
  if (!form.reason) {
    console.log('Validation failed: Reason is required');
    return 'Reason is required';
  }
  if (!form.chargeTo) {
    console.log('Validation failed: Please select an employee to charge');
    return 'Please select an employee to charge';
  }
  if (!form.emergencyContact) {
    console.log('Validation failed: Emergency Contact is required');
    return 'Emergency Contact is required';
  }
  if (!form.duration) {
    console.log('Validation failed: Leave Duration is required');
    return 'Leave Duration is required';
  }
  
  console.log('All basic fields are valid');
  return null;
};

const validateDates = (form) => {
  if (form.duration === 'half' && (!form.halfDay.date || !form.halfDay.session)) {
    return 'Half Day Date and Session are required';
  }
  if (form.duration === 'half' && (form.fullDay.from || form.fullDay.to)) {
    return 'Full Day dates must be empty for Half Day leave';
  }
  if (form.duration === 'full' && (!form.fullDay.from || !form.fullDay.to)) {
    return 'Full Day From and To dates are required';
  }
  if (form.duration === 'full' && (form.halfDay.date || form.halfDay.session !== 'forenoon')) {
    return 'Half Day fields must be empty for Full Day leave';
  }
  if (form.fullDay.from && form.fullDay.to && new Date(form.fullDay.to) < new Date(form.fullDay.from)) {
    return 'To Date cannot be earlier than From Date';
  }
  return null;
};

const validateLeaveType = (form, user, leaveDays, compensatoryEntries, canApplyEmergencyLeave) => {
  const today = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(today.getTime() + (today.getTimezoneOffset() * 60 * 1000) + istOffset);
  istTime.setUTCHours(0, 0, 0, 0);

  const fromDate = form.duration === 'full' ? new Date(form.fullDay.from) : new Date(form.halfDay.date);
  fromDate.setHours(0, 0, 0, 0);

  if (form.leaveType !== 'Medical' && fromDate < istTime) {
    return `${form.leaveType} leave cannot be applied for past dates`;
  }

  switch (form.leaveType) {
    case 'Casual':
      if (user?.employeeType === 'Confirmed' && form.duration === 'full' && leaveDays > 3) {
        return 'Confirmed employees can take up to 3 consecutive Casual leaves';
      }
      if (user?.employeeType === 'Probation' && leaveDays > 1) {
        return 'Probation employees can take only 1 day of Casual leave at a time';
      }
      break;

    case 'Medical':
      if (user?.employeeType !== 'Confirmed') {
        return 'Medical leave is only available for Confirmed employees';
      }
      if (form.duration === 'half') {
        return 'Medical leave cannot be applied as a half-day leave';
      }
      if (!form.medicalCertificate || !form.medicalCertificate.uri) {
        return 'Medical certificate is required for medical leave';
      }
      if (leaveDays !== 3 && leaveDays !== 4) {
        return 'Medical leave must be exactly 3 or 4 days';
      }
      break;

    case 'Maternity':
      if (user?.gender?.toLowerCase() !== 'female') {
        return 'Maternity leave is only available for female employees';
      }
      if (user?.employeeType !== 'Confirmed') {
        return 'Maternity leave is only available for Confirmed employees';
      }
      if (form.duration === 'half') {
        return 'Maternity leave cannot be applied as a half-day leave';
      }
      if (leaveDays !== 90) {
        return 'Maternity leave must be exactly 90 days';
      }
      break;

    case 'Paternity':
      if (user?.gender?.toLowerCase() !== 'male') {
        return 'Paternity leave is only available for male employees';
      }
      if (user?.employeeType !== 'Confirmed') {
        return 'Paternity leave is only available for Confirmed employees';
      }
      if (form.duration === 'half') {
        return 'Paternity leave cannot be applied as a half-day leave';
      }
      if (leaveDays !== 7) {
        return 'Paternity leave must be exactly 7 days';
      }
      break;

    case 'Emergency':
      if (!canApplyEmergencyLeave) {
        return 'You are not authorized to apply for Emergency Leave';
      }
      if (leaveDays > 1) {
        return 'Emergency leave must be half day or one full day';
      }
      const leaveDate = form.duration === 'half' ? new Date(form.halfDay.date) : new Date(form.fullDay.from);
      leaveDate.setHours(0, 0, 0, 0);
      if (leaveDate.getTime() !== istTime.getTime()) {
        return 'Emergency leave must be for the current date only';
      }
      break;

    case 'Compensatory':
      if (!form.compensatoryEntryId) {
        return 'Please select a compensatory leave entry';
      }
      const entry = compensatoryEntries.find(e => e._id === form.compensatoryEntryId);
      if (!entry || entry.status !== 'Available') {
        return 'Selected compensatory leave is not available';
      }
      const hoursNeeded = form.duration === 'half' ? 4 : 8;
      if (entry.hours !== hoursNeeded) {
        return `Selected entry (${entry.hours} hours) does not match leave duration (${form.duration === 'half' ? 'Half Day (4 hours)' : 'Full Day (8 hours)'})`;
      }
      break;

    case 'Restricted Holidays':
      if (!form.restrictedHoliday) {
        return 'Please select a restricted holiday';
      }
      if (form.duration !== 'full') {
        return 'Restricted holidays must be full day';
      }
      break;

    case 'Leave Without Pay(LWP)':
      if (leaveDays > 30) {
        return 'LWP cannot exceed 30 days at a time';
      }
      if (user?.employeeType === 'Probation' && leaveDays > 7) {
        return 'Probation employees can take maximum 7 days of LWP at a time';
      }
      break;
  }

  if (form.leaveType !== 'Emergency' && form.leaveType !== 'Medical') {
    const noticeDays = 2;
    const noticeDate = new Date(istTime);
    noticeDate.setDate(istTime.getDate() + noticeDays);
    while (noticeDate.getDay() === 0 || noticeDate.getDay() === 6) {
      noticeDate.setDate(noticeDate.getDate() + 1);
    }
    if (fromDate < noticeDate) {
      return `${form.leaveType} requires minimum ${noticeDays} working days notice`;
    }
  }

  return null;
};

export const validateLeaveForm = (form, user, leaveDays, compensatoryEntries, canApplyEmergencyLeave) => {
  console.log('Starting form validation with form:', JSON.stringify(form, null, 2));
  
  // First validate basic fields
  const basicError = validateBasicFields(form);
  if (basicError) {
    console.log('Basic validation failed:', basicError);
    return basicError;
  }
  
  // Then validate dates
  const dateError = validateDates(form);
  if (dateError) {
    console.log('Date validation failed:', dateError);
    return dateError;
  }
  
  // Finally validate leave type specific rules
  const leaveTypeError = validateLeaveType(form, user, leaveDays, compensatoryEntries, canApplyEmergencyLeave);
  if (leaveTypeError) {
    console.log('Leave type validation failed:', leaveTypeError);
    return leaveTypeError;
  }
  
  console.log('All validations passed');
  return null;
};