import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import LeaveList from '../components/LeaveList';
import ODList from '../components/ODList';
import Attendance from '../components/Attendance';
import ApproveOT from '../components/OTApproval';
import PunchMissedForm from '../components/PunchMissedForm';
import PunchMissedList from '../components/PunchMissedList';
import PayrollDownloadForm from '../components/PayrollDownloadForm';

function Admin() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 pt-16">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="add-employee" element={<EmployeeForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="approve-leave" element={<LeaveList />} />
          <Route path="approve-od" element={<ODList />} />
          <Route path="approve-ot" element={<ApproveOT />} />
          <Route path="punch-missed" element={<PunchMissedForm />} />
          <Route path="approve-punch-missed" element={<PunchMissedList />} />
          <Route path="payroll-download" element={<PayrollDownloadForm />} />
        </Routes>
      </div>
    </div>
  );
}

export default Admin;
