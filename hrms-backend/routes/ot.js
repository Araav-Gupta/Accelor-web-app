import express from 'express';
import OTClaim from '../models/OTClaim.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';
import Audit from '../models/Audit.js';
import Attendance from '../models/Attendance.js';
import auth from '../middleware/auth.js';
import role from '../middleware/role.js';
import Department from '../models/Department.js';
const router = express.Router();

// Submit OT
router.post('/', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id).populate('department');
    
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!user.designation) {
      return res.status(400).json({ message: 'Employee designation is required' });
    }
    if (!user.department) {
      return res.status(400).json({ message: 'Employee department is required' });
    }

    const { date, hours, projectDetails, claimType } = req.body;
    if (!date || !hours || !projectDetails || !claimType) {
      return res.status(400).json({ error: 'Date, hours, project details, and claim type are required' });
    }

    const otDate = new Date(date);
    if (isNaN(otDate.getTime())) return res.status(400).json({ error: 'Invalid date' });
    if (hours < 1) return res.status(400).json({ error: 'Hours must be at least 1' });
    if (hours > 24) return res.status(400).json({ error: 'Hours must be between 1 and 24' });

    const normalizeDate = (d) => {
      const date = new Date(d);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };
    const normalizedOtDate = normalizeDate(otDate);
    const now = new Date();
    const claimDeadline = new Date(normalizedOtDate);
    claimDeadline.setDate(claimDeadline.getDate() + 1);
    claimDeadline.setHours(23, 59, 59, 999);

    if (now > claimDeadline) {
      return res.status(400).json({ error: 'OT claim must be submitted by 11:59 PM the next day' });
    }

    const eligibleDepartments = ['Production', 'Mechanical', 'AMETL'];
    const eligibleDesignations = ['Technician', 'Sr. Technician', 'Junior Engineer'];
    const isEligible = eligibleDepartments.includes(user.department.name) && eligibleDesignations.includes(user.designation);
    const isSunday = otDate.getDay() === 0;

    let attendanceRecord = await Attendance.findOne({
      employeeId: user.employeeId,
      logDate: { $gte: normalizedOtDate, $lte: normalizedOtDate },
    });
     if (!attendanceRecord) {
      return res.status(400).json({ error: 'No attendance recorded for this date' });
    }
    const recordedOtHours = attendanceRecord.ot / 60;
    if (hours > recordedOtHours) {
      return res.status(400).json({ error: `Claimed hours (${hours}) exceed recorded OT (${recordedOtHours.toFixed(1)})` });
    }

    let compensatoryHours = 0;
    let paymentAmount = 0;

    if (isEligible) {
      // Eligible employees: Payment only, minimum 1 hour, within deadline
      if (hours < 1) return res.status(400).json({ error: 'Hours must be at least 1' });
      const claimDeadline = new Date(normalizedOtDate);
      claimDeadline.setDate(claimDeadline.getDate() + 1);
      claimDeadline.setHours(23, 59, 59, 999);
      if (now > claimDeadline) {
        return res.status(400).json({ error: 'OT claim must be submitted by 11:59 PM the next day' });
      }
      paymentAmount = hours * 500 * 1.5; // Example rate
    } else if (isSunday) {
      // Non-eligible employees: Compensatory leave for Sundays
      if (hours < 4) return res.status(400).json({ error: 'Compensatory leave requires at least 4 hours' });
      compensatoryHours = hours >= 8 ? 8 : 4;
    } else {
      // Non-eligible employees on non-Sundays: No OT
      return res.status(400).json({ error: 'OT claims are not allowed for non-eligible employees on non-Sundays' });
    }

    const status = {
      hod: req.user.role === "Employee" ? "Pending" : req.user.role === "HOD" ? "Submitted" : "Approved",
      ceo: 'Pending',
      admin: 'Pending'
    };

    const otClaim = new OTClaim({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      department: user.department,
      date,
      hours,
      projectDetails,
      compensatoryHours,
      paymentAmount,
      status
    });

    await otClaim.save();

    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      }
    } else {
      const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
      if (hod) {
        await Notification.create({ userId: hod.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      }
    }

    await Audit.create({ user: user.employeeId, action: 'Submit OT', details: `Submitted OT claim for ${hours} hours on ${otDate.toDateString()}` });

    res.status(201).json(otClaim);
  } catch (err) {
    console.error('OT submit error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get OTs
router.get('/', auth, async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let query = {};
    const {
      employeeId,
      departmentId,
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
      query.date = { $gte: startDate };
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      query.date = query.date || {};
      query.date.$lte = endDate;
    }

    const total = await OTClaim.countDocuments(query);
    const otClaims = await OTClaim.find(query)
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ otClaims, total });
  } catch (err) {
    console.error('Fetch OTs error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve OT
router.put('/:id/approve', auth, role(['HOD', 'CEO', 'Admin']), async (req, res) => {
  try {
    const otClaim = await OTClaim.findById(req.params.id).populate('employee department');
    if (!otClaim) {
      return res.status(404).json({ message: 'OT claim not found' });
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

    if (otClaim.status[currentStage] !== 'Pending') {
      return res.status(400).json({ message: `OT claim is not pending ${currentStage.toUpperCase()} approval` });
    }

    if (status === 'Rejected' && ['hod', 'ceo'].includes(currentStage) && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({ message: 'Remarks are required for rejection' });
    }

    if (req.user.role === 'HOD' && user.department.toString() !== otClaim.department.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve OT claims for this department' });
    }

    if (req.user.role === "CEO" && !["Approved", "Submitted"].includes(leave.status.hod)) {
      return res.status(400).json({ message: 'OT claim must be approved or submitted by HOD first' });
    }

    if (req.user.role === 'Admin' && otClaim.status.ceo !== 'Approved') {
      return res.status(400).json({ message: 'OT claim must be approved by CEO first' });
    }

    otClaim.status[currentStage] = status;
    if (status === 'Rejected' && ['hod', 'ceo'].includes(currentStage)) {
      otClaim.remarks = remarks;
    }

    if (['Approved', 'Submitted'].includes(status) && currentStage === 'hod') {
      otClaim.status.ceo = 'Pending';
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `OT claim from ${otClaim.name} awaiting CEO approval` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `OT claim from ${otClaim.name} awaiting CEO approval` });
      }
    } else if (status === 'Approved' && currentStage === 'ceo') {
      otClaim.status.admin = 'Pending';
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (admin) {
        await Notification.create({ userId: admin.employeeId, message: `OT claim from ${otClaim.name} awaiting Admin acknowledgment` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `OT claim from ${otClaim.name} awaiting Admin acknowledgment` });
      }
    } else if (status === 'Acknowledged' && currentStage === 'admin') {
      const employee = await Employee.findById(otClaim.employee);
      if (employee && otClaim.compensatoryHours > 0) {
        employee.compensatoryAvailable.push({
          hours: otClaim.compensatoryHours,
          date: otClaim.date,
          status: 'Available'
        });
        await employee.save();
      }
    }

    await otClaim.save();
    await Audit.create({ user: user.employeeId, action: `${status} OT`, details: `${status} OT claim for ${otClaim.name}` });

    const employee = await Employee.findById(otClaim.employee);
    if (employee) {
      await Notification.create({ userId: employee.employeeId, message: `Your OT claim has been ${status.toLowerCase()} by ${currentStage.toUpperCase()}` });
      if (global._io) global._io.to(employee.employeeId).emit('notification', { message: `Your OT claim has been ${status.toLowerCase()} by ${currentStage.toUpperCase()}` });
    }

    res.json(otClaim);
  } catch (err) {
    console.error('OT approval error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;