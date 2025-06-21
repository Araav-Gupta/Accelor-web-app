import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import EmployeeDetails from './EmployeeDetails';
import EmployeeUpdateForm from './EmployeeUpdateForm';
import Pagination from './Pagination';

function EmployeeList() {
  console.log('EmployeeList component rendered');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const initialFilters = useMemo(
    () => ({
      departmentId: user?.loginType === 'HOD' && user?.department ? user.department._id : 'all',
    }),
    [user]
  );
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(initialFilters.departmentId);
  const [departments, setDepartments] = useState([]);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loginType, setLoginType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user details
        const userRes = await api.get('/auth/me').catch(err => {
          console.error('Error fetching user:', err.response?.data || err.message);
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch user details.');
        });
        const userLoginType = userRes.data.loginType || '';
        setLoginType(userLoginType);
        console.log('User fetched:', userRes.data);

        // Fetch employees based on role
        const endpoint = userLoginType === 'HOD' ? '/employees/department' : '/employees';
        const params = userLoginType === 'HOD' ? {} : { departmentId: departmentFilter === 'all' ? undefined : departmentFilter };
        const empRes = await api.get(endpoint, { params }).catch(err => {
          console.error('Error fetching employees:', err.response?.data || err.message);
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch employees. Please try again later.');
        });
        setEmployees(empRes.data);
        console.log('Employees fetched:', empRes.data.map(emp => ({
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
        })));

        // Fetch departments (only for Admin and CEO)
        if (['Admin', 'CEO'].includes(userLoginType)) {
          try {
            const deptRes = await api.get('/departments');
            const validDepartments = deptRes.data.filter(dept => dept._id && dept.name.trim() !== '');
            setDepartments(validDepartments);
            console.log('Departments fetched:', validDepartments);
          } catch (err) {
            console.error('Error fetching departments:', err.response?.data || err.message);
            if (err.response?.status === 401) {
              localStorage.removeItem('token');
              navigate('/login');
              throw new Error('not_authenticated');
            } else if (err.response?.status === 403) {
              setError('Access denied: Cannot fetch departments. Department filter unavailable.');
            } else {
              setError('Failed to fetch departments. Department filter may be unavailable.');
            }
          }
        } else if (userLoginType === 'HOD' && user?.department) {
          setDepartments([{ _id: user.department._id, name: user.department.name }]);
        }

      } catch (err) {
        if (err.message !== 'not_authenticated') {
          console.error('Fetch error:', err);
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, departmentFilter, user]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (search) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (loginType !== 'HOD' && departmentFilter && departmentFilter !== 'all') {
      filtered = filtered.filter(emp => {
        if (!emp.department || !emp.department._id) {
          console.log(`Employee ${emp.employeeId} has no department:`, emp.department);
          return false;
        }
        const matchesDepartment = emp.department._id.toString() === departmentFilter;
        if (!matchesDepartment) {
          console.log(`Employee ${emp.employeeId} does not match department ${departmentFilter}:`, emp.department);
        }
        return matchesDepartment;
      });
    }
    console.log('Filtered employees:', filtered.map(emp => ({
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
    })));
    return filtered;
  }, [employees, search, departmentFilter, loginType]);

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setEmployees(employees.filter(emp => emp._id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err.response?.data || err.message);
      setError('Failed to delete employee. Please try again.');
    }
  };

  const handleViewDetails = async (employee) => {
    try {
      let fullEmployee = employee;
      // For HOD, fetch full employee details
      if (loginType === 'HOD') {
        const response = await api.get(`/employees/${employee._id}`);
        fullEmployee = response.data;
        console.log('Full employee details fetched for HOD:', {
          employeeId: fullEmployee.employeeId,
          name: fullEmployee.name,
          department: fullEmployee.department,
          loginType: fullEmployee.loginType,
        });
      }
      setSelectedEmployeeForDetails(fullEmployee);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching full employee details:', err.response?.data || err.message);
      setError('Failed to load employee details. Please try again.');
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetails(false);
    setSelectedEmployeeForDetails(null);
  };

  const handleUpdateSuccess = (updatedEmployee) => {
    console.log('handleUpdateSuccess called, updatedEmployee:', updatedEmployee);

    // Ensure department is populated
    if (typeof updatedEmployee.department === 'string') {
      updatedEmployee.department = departments.find(d => d._id === updatedEmployee.department);
    }

    setEmployees((prevEmployees) =>
      prevEmployees.map(emp =>
        emp._id === updatedEmployee._id ? { ...emp, ...updatedEmployee } : emp
      )
    );
  };

  const handleEmployeeUpdate = (updatedEmployee) => {
    console.log('handleEmployeeUpdate called, updatedEmployee:', updatedEmployee);
    setEmployees((prevEmployees) =>
      prevEmployees.map(emp =>
        emp._id === updatedEmployee._id ? { ...emp, ...updatedEmployee } : emp
      )
    );
    setSelectedEmployeeForDetails(updatedEmployee);
  };

  const handleFilter = () => {
    setCurrentPage(1);
    // Trigger re-fetch by updating dependency in useEffect
  };

  const hodDepartmentName =
    loginType === 'HOD' && user?.department
      ? departments.find((dep) => dep._id === user.department._id)?.name || 'Unknown'
      : '';

  console.log('Rendering EmployeeList, loading:', loading, 'error:', error, 'employees:', employees.length);

  if (loading) {
    return (
      <ContentLayout title="Employee List">
        <div className="w-full max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 max-w-sm" />
            <Skeleton className="h-10 max-w-sm" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </ContentLayout>
    );
  }

  if (error && employees.length === 0) {
    return (
      <ContentLayout title="Employee List">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-red-500">{error}</p>
        </div>
      </ContentLayout>
    );
  }

  try {
    return (
      <ContentLayout title="Employee List">
        <div className="w-full max-w-6xl mx-auto">
          {error && (
            <p className="text-yellow-500 mb-4">{error}</p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or ID"
                value={search}
                onChange={(e) => {
                  console.log('Search input changed:', e.target.value);
                  setSearch(e.target.value);
                }}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="departmentId">Department</Label>
              {loginType === 'HOD' ? (
                <Input
                  id="departmentId"
                  value={hodDepartmentName}
                  readOnly
                  className="mt-1 border-gray-300 bg-gray-100 cursor-not-allowed"
                  placeholder="Your Department"
                />
              ) : (
                <Select
                  onValueChange={(value) => {
                    setDepartmentFilter(value);
                    handleFilter();
                  }}
                  value={departmentFilter}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="departmentId"
                    className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dep) => (
                      <SelectItem key={dep._id} value={dep._id}>
                        {dep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </motion.div>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 bg-gray-100 rounded-lg">
              <p className="text-lg font-semibold text-gray-700">No employees found.</p>
              {departmentFilter !== 'all' && loginType !== 'HOD' && (
                <p className="text-sm text-gray-500 mt-2">
                  The selected department may not match any employees. Try selecting "All Departments".
                </p>
              )}
              {filteredEmployees.length === 0 && employees.length > 0 && departmentFilter === 'all' && (
                <p className="text-sm text-red-500 mt-2">
                  Warning: Some employees may not have a valid department assigned.
                </p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map(emp => (
                    <TableRow key={emp._id}>
                      <TableCell>{emp.employeeId}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.department?.name || 'N/A'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          onClick={() => handleViewDetails(emp)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          View
                        </Button>
                        {loginType === 'Admin' && (
                          <>
                            <EmployeeUpdateForm
                              employee={emp}
                              onUpdate={handleUpdateSuccess}
                            />
                            <Button
                              onClick={() => handleDelete(emp._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredEmployees.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
          {showDetails && selectedEmployeeForDetails && (
            <EmployeeDetails
              employee={selectedEmployeeForDetails}
              onClose={handleCloseDetailsModal}
              isAdmin={loginType === 'Admin'}
              onLockToggle={async (section) => {
                try {
                  const response = await api.patch(`/employees/${selectedEmployeeForDetails._id}/lock-section`, { section });
                  setSelectedEmployeeForDetails(response.data);
                  setEmployees(employees.map(emp => emp._id === response.data._id ? response.data : emp));
                } catch (err) {
                  console.error('Error toggling section lock:', err.response?.data || err.message);
                  setError('Failed to toggle section lock. Please try again.');
                }
              }}
              onEmployeeUpdate={handleEmployeeUpdate}
            />
          )}
        </div>
      </ContentLayout>
    );
  } catch (err) {
    console.error('Rendering error in EmployeeList:', err);
    return <div>Error rendering EmployeeList: {err.message}</div>;
  }
}

export default EmployeeList;
