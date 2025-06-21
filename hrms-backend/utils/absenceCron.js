import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import OD from '../models/OD.js';
import Notification from '../models/Notification.js';

const checkAbsences = async () => {
  try {
    console.log('Running absence check cron job...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);

    const employees = await Employee.find({ status: 'Working' }).select('employeeId department');
    const admin = await Employee.findOne({ loginType: 'Admin' });

    if (!admin) {
      console.warn('No admin found for absence notifications');
      return;
    }

    for (const employee of employees) {
      const attendanceRecords = await Attendance.find({
        employeeId: employee.employeeId,
        logDate: { $gte: fiveDaysAgo, $lte: today },
        status: 'Absent',
      }).sort({ logDate: 1 }).lean();

      const leaves = await Leave.find({
        employeeId: employee.employeeId,
        'status.ceo': 'Approved',
        $or: [
          { 'fullDay.from': { $gte: fiveDaysAgo, $lte: today } },
          { 'fullDay.to': { $gte: fiveDaysAgo, $lte: today } },
          { 'halfDay.date': { $gte: fiveDaysAgo, $lte: today } },
        ],
      }).lean();

      const ods = await OD.find({
        employeeId: employee.employeeId,
        'status.ceo': 'Approved',
        dateOut: { $lte: today },
        dateIn: { $gte: fiveDaysAgo },
      }).lean();

      // Create a map of approved leave/OD dates
      const approvedDates = new Set();
      leaves.forEach(leave => {
        if (leave.halfDay?.date) {
          approvedDates.add(new Date(leave.halfDay.date).toISOString().split('T')[0]);
        } else if (leave.fullDay?.from && leave.fullDay?.to) {
          let current = new Date(leave.fullDay.from);
          const to = new Date(leave.fullDay.to);
          while (current <= to) {
            approvedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      });
      ods.forEach(od => {
        let current = new Date(od.dateOut);
        const to = new Date(od.dateIn);
        while (current <= to) {
          approvedDates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      });

      // Filter unapproved absences
      const unapprovedAbsences = attendanceRecords.filter(record => {
        const dateStr = new Date(record.logDate).toISOString().split('T')[0];
        return !approvedDates.has(dateStr);
      });

      // Check for consecutive absences
      let consecutiveDays = 0;
      let lastDate = null;
      for (const record of unapprovedAbsences) {
        const currentDate = new Date(record.logDate);
        currentDate.setHours(0, 0, 0, 0);
        if (lastDate && (currentDate - lastDate) / (1000 * 60 * 60 * 24) === 1) {
          consecutiveDays++;
        } else {
          consecutiveDays = 1;
        }
        lastDate = currentDate;
      }

      if (consecutiveDays === 3) {
        await Notification.create({
          userId: admin.employeeId,
          message: `Employee ${employee.employeeId} has been absent without prior leave for 3 consecutive days. Review in attendance list to send warning.`,
        });
        if (global._io) {
          global._io.to(admin.employeeId).emit('notification', {
            message: `Employee ${employee.employeeId} has been absent without prior leave for 3 consecutive days. Review in attendance list to send warning.`,
          });
        }
      } else if (consecutiveDays === 5) {
        await Notification.create({
          userId: admin.employeeId,
          message: `Employee ${employee.employeeId} has been absent without prior leave for 5 consecutive days. Review in attendance list to send termination notice.`,
        });
        if (global._io) {
          global._io.to(admin.employeeId).emit('notification', {
            message: `Employee ${employee.employeeId} has been absent without prior leave for 5 consecutive days. Review in attendance list to send termination notice.`,
          });
        }
      }
    }
    console.log('Absence check cron job completed.');
  } catch (err) {
    console.error('Error in absence check cron job:', err);
  }
};

export { checkAbsences };
