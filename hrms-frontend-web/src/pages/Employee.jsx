import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Profile from '../components/Profile';
import LeaveForm from '../components/LeaveForm';
import ODForm from '../components/ODForm';
import ODList from '../components/ODList';
import MyDashboard from '../components/EmployeeDashboard';
import LeaveList from '../components/LeaveList';
import Attendance from '../components/Attendance';
import ApproveOT from '../components/OTApproval';
import PunchMissedForm from '../components/PunchMissedForm';
import PunchMissedList from '../components/PunchMissedList';

function Employee() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 pt-16">
        <Routes>
          <Route path="profile" element={<Profile />} />
          <Route path="employee-dashboard" element={<MyDashboard />} />
          <Route path="leave" element={<LeaveForm />} />
          <Route path="od" element={<ODForm />} />
          <Route path="od-list" element={<ODList />} />
          <Route path="leave-list" element={<LeaveList />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="approve-ot" element={<ApproveOT />} />
          <Route path="punch-missed" element={<PunchMissedForm />} />
          <Route path="punch-missed-list" element={<PunchMissedList />} />
        </Routes>
      </div>
    </div>
  );
}

export default Employee;
