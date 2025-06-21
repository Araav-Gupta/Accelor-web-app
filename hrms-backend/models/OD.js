import mongoose from 'mongoose';

const odSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  dateOut: { type: Date, required: true },
  timeOut: { type: String, required: true },
  dateIn: { type: Date, required: true },
  timeIn: { type: String },
  purpose: { type: String, required: true },
  placeUnitVisit: { type: String, required: true },
  status: {
    hod: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    admin: { type: String, enum: ['Pending', 'Acknowledged'], default: 'Pending' },
    ceo: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  }
}, { timestamps: true });

const OD = mongoose.models.OD || mongoose.model('OD', odSchema);

export default OD;
