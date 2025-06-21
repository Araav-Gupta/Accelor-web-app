import express from 'express';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import Audit from '../models/Audit.js';
import auth from '../middleware/auth.js';
import role from '../middleware/role.js';
const router = express.Router();

// Get departments based on user role
router.get('/', auth, async (req, res) => {
  try {
    let departments;
    if (req.user.loginType === 'HOD') {
      // Fetch the HOD's department
      const hod = await Employee.findById(req.user.id).populate('department');
      if (!hod || !hod.department) {
        return res.status(400).json({ message: 'HOD has no valid department assigned' });
      }
      departments = [hod.department]; // Return as array for consistency
    } else if (['Admin', 'CEO'].includes(req.user.loginType)) {
      // Admin and CEO can fetch all departments
      departments = await Department.find();
    } else {
      return res.status(403).json({ message: 'Forbidden: Insufficient role' });
    }
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a department (Admin only)
router.post('/', auth, role(['Admin']), async (req, res) => {
  try {
    const department = new Department({ name: req.body.name });
    await department.save();
    await Audit.create({
      userId: req.user.employeeId,
      action: 'Create Department',
      details: `Created department ${req.body.name}`,
    });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a department (Admin only)
router.put('/:id', auth, role(['Admin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    department.name = req.body.name;
    await department.save();
    await Audit.create({
      userId: req.user.employeeId,
      action: 'Update Department',
      details: `Updated department ${department.name}`,
    });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a department (Admin only)
router.delete('/:id', auth, role(['Admin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const employees = await Employee.find({ department: req.params.id });
    if (employees.length > 0)
      return res.status(400).json({ message: 'Cannot delete department with assigned employees' });

    await Department.deleteOne({ _id: req.params.id });
    await Audit.create({
      userId: req.user.employeeId,
      action: 'Delete Department',
      details: `Deleted department ${department.name}`,
    });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
