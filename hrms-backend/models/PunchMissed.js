import mongoose from 'mongoose';

const punchMissedSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  punchMissedDate: { type: Date, required: true },
  when: { type: String, enum: ['Time IN', 'Time OUT'], required: true },
  yourInput: { type: String, required: true },
  adminInput: { type: String },
  status: {
    hod: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    admin: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    ceo: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
  },
}, { timestamps: true });

export default mongoose.model('PunchMissed', punchMissedSchema);