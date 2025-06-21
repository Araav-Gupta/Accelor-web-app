import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import OTClaim from '../models/OTClaim.js';
import Department from '../models/Department.js';

async function processUnclaimedOT() {
  try {
    console.log('Running processUnclaimedOT...');
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Eligible departments and designations
    const eligibleDepartments = ['Production', 'Mechanical', 'AMETL'];
    const eligibleDesignations = ['Technician', 'Sr. Technician', 'Junior Engineer'];
    const eligibleDeptIds = await Department.find({ name: { $in: eligibleDepartments } }).select('_id');

    // Find attendance records with OT from yesterday
    const attendanceRecords = await Attendance.find({
      logDate: yesterday,
      ot: { $gte: 60 }, // At least 1 hour (60 minutes)
    });

    for (const record of attendanceRecords) {
      const otHours = record.ot / 60; // Convert to hours
      // Fetch employee
      let employee;
      try {
        employee = await Employee.findOne({ employeeId: record.employeeId }).populate('department');
        if (!employee) {
          console.warn(`No employee found for employeeId: ${record.employeeId}`);
          continue;
        }
      } catch (err) {
        console.error(`Error fetching employee for employeeId: ${record.employeeId}`, err.message);
        continue;
      }

      // Check if OT was claimed
      const existingClaim = await OTClaim.findOne({
        employeeId: record.employeeId,
        date: { $gte: yesterday, $lte: yesterday },
      });
      if (existingClaim) continue;

      const isEligible = eligibleDeptIds.some(id => id.equals(employee.department._id)) &&
                        eligibleDesignations.includes(employee.designation);
      const isSunday = yesterday.getDay() === 0;

      if (isEligible) {
        // Eligible employees: Check claim deadline
        const claimDeadline = new Date(yesterday);
        claimDeadline.setDate(claimDeadline.getDate() + 1);
        claimDeadline.setHours(23, 59, 59, 999);
        if (now > claimDeadline) {
          record.ot = 0; // Unclaimed OT is wasted
          await record.save();
          console.log(`Wasted ${otHours}h OT for eligible employee ${record.employeeId} on ${yesterday.toISOString()}`);
        }
      } else if (isSunday) {
        // Non-eligible employees: Add compensatory leave for Sundays
        let compensatoryHours = 0;
        if (otHours >= 8) {
          compensatoryHours = 8; // Full-day
        } else if (otHours >= 5) {
          compensatoryHours = 4; // Half-day
        }

        if (compensatoryHours > 0) {
          try {
            await employee.addCompensatoryLeave(yesterday, compensatoryHours);
            record.ot = 0; // Mark OT as processed
            await record.save();
            console.log(`Added ${compensatoryHours}h compensatory leave for non-eligible employee ${record.employeeId} on ${yesterday.toISOString()}`);
          } catch (err) {
            console.error(`Error adding compensatory leave for employee ${record.employeeId}`, err.message);
            continue;
          }
        } else {
          record.ot = 0; // OT < 4 hours is wasted
          await record.save();
          console.log(`Wasted ${otHours}h OT for non-eligible employee ${record.employeeId} on ${yesterday.toISOString()}`);
        }
      } else {
        // Non-eligible employees on non-Sundays: No OT
        record.ot = 0;
        await record.save();
        console.log(`No OT for non-eligible employee ${record.employeeId} on non-Sunday ${yesterday.toISOString()}`);
      }
    }

    console.log('processUnclaimedOT completed.');
  } catch (err) {
    console.error('Error processing unclaimed OT:', err.message, err.stack);
  }
}

export { processUnclaimedOT };
