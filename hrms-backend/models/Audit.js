import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  user: { type: String, required: true }, // Changed from userId to user to match employees.js
  action: { type: String, required: true },
  details: { type: String, required: true },
}, { timestamps: true });

// Check if model is already compiled to prevent redefinition
const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);

export default Audit;