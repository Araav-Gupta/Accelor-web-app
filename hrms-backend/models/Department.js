import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

// Check if model is already compiled to prevent redefinition
const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

export default Department;