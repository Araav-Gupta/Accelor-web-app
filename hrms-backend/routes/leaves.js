import express from 'express';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import Audit from '../models/Audit.js';
import auth from '../middleware/auth.js';
import role from '../middleware/role.js';
import Department from '../models/Department.js';
import { upload, uploadToGridFS, gfsReady } from '../middleware/fileupload.js';
import { getGfs } from '../utils/gridfs.js';
const router = express.Router();

// Submit Leave
router.post('/', auth, role(['Employee', 'HOD', 'Admin']), upload.single('medicalCertificate'), async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!user.designation) {
      return res.status(400).json({ message: 'Employee designation is required' });
    }
    if (!user.department) {
      return res.status(400).json({ message: 'Employee department is required' });
    }

    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Use UTC to align with YYYY-MM-DD
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const leaveDays = req.body.halfDay ? 0.5 :
      (req.body.fullDay?.from && req.body.fullDay?.to
        ? ((new Date(req.body.fullDay.to) - new Date(req.body.fullDay.from)) / (1000 * 60 * 60 * 24)) + 1
        : 0);
    if (leaveDays === 0 && !req.body.halfDay) {
      return res.status(400).json({ message: 'Invalid leave dates provided' });
    }

    let leaveStart, leaveEnd;
    if (req.body.halfDay?.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.halfDay.date)) {
        return res.status(400).json({ message: 'Invalid half day date format (expected YYYY-MM-DD)' });
      }
      leaveStart = new Date(req.body.halfDay.date);
      leaveEnd = new Date(req.body.halfDay.date);
      if (isNaN(leaveStart.getTime())) {
        return res.status(400).json({ message: 'Invalid half day date' });
      }
      if (req.body.leaveType === 'Emergency') {
        const todayStr = today.toISOString().split('T')[0];
        const leaveStartStr = leaveStart.toISOString().split('T')[0];
        console.log('Emergency Half-Day Validation:', {
          todayStr,
          leaveStartStr,
          rawHalfDayDate: req.body.halfDay.date,
          serverTime: new Date().toString()
        });
        if (leaveStartStr !== todayStr) {
          return res.status(400).json({ message: 'Emergency leave must be for the current date only' });
        }
      } else if (req.body.leaveType !== 'Medical' && leaveStart < today) {
        return res.status(400).json({ message: 'Half day date cannot be in the past for this leave type' });
      }
    } else if (req.body.fullDay?.from && req.body.fullDay?.to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.fullDay.from) || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.fullDay.to)) {
        return res.status(400).json({ message: 'Invalid full day date format (expected YYYY-MM-DD)' });
      }
      leaveStart = new Date(req.body.fullDay.from);
      leaveEnd = new Date(req.body.fullDay.to);
      if (isNaN(leaveStart.getTime()) || isNaN(leaveEnd.getTime())) {
        return res.status(400).json({ message: 'Invalid full day date' });
      }
      if (req.body.leaveType === 'Medical') {
        if (leaveStart < sevenDaysAgo || leaveStart > today) {
          return res.status(400).json({ message: 'Medical leave from date must be within today and 7 days prior' });
        }
      } else if (req.body.leaveType === 'Emergency') {
        const todayStr = today.toISOString().split('T')[0];
        const leaveStartStr = leaveStart.toISOString().split('T')[0];
        const leaveEndStr = leaveEnd.toISOString().split('T')[0];
        console.log('Emergency Full-Day Validation:', {
          todayStr,
          leaveStartStr,
          leaveEndStr,
          rawFullDayFrom: req.body.fullDay.from,
          rawFullDayTo: req.body.fullDay.to,
          serverTime: new Date().toString()
        });
        if (leaveStartStr !== todayStr || leaveEndStr !== todayStr) {
          return res.status(400).json({ message: 'Emergency leave must be for the current date only' });
        }
      } else {
        if (leaveStart <= today) {
          return res.status(400).json({ message: 'Full day from date must be after today for this leave type' });
        }
      }
      if (leaveStart > leaveEnd) {
        return res.status(400).json({ message: 'Leave start date cannot be after end date' });
      }
    } else {
      return res.status(400).json({ message: 'Either halfDay or fullDay dates are required' });
    }

    // Check if user is assigned as Charge Given To for any non-rejected leaves overlapping with the requested period (except for Emergency leave)
    if (req.body.leaveType !== 'Emergency') {
      const overlappingChargeAssignments = await Leave.find({
        chargeGivenTo: user._id,
        $or: [
          {
            'fullDay.from': { $lte: leaveEnd },
            'fullDay.to': { $gte: leaveStart },
            $and: [
              { 'status.hod': { $ne: 'Rejected' } },
              { 'status.ceo': { $ne: 'Rejected' } },
              { 'status.admin': { $in: ['Pending', 'Acknowledged'] } }
            ]
          },
          {
            'halfDay.date': { $gte: leaveStart, $lte: leaveEnd },
            $and: [
              { 'status.hod': { $ne: 'Rejected' } },
              { 'status.ceo': { $ne: 'Rejected' } },
              { 'status.admin': { $in: ['Pending', 'Acknowledged'] } }
            ]
          }
        ]
      });
      if (overlappingChargeAssignments.length > 0) {
        const leaveDetails = overlappingChargeAssignments[0];
        const dateRangeStr = leaveDetails.halfDay?.date
          ? `on ${new Date(leaveDetails.halfDay.date).toISOString().split('T')[0]}`
          : `from ${new Date(leaveDetails.fullDay.from).toISOString().split('T')[0]} to ${new Date(leaveDetails.fullDay.to).toISOString().split('T')[0]}`;
        return res.status(400).json({
          message: `You are assigned as Charge Given To for a leave ${dateRangeStr} and cannot apply for non-Emergency leaves during this period.`
        });
      }
    }

    const leaveType = req.body.leaveType;
    const isConfirmed = user.employeeType === 'Confirmed';
    const joinDate = new Date(user.dateOfJoining);
    const yearsOfService = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);

    let medicalCertificateId = null;
    if (leaveType === 'Medical') {
      if (!req.file) {
        return res.status(400).json({ message: 'Medical certificate is required for Medical leave' });
      }
      const fileData = await uploadToGridFS(req.file, { employeeId: user.employeeId, leaveType: 'Medical' });
      medicalCertificateId = fileData._id;
    }

    // Validate chargeGivenTo
    const chargeGivenToEmployee = await Employee.findById(req.body.chargeGivenTo);
    if (!chargeGivenToEmployee) {
      return res.status(400).json({ message: 'Selected employee for Charge Given To not found' });
    }
    // Check for overlapping charge assignments
    const overlappingLeaves = await Leave.find({
      chargeGivenTo: req.body.chargeGivenTo,
      $or: [
        {
          'fullDay.from': { $lte: leaveEnd },
          'fullDay.to': { $gte: leaveStart },
          $and: [
            { 'status.hod': { $ne: 'Rejected' } },
            { 'status.ceo': { $ne: 'Rejected' } },
            { 'status.admin': { $in: ['Pending', 'Acknowledged'] } }
          ]
        },
        {
          'halfDay.date': { $gte: leaveStart, $lte: leaveEnd },
          $and: [
            { 'status.hod': { $ne: 'Rejected' } },
            { 'status.ceo': { $ne: 'Rejected' } },
            { 'status.admin': { $in: ['Pending', 'Acknowledged'] } }
          ]
        }
      ]
    });
    if (overlappingLeaves.length > 0) {
      return res.status(400).json({ message: 'Selected employee is already assigned as Charge Given To for the specified date range' });
    }

    switch (leaveType) {
      case 'Casual':
        const canTakeCasualLeave = await user.checkConsecutivePaidLeaves(leaveStart, leaveEnd);
        if (!canTakeCasualLeave) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        if (user.paidLeaves < leaveDays) {
          return res.status(400).json({ message: 'Insufficient Casual leave balance.' });
        }
        break;
      case 'Medical':
        if (!isConfirmed) return res.status(400).json({ message: 'Medical leave is only for confirmed employees.' });
        if (![3, 4].includes(leaveDays)) return res.status(400).json({ message: 'Medical leave must be either 3 or 4 days.' });
        if (user.medicalLeaves < leaveDays) return res.status(400).json({ message: 'Medical leave already used or insufficient balance for this year.' });
        const medicalLeavesThisYear = await Leave.find({
          employeeId: user.employeeId,
          leaveType: 'Medical',
          'status.admin': 'Acknowledged',
          $or: [
            { 'fullDay.from': { $gte: new Date(currentYear, 0, 1) } },
            { 'halfDay.date': { $gte: new Date(currentYear, 0, 1) } },
          ],
        });
        if (medicalLeavesThisYear.length > 0) {
          return res.status(400).json({ message: 'Medical leave can only be used once per year.' });
        }
        break;
      case 'Maternity':
        if (!isConfirmed || user.gender !== 'Female') return res.status(400).json({ message: 'Maternity leave is only for confirmed female employees.' });
        if (yearsOfService < 1) return res.status(400).json({ message: 'Must have completed one year of service.' });
        if (leaveDays !== 90) return res.status(400).json({ message: 'Maternity leave must be 90 days.' });
        if (user.maternityClaims >= 2) return res.status(400).json({ message: 'Maternity leave can only be availed twice during service.' });
        break;
      case 'Paternity':
        if (!isConfirmed || user.gender !== 'Male') return res.status(400).json({ message: 'Paternity leave is only for confirmed male employees.' });
        if (yearsOfService < 1) return res.status(400).json({ message: 'Must have completed one year of service.' });
        if (leaveDays !== 7) return res.status(400).json({ message: 'Paternity leave must be 7 days.' });
        if (user.paternityClaims >= 2) return res.status(400).json({ message: 'Paternity leave can only be availed twice during service.' });
        break;
      case 'Restricted Holidays':
        if (leaveDays !== 1) return res.status(400).json({ message: 'Restricted Holiday must be 1 day.' });
        if (user.restrictedHolidays < 1) return res.status(400).json({ message: 'Restricted Holiday already used for this year.' });
        const canTakeRestrictedLeave = await user.checkConsecutivePaidLeaves(leaveStart, leaveEnd);
        if (!canTakeRestrictedLeave) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        if (!req.body.restrictedHoliday) return res.status(400).json({ message: 'Restricted holiday must be selected.' });
        const existingRestrictedLeave = await Leave.findOne({
          employeeId: user.employeeId,
          leaveType: 'Restricted Holidays',
          $or: [
            { 'fullDay.from': { $gte: new Date(currentYear, 0, 1) } },
            { 'halfDay.date': { $gte: new Date(currentYear, 0, 1) } },
          ],
          $or: [
            { 'status.hod': { $in: ['Pending', 'Approved'] } },
            { 'status.ceo': { $in: ['Pending', 'Approved'] } },
            { 'status.admin': { $in: ['Pending', 'Acknowledged'] } },
          ],
        });
        if (existingRestrictedLeave) {
          return res.status(400).json({ message: 'A Restricted Holiday request already exists for this year.' });
        }
        break;
      case 'Compensatory':
        if (!req.body.compensatoryEntryId || !req.body.projectDetails) {
          return res.status(400).json({ message: 'Compensatory entry ID and project details are required' });
        }
        const entry = user.compensatoryAvailable.find(e => e._id.toString() === req.body.compensatoryEntryId && e.status === 'Available');
        if (!entry) {
          return res.status(400).json({ message: 'Invalid or unavailable compensatory leave entry' });
        }
        const hoursNeeded = leaveDays === 0.5 ? 4 : 8;
        if (entry.hours !== hoursNeeded) {
          return res.status(400).json({ message: `Selected entry (${entry.hours} hours) does not match leave duration (${leaveDays === 0.5 ? 'Half Day (4 hours)' : 'Full Day (8 hours)'})` });
        }
        break;
      case 'Emergency':
        if (!user.canApplyEmergencyLeave) {
          return res.status(403).json({ message: 'You are not authorized to apply for Emergency leave' });
        }
        if (leaveDays > 1) {
          return res.status(400).json({ message: 'Emergency leave must be half day or one full day' });
        }
        if (req.user.role === 'HOD') {
          const ceo = await Employee.findOne({ loginType: 'CEO' });
          if (!ceo || !ceo.canApplyEmergencyLeave) {
            return res.status(403).json({ message: 'CEO approval required for HOD to apply for Emergency leave' });
          }
        }
        const canTakeEmergencyLeave = await user.checkConsecutivePaidLeaves(leaveStart, leaveEnd);
        if (!canTakeEmergencyLeave) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        break;
      case 'Leave Without Pay(LWP)':
        break;
      default:
        return res.status(400).json({ message: 'Invalid leave type.' });
    }

    const status = {
      hod: req.user.role === 'Employee' ? 'Pending' : 'Approved',
      ceo: 'Pending',
      admin: 'Pending'
    };
    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      status.hod = 'Approved';
    }

    const leave = new Leave({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      designation: user.designation,
      department: user.department,
      leaveType: req.body.leaveType,
      halfDay: req.body.halfDay,
      fullDay: req.body.fullDay,
      reason: req.body.reason,
      chargeGivenTo: req.body.chargeGivenTo,
      emergencyContact: req.body.emergencyContact,
      compensatoryEntryId: req.body.compensatoryEntryId,
      projectDetails: req.body.projectDetails,
      restrictedHoliday: req.body.restrictedHoliday,
      medicalCertificate: medicalCertificateId,
      status
    });

    await leave.save();

    // Notify the chargeGivenTo employee
    const dateRangeStr = req.body.halfDay?.date
      ? `on ${req.body.halfDay.date} (${req.body.halfDay.session})`
      : `from ${req.body.fullDay.from} to ${req.body.fullDay.to}`;
    await Notification.create({
      userId: chargeGivenToEmployee.employeeId,
      message: `You have been assigned as Charge Given To for ${user.name}'s leave ${dateRangeStr}. You cannot apply for non-Emergency leaves during this period until the leave is rejected.`
    });
    if (global._io) {
      global._io.to(chargeGivenToEmployee.employeeId).emit('notification', {
        message: `You have been assigned as Charge Given To for ${user.name}'s leave ${dateRangeStr}. You cannot apply for non-Emergency leaves during this period until the leave is rejected.`
      });
    }

    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      }
    } else {
      const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
      if (hod) {
        await Notification.create({ userId: hod.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      }
    }

    await Audit.create({ user: user.employeeId, action: 'Submit Leave', details: 'Submitted leave request' });

    res.status(201).json(leave);
  } catch (err) {
    console.error('Leave submit error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get Leaves
router.get('/', auth, async (req, res) => {
  try {
    if (!gfsReady()) {
      return res.status(500).json({ message: 'GridFS is not initialized' });
    }
    const gfs = getGfs();
    const user = await Employee.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let query = {};
    const {
      employeeId,
      departmentId,
      leaveType,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 10
    } = req.query;

    if (employeeId) {
      if (!/^[A-Za-z0-9]+$/.test(employeeId)) {
        return res.status(400).json({ message: 'Invalid Employee ID format' });
      }
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      query.employeeId = employeeId;
    }

    if (departmentId && departmentId !== 'all') {
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }
      query.department = departmentId;
    }

    if (req.user.role === 'Employee') {
      query.employeeId = user.employeeId;
    } else if (req.user.role === 'HOD') {
      query.department = user.department;
    }

    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    if (status && status !== 'all') {
      query.$or = [
        { 'status.hod': status },
        { 'status.ceo': status },
        { 'status.admin': status }
      ];
    }

    if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      query.$or = [
        { 'fullDay.from': { $gte: startDate } },
        { 'halfDay.date': { $gte: startDate } }
      ];
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      query.$or = query.$or || [];
      query.$or.push(
        { 'fullDay.to': { $lte: endDate } },
        { 'halfDay.date': { $lte: endDate } }
      );
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('department', 'name')
      .populate('chargeGivenTo', 'name') // Populate chargeGivenTo
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Manually fetch medical certificate filenames for Medical leaves
    const leavesWithCertificates = await Promise.all(leaves.map(async (leave) => {
      let medicalCertificate = null;
      if (leave.leaveType === 'Medical' && leave.medicalCertificate) {
        try {
          const file = await gfs.find({ _id: leave.medicalCertificate }).toArray();
          if (file[0]) {
            medicalCertificate = {
              _id: file[0]._id,
              filename: file[0].filename
            };
          }
        } catch (err) {
          console.error(`Error fetching file ${leave.medicalCertificate} for leave ${leave._id}:`, err);
        }
      }
      return {
        ...leave.toObject(), // Convert Mongoose document to plain object
        medicalCertificate
      };
    }));

    res.json({ leaves: leavesWithCertificates, total });
  } catch (err) {
    console.error('Fetch leaves error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve Leave
router.put('/:id/approve', auth, role(['HOD', 'CEO', 'Admin']), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('employee').populate('chargeGivenTo');
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const user = await Employee.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { status, remarks } = req.body;
    const currentStage = req.user.role.toLowerCase();
    const validStatuses = req.user.role === 'Admin' ? ['Acknowledged'] : ['Approved', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of ${validStatuses.join(', ')}` });
    }

    if (leave.status[currentStage] !== 'Pending') {
      return res.status(400).json({ message: `Leave is not pending ${currentStage.toUpperCase()} approval` });
    }

    if (status === 'Rejected' && ['hod', 'ceo'].includes(currentStage) && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ message: 'Remarks are required for rejection' });
    }

    if (req.user.role === 'HOD' && user.department.toString() !== leave.department.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve leaves for this department' });
    }

    if (req.user.role === 'CEO' && leave.status.hod !== 'Approved') {
      return res.status(400).json({ message: 'Leave must be approved by HOD first' });
    }

    if (req.user.role === 'Admin' && leave.status.ceo !== 'Approved') {
      return res.status(400).json({ message: 'Leave must be approved by CEO first' });
    }

    leave.status[currentStage] = status;
    if (status === 'Rejected' && ['hod', 'ceo'].includes(currentStage)) {
      leave.remarks = remarks;
    }

    if (status === 'Approved' && currentStage === 'hod') {
      leave.status.ceo = 'Pending';
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({
          userId: ceo.employeeId,
          message: `Leave request from ${leave.name} awaiting your approval`
        });
        if (global._io) {
          global._io.to(ceo.employeeId).emit('notification', { message: `Leave request from ${leave.name} awaiting your approval` });
        }
      }
    }

    if (status === 'Approved' && currentStage === 'ceo') {
      leave.status.admin = 'Pending';
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (admin) {
        await Notification.create({
          userId: admin.employeeId,
          message: `Leave request from ${leave.name} awaiting your acknowledgment`
        });
        if (global._io) {
          global._io.to(admin.employeeId).emit('notification', { message: `Leave request from ${leave.name} awaiting your acknowledgment` });
        }
      }
    }

    if (status === 'Acknowledged' && currentStage === 'admin') {
      const employee = leave.employee;
      switch (leave.leaveType) {
        case 'Casual':
          await employee.deductPaidLeaves(
            leave.fullDay?.from || leave.halfDay?.date,
            leave.fullDay?.to || leave.halfDay?.date,
            leave.leaveType
          );
          break;
        case 'Medical':
          await employee.deductMedicalLeaves(leave,
            leave.halfDay ? 0.5 :
            (leave.fullDay?.from && leave.fullDay?.to
              ? ((new Date(leave.fullDay.to) - new Date(leave.fullDay.from)) / (1000 * 60 * 60 * 24)) + 1
              : 0));
          break;
        case 'Maternity':
          await employee.recordMaternityClaim();
          break;
        case 'Paternity':
          await employee.recordPaternityClaim();
          break;
        case 'Restricted Holidays':
          await employee.deductRestrictedHolidays();
          break;
        case 'Compensatory':
          const entry = employee.compensatoryAvailable.find(e => e._id.toString() === leave.compensatoryEntryId.toString());
          if (entry) {
            entry.status = 'Used';
          }
          await employee.deductCompensatoryLeaves(leave.compensatoryEntryId);
          break;
        case 'Emergency':
          const leaveDays = leave.halfDay ? 0.5 :
            (leave.fullDay?.from && leave.fullDay?.to
              ? ((new Date(leave.fullDay.to) - new Date(leave.fullDay.from)) / (1000 * 60 * 60 * 24)) + 1
              : 0);
          if (employee.paidLeaves >= leaveDays) {
            await employee.deductPaidLeaves(
              leave.fullDay?.from || leave.halfDay?.date,
              leave.fullDay?.to || leave.halfDay?.date,
              leave.leaveType
            );
          } else {
            await employee.incrementUnpaidLeaves(
              leave.fullDay?.from || leave.halfDay?.date,
              leave.fullDay?.to || leave.halfDay?.date,
              leave.leaveType
            );
          }
          break;
        case 'Leave Without Pay(LWP)':
          await employee.incrementUnpaidLeaves(
            leave.fullDay?.from || leave.halfDay?.date,
            leave.fullDay?.to || leave.halfDay?.date,
            leave.leaveType
          );
          break;
        default:
          return res.status(400).json({ message: 'Invalid leave type for balance update' });
      }

      await employee.save();
    }

    if (status === 'Rejected') {
      // Notify the employee who submitted the leave
      await Notification.create({
        userId: leave.employee.employeeId,
        message: `Your ${leave.leaveType} leave request was rejected by ${currentStage.toUpperCase()}`
      });
      if (global._io) {
        global._io.to(leave.employee.employeeId).emit('notification', { message: `Your ${leave.leaveType} leave request was rejected by ${currentStage.toUpperCase()}` });
      }

      // Notify the chargeGivenTo employee that they are no longer assigned
      if (leave.chargeGivenTo) {
        const dateRangeStr = leave.halfDay?.date
          ? `on ${new Date(leave.halfDay.date).toISOString().split('T')[0]} (${leave.halfDay.session})`
          : `from ${new Date(leave.fullDay.from).toISOString().split('T')[0]} to ${new Date(leave.fullDay.to).toISOString().split('T')[0]}`;
        await Notification.create({
          userId: leave.chargeGivenTo.employeeId,
          message: `You are no longer assigned as Charge Given To for ${leave.name}'s leave ${dateRangeStr} due to rejection by ${currentStage.toUpperCase()}. You can now apply for non-Emergency leaves during this period.`
        });
        if (global._io) {
          global._io.to(leave.chargeGivenTo.employeeId).emit('notification', {
            message: `You are no longer assigned as Charge Given To for ${leave.name}'s leave ${dateRangeStr} due to rejection by ${currentStage.toUpperCase()}. You can now apply for non-Emergency leaves during this period.`
          });
        }
      }
    }

    await leave.save();
    await Audit.create({ user: user.employeeId, action: `${status} Leave`, details: `${status} leave request for ${leave.name}` });

    const employee = await Employee.findById(leave.employee);
    if (employee && status !== 'Rejected') {
      await Notification.create({ userId: employee.employeeId, message: `Your leave request has been ${status.toLowerCase()} by ${currentStage.toUpperCase()}` });
      if (global._io) global._io.to(employee.employeeId).emit('notification', { message: `Your leave request has been ${status.toLowerCase()} by ${currentStage.toUpperCase()}` });
    }

    res.json(leave);
  } catch (err) {
    console.error('Leave approval error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
