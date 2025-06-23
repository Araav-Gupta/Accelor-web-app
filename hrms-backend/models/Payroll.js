import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, ref: 'Employee' },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  weekOffs: { type: Number, default: 0 },
  paidLeaves: { type: Number, default: 0 },
  unpaidLeaves: { type: Number, default: 0 },
  restrictedHolidays: { type: Number, default: 0 },
  odDays: { type: Number, default: 0 },
  otMinutes: { type: Number, default: 0 },
  basicSalary: { type: Number, default: 0 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  excelType: { type: String, enum: ['Type 1', 'Type 2'], required: true },
}, { timestamps: true });

// Add unique index to prevent duplicate payroll records for the same employee and date range
payrollSchema.index({ employeeId: 1, fromDate: 1, toDate: 1 }, { unique: true });

export default mongoose.model('Payroll', payrollSchema);