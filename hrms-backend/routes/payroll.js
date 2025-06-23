import express from 'express';
import XLSX from 'xlsx';
import moment from 'moment';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import OD from '../models/OD.js';
import OT from '../models/OTClaim.js';
import Department from '../models/Department.js';
import Payroll from '../models/Payroll.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/payroll/download
// @desc    Download payroll data as Excel and save to Payroll collection
// @access  Admin
router.get('/download', auth, async (req, res) => {
  try {
    if (req.user.loginType !== 'Admin') {
      return res.status(403).json({ msg: 'Access restricted to Admins only' });
    }

    const { employeeId, departmentIds, employeeTypes, fromDate, toDate, excelType } = req.query;
    // Use IST (UTC+5:30) for date parsing
    const from = moment(fromDate).utcOffset('+05:30').startOf('day');
    const to = moment(toDate).utcOffset('+05:30').endOf('day');
    if (!from.isValid() || !to.isValid() || to.isBefore(from)) {
      return res.status(400).json({ msg: 'Invalid date range' });
    }

    // Fetch employees
    let employeeQuery = {};
    if (employeeId) employeeQuery.employeeId = employeeId;
    if (departmentIds) employeeQuery.department = { $in: departmentIds.split(',') };
    if (employeeTypes) employeeQuery.employeeType = { $in: employeeTypes.split(',') };
    const employees = await Employee.find(employeeQuery).populate('department', 'name');

    // Fetch attendance, leaves, ODs, OTs
    const [attendances, leaves, ods, ots] = await Promise.all([
      Attendance.find({
        logDate: { $gte: from.toDate(), $lte: to.toDate() },
        employeeId: { $in: employees.map((e) => e.employeeId) },
      }),
      Leave.find({
        $or: [
          { 'halfDay.date': { $gte: from.toDate(), $lte: to.toDate() } },
          { 'fullDay.from': { $lte: to.toDate() }, 'fullDay.to': { $gte: from.toDate() } },
        ],
        employeeId: { $in: employees.map((e) => e.employeeId) },
        'status.admin': 'Acknowledged',
      }),
      OD.find({
        // Fix: Include ODs overlapping the date range
        $and: [
          { dateOut: { $lte: to.toDate() } },
          { dateIn: { $gte: from.toDate() } },
        ],
        employeeId: { $in: employees.map((e) => e.employeeId) },
        'status.admin': 'Acknowledged',
      }),
      OT.find({
        date: { $gte: from.toDate(), $lte: to.toDate() },
        employeeId: { $in: employees.map((e) => e.employeeId) },
        'status.admin': 'Acknowledged',
      }),
    ]);

    // Log fetched data for debugging
    console.log(`Fetched ${attendances.length} attendance records`);
    console.log(`Fetched ${leaves.length} leave records`);
    console.log(`Fetched ${ods.length} OD records`);
    console.log(`Fetched ${ots.length} OT records`);

    // Prepare Excel data and payroll records
    const workbook = XLSX.utils.book_new();
    const daysInRange = moment(to).diff(from, 'days') + 1;
    const headers =
      excelType === 'Type 1'
        ? [
            'S. NO.',
            'EmployeeID',
            'Name of Employee',
            "Father's/Spouse Name",
            'Basic Salary',
            ...Array.from({ length: daysInRange }, (_, i) =>
              moment(from).add(i, 'days').format('DD-MM-YYYY')
            ),
            'No. of Days Absent',
            'Restricted Holiday',
            'OD',
            'Paid Leaves',
            'Unpaid Leaves',
            'Week Off',
            'Present Days',
            'OT Hours',
          ]
        : [
            'S. NO.',
            'EmployeeID',
            'Name of Employee',
            ...Array.from({ length: daysInRange }, (_, i) =>
              moment(from).add(i, 'days').format('DD-MM-YYYY')
            ),
            'Present Days',
            'Week Off',
            'Paid Leaves',
            'Unpaid Leaves',
            'Restricted Holiday',
            'OT Hours',
          ];

    const data = [];
    const payrollRecords = [];
    for (const [index, emp] of employees.entries()) {
      const empAttendance = attendances.filter((a) => a.employeeId === emp.employeeId);
      const empLeaves = leaves.filter((l) => l.employeeId === emp.employeeId);
      const empODs = ods.filter((o) => o.employeeId === emp.employeeId);
      const empOTs = ots.filter((ot) => ot.employeeId === emp.employeeId);

      // Calculate daily status
      const dailyStatus = Array(daysInRange).fill('A');
      let presentDays = 0, absentDays = 0, weekOffs = 0;
      for (let i = 0; i < daysInRange; i++) {
        const date = moment(from).add(i, 'days').utcOffset('+05:30');
        if (date.day() === 0) {
          dailyStatus[i] = 'WO';
          weekOffs++;
          continue;
        }

        const attendance = empAttendance.find((a) =>
          moment(a.logDate).utcOffset('+05:30').isSame(date, 'day')
        );
        if (attendance?.status === 'Present') {
          dailyStatus[i] = 'P';
          presentDays++;
          continue; // Skip leave/OD checks for present days
        }

        // Check for leaves
        const leave = empLeaves.find((l) =>
          l.halfDay?.date
            ? moment(l.halfDay.date).utcOffset('+05:30').isSame(date, 'day')
            : moment(date).isBetween(
                moment(l.fullDay.from).utcOffset('+05:30'),
                moment(l.fullDay.to).utcOffset('+05:30'),
                'day',
                '[]'
              )
        );
        if (leave) {
          dailyStatus[i] = 'A';
          continue; // Skip OD check if leave is found
        }

        // Check for ODs
        const od = empODs.find((o) =>
          moment(date).isBetween(
            moment(o.dateOut).utcOffset('+05:30'),
            moment(o.dateIn).utcOffset('+05:30'),
            'day',
            '[]'
          )
        );
        if (od) {
          dailyStatus[i] = 'A';
        }
      }

      // Fix: Calculate absentDays from dailyStatus
      absentDays = dailyStatus.filter((status) => status === 'A').length;

      // Calculate leaves
      let paidLeaves = 0, unpaidLeaves = 0, restrictedHolidays = 0;
      empLeaves.forEach((l) => {
        // Fix: Case-insensitive leaveType comparison
        const leaveType = l.leaveType.toLowerCase();
        const days = l.halfDay
          ? 0.5
          : moment(l.fullDay.to)
              .utcOffset('+05:30')
              .diff(moment(l.fullDay.from).utcOffset('+05:30'), 'days') + 1;
        if (leaveType === 'leave without pay') {
          unpaidLeaves += days;
        } else if (leaveType === 'restricted holidays') {
          restrictedHolidays += days;
        } else {
          paidLeaves += days;
        }
      });

      // Calculate ODs
      const odDays = empODs.reduce((sum, o) => {
        return (
          sum +
          (moment(o.dateIn).utcOffset('+05:30').diff(moment(o.dateOut).utcOffset('+05:30'), 'days') + 1)
        );
      }, 0);

      // Calculate OT hours
      const otMinutes = empOTs.reduce((sum, ot) => {
        const hours = Number(ot.hours) || 0; // Ensure hours is a number
        return sum + hours * 60;
      }, 0);
      const otHours = Math.floor(otMinutes / 60);
      const otMins = otMinutes % 60;
      const otFormatted = `${otHours}:${otMins.toString().padStart(2, '0')}`;

      // Log for debugging
      console.log(`Employee ${emp.employeeId}:`, {
        presentDays,
        absentDays,
        weekOffs,
        paidLeaves,
        unpaidLeaves,
        restrictedHolidays,
        odDays,
        otMinutes,
      });

      // Prepare Excel row
      const row =
        excelType === 'Type 1'
          ? [
              index + 1,
              emp.employeeId,
              emp.name,
              emp.fatherName || emp.spouseName || '',
              emp.basic || 0,
              ...dailyStatus,
              absentDays,
              restrictedHolidays,
              odDays,
              paidLeaves,
              unpaidLeaves,
              weekOffs,
              presentDays,
              otFormatted,
            ]
          : [
              index + 1,
              emp.employeeId,
              emp.name,
              ...dailyStatus,
              presentDays,
              weekOffs,
              paidLeaves,
              unpaidLeaves,
              restrictedHolidays,
              otFormatted,
            ];
      data.push(row);

      // Prepare payroll record
      payrollRecords.push({
        employeeId: emp.employeeId,
        userId: emp._id,
        name: emp.name,
        fromDate: from.toDate(),
        toDate: to.toDate(),
        presentDays,
        absentDays,
        weekOffs,
        paidLeaves,
        unpaidLeaves,
        restrictedHolidays,
        odDays,
        otMinutes,
        basicSalary: emp.basic || 0,
        department: emp.department?._id,
        excelType,
      });
    }

    // Save payroll records to database
    await Payroll.insertMany(payrollRecords, { ordered: false }).catch((err) => {
      console.warn('Some payroll records already exist:', err);
    });

    // Generate Excel
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Payroll_${excelType}_${fromDate}_to_${toDate}.xlsx`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating payroll Excel:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

export default router;
