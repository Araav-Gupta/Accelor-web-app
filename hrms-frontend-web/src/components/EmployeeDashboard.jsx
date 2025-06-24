import React, { useEffect, useContext, useCallback, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';
import io from 'socket.io-client';
import OTTable from './OTTable';

function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    attendanceData: [],
    paidLeavesRemaining: { monthly: 0, yearly: 0 },
    unpaidLeavesTaken: 0,
    leaveRecords: [],
    overtimeHours: 0,
    restrictedHolidays: 0,
    compensatoryLeaves: 0,
    compensatoryAvailable: [],
    otClaimRecords: [],
    unclaimedOTRecords: [],
    claimedOTRecords: [],
    odRecords: [],
  });
  const [attendanceView, setAttendanceView] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

  useEffect(() => {
    if (user?.employeeId) {
      const socketInstance = io(import.meta.env.VITE_APP_API_URL || 'http://localhost:5000', {
        query: { employeeId: user.employeeId },
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      socketInstance.on('connect', () => {
        console.log('WebSocket connected');
      });
      socketInstance.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err.message);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        console.log('WebSocket disconnected');
      };
    }
  }, [user?.employeeId]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const employeeRes = await api.get('/dashboard/employee-info');
      const { paidLeaves, employeeType, restrictedHolidays, compensatoryLeaves, department, designation } = employeeRes.data;

      const eligibleDepartments = ['Production', 'Mechanical', 'AMETL'];
      const eligibleDesignations = ['Technician', 'Sr. Technician', 'Junior Engineer'];
      const isDeptEligible = department && department.name && eligibleDepartments.includes(department.name);
      const isDesignationEligible = designation && eligibleDesignations.includes(designation);
      console.log('Eligibility check:', { isDeptEligible, isDesignationEligible, department: department?.name, designation }); // Debug
      setIsEligible(isDeptEligible && isDesignationEligible);

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      let fromDate, toDate;

      const otFromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const otToDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      otToDate.setHours(23, 59, 59, 999);

      if (attendanceView === 'daily') {
        fromDate = new Date(today);
        toDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
      } else if (attendanceView === 'monthly') {
        fromDate = startOfMonth;
        toDate = endOfMonth;
      } else {
        fromDate = startOfYear;
        toDate = endOfYear;
      }
      const statsRes = await api.get(`/dashboard/employee-stats?attendanceView=${attendanceView}&fromDate=${otFromDate.toISOString()}&toDate=${otToDate.toISOString()}`);

      setData({
        attendanceData: statsRes.data.attendanceData,
        paidLeavesRemaining: {
          monthly: paidLeaves,
          yearly: employeeType === 'Confirmed' ? paidLeaves : 0,
        },
        unpaidLeavesTaken: statsRes.data.unpaidLeavesTaken,
        leaveRecords: statsRes.data.leaveRecords,
        overtimeHours: statsRes.data.overtimeHours,
        restrictedHolidays: restrictedHolidays,
        compensatoryLeaves: compensatoryLeaves,
        compensatoryAvailable: statsRes.data.compensatoryLeaveEntries || [],
        otClaimRecords: statsRes.data.otClaimRecords || [],
        unclaimedOTRecords: statsRes.data.unclaimedOTRecords || [],
        claimedOTRecords: statsRes.data.claimedOTRecords || [],
        odRecords: statsRes.data.odRecords || [],
      });
      console.log('Dashboard data:', {
        employee: employeeRes.data,
        stats: statsRes.data,
      });
    } catch (err) {
      console.error('Employee dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, attendanceView]);

  useEffect(() => {
    fetchData();
    if (socket && user?.employeeId) {
      socket.on('notification', () => {
        console.log('Received notification, refreshing dashboard data');
        fetchData();
      });
      return () => {
        socket.off('notification');
      };
    }
  }, [fetchData, socket, user?.employeeId]);

  if (loading) {
    return (
      <ContentLayout title="My Dashboard">
        <div className="text-center py-8">Loading...</div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="My Dashboard">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="My Dashboard">
      <div className="flex flex-col items-center w-full">
        <div className="flex items-center justify-around gap-6 w-full">
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-blue-800 text-center">
                Paid Leaves Remaining
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold text-blue-600">
                Monthly: {data.paidLeavesRemaining.monthly}
              </p>
              {user.employeeType === 'Confirmed' && (
                <p className="text-xl font-bold text-blue-600 mt-2">
                  Yearly: {data.paidLeavesRemaining.yearly}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-purple-800 text-center">
                Unpaid Leaves Taken (Current Month)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-purple-600 text-center">{data.unpaidLeavesTaken}</p>
            </CardContent>
          </Card>
          {!isEligible && ( // Hide for eligible employees
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-teal-800 text-center">
                  Compensatory Leave
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 text-center">
                <p className="text-xl font-bold text-teal-600">
                  {data.compensatoryLeaves} hrs
                </p>
                <p className="text-sm text-teal-600">
                  ({data.compensatoryAvailable.length} entries)
                </p>
              </CardContent>
            </Card>
          )}
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-yellow-800 text-center">
              Restricted Holidays
            </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-yellow-600 text-center">{data.restrictedHolidays}</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 w-full max-w-[900px]">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance ({attendanceView.charAt(0).toUpperCase() + attendanceView.slice(1)})</CardTitle>
              <Select
                value={attendanceView}
                onValueChange={(value) => setAttendanceView(value)}
                aria-label="Select attendance view"
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Daily" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {isEligible && (
            <Card>
              <CardHeader>
                <CardTitle>Unclaimed Overtime Records</CardTitle>
              </CardHeader>
              <CardContent>
                <OTTable
                  unclaimedOTRecords={data.unclaimedOTRecords}
                  claimedOTRecords={data.claimedOTRecords}
                  onClaimSuccess={fetchData}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ContentLayout>
  );
}

export default EmployeeDashboard;
