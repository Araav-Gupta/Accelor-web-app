import React, { useEffect, useState, useContext } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    confirmedEmployees: 0,
    probationEmployees: 0,
    contractualEmployees: 0,
    internEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
  });
  const [genderData, setGenderData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [attendanceView, setAttendanceView] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError('User not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        const attendanceQuery = attendanceView === 'monthly'
          ? `?fromDate=${startOfMonth.toISOString().split('T')[0]}&toDate=${endOfMonth.toISOString().split('T')[0]}`
          : `?fromDate=${startOfYear.toISOString().split('T')[0]}&toDate=${endOfYear.toISOString().split('T')[0]}`;

        // Fetch dashboard stats
        const statsRes = await api.get('/dashboard/stats');
        setData(statsRes.data);

        // Fetch data for graphs
        const [employees, attendance] = await Promise.all([
          user.loginType === 'HOD' ? api.get('/employees/department') : api.get('/employees'),
          api.get(`/attendance${attendanceQuery}`),
        ]);

        // Gender Data
        const genderCounts = employees.data.reduce((acc, emp) => {
          const gender = emp.gender || 'Other';
          acc[gender] = (acc[gender] || 0) + 1;
          return acc;
        }, {});
        setGenderData([
          { name: 'Male', value: genderCounts.Male || 0 },
          { name: 'Female', value: genderCounts.Female || 0 },
          { name: 'Other', value: genderCounts.Other || 0 },
        ]);

        // Attendance Data
        const attendanceRecords = Array.isArray(attendance.data.attendance) ? attendance.data.attendance : [];
        const attendanceByDate = attendanceView === 'monthly'
          ? Array.from({ length: endOfMonth.getDate() }, (_, i) => {
              const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
              const count = attendanceRecords.filter(
                (a) =>
                  a.status === 'Present' &&
                  new Date(a.logDate).toDateString() === date.toDateString()
              ).length;
              return { name: `${i + 1}`, count };
            })
          : Array.from({ length: 12 }, (_, i) => {
              const month = new Date(today.getFullYear(), i, 1);
              const count = attendanceRecords.filter(
                (a) =>
                  a.status === 'Present' &&
                  new Date(a.logDate).getMonth() === i &&
                  new Date(a.logDate).getFullYear() === today.getFullYear()
              ).length;
              return { name: month.toLocaleString('default', { month: 'short' }), count };
            });
        setAttendanceData(attendanceByDate);

        // Department Data
        const departmentCounts = employees.data.reduce((acc, emp) => {
          const deptName = emp.department?.name || 'Unknown';
          acc[deptName] = (acc[deptName] || 0) + 1;
          return acc;
        }, {});
        setDepartmentData(Object.entries(departmentCounts).map(([name, count]) => ({ name, count })));
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        setError('Failed to fetch dashboard data. Please try again.');
      } finally {
        setLoading(false);
        }
    };

    fetchData();
  }, [user, attendanceView]);

  if (loading) {
    return (
      <ContentLayout title="Dashboard">
        <div className="text-center py-8">Loading...</div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="Dashboard">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Dashboard">
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col items-center w-full max-w-[1200px]">
          <div className="flex justify-center gap-20 w-full">
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-blue-800 text-center">Confirmed</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-blue-600 text-center">{data.confirmedEmployees}</p>
              </CardContent>
            </Card>
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-purple-800 text-center">Probation</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-purple-600 text-center">{data.probationEmployees}</p>
              </CardContent>
            </Card>
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-pink-800 text-center">Contractual</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-pink-600 text-center">{data.contractualEmployees}</p>
              </CardContent>
            </Card>
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-indigo-800 text-center">Intern</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-indigo-600 text-center">{data.internEmployees}</p>
              </CardContent>
            </Card>
          </div>
          {/* Second Row: Present and Pending Leaves Cards */}
          <div className="flex justify-center gap-20 w-full mt-6">
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-green-800 text-center">Present Today</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-green-600 text-center">{data.presentToday}</p>
              </CardContent>
            </Card>
            <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardHeader className="p-2">
                <CardTitle className="text-lg font-semibold text-yellow-800 text-center">
                  {user.loginType === 'Admin' ? 'Pending Acknowledgement' : 'Pending Approvals'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <p className="text-3xl font-bold text-yellow-600 text-center">{data.pendingLeaves}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 w-full max-w-[900px]">
          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="150"
                    fill="#8884d8"
                    label
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance ({attendanceView === 'monthly' ? 'Monthly' : 'Yearly'})</CardTitle>
              <Select
                value={attendanceView}
                onValueChange={(value) => setAttendanceView(value)}
                aria-label="Select attendance view"
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Monthly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Employees by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}

export default Dashboard;
