import mongoose from 'mongoose';
import Employee from './Employee.js';

async function migrate() {
  try {
    // Connect to MongoDB (update the connection string as needed)
    await mongoose.connect('mongodb+srv://ankit111811:ankit001@cluster0.15kd4w5.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Update Staff employees
    const staffResetDate = new Date(currentYear, 0, 1); // January 1st of current year
    const staffResult = await Employee.updateMany(
      { employeeType: 'Staff', lastLeaveReset: { $exists: false } },
      { $set: { lastLeaveReset: staffResetDate, paidLeaves: 12 } }
    );
    console.log(`Updated ${staffResult.modifiedCount} Staff employees with lastLeaveReset: ${staffResetDate}`);

    // Update Intern employees
    const internResetDate = new Date(currentYear, currentMonth, 1); // 1st of current month
    const internResult = await Employee.updateMany(
      { employeeType: 'Intern', lastMonthlyReset: { $exists: false } },
      { $set: { lastMonthlyReset: internResetDate, paidLeaves: 1 } }
    );
    console.log(`Updated ${internResult.modifiedCount} Intern employees with lastMonthlyReset: ${internResetDate}`);

    // For Interns, calculate accumulated leaves from dateOfJoining to now
    const interns = await Employee.find({ employeeType: 'Intern', lastMonthlyReset: internResetDate });
    for (const intern of interns) {
      if (!intern.dateOfJoining) continue;

      const joinDate = new Date(intern.dateOfJoining);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth();
      const monthsSinceJoining = (currentYear - joinYear) * 12 + (currentMonth - joinMonth) + 1;

      // Set paidLeaves to the number of months since joining (1 leave per month)
      intern.paidLeaves = monthsSinceJoining;
      await intern.save();
    }
    console.log(`Updated paidLeaves for ${interns.length} Interns based on dateOfJoining`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate().catch(console.error);