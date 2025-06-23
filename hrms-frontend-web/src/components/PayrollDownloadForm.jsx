import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import ContentLayout from '../components/ContentLayout';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../hooks/use-toast';

const PayrollDownloadForm = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employeeId: '',
    departments: [],
    employeeTypes: [],
    fromDate: '',
    toDate: '',
    excelType: 'Type 1',
  });
  const [departments, setDepartments] = useState([]);
  const [employeeTypes] = useState([
    { value: 'Intern', label: 'Intern' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Contractual', label: 'Contractual' },
    { value: 'Probation', label: 'Probation' },
    { value: 'Apprentice', label: 'Apprentice' },
    { value: 'OJT', label: 'OJT' },
  ]);

  useEffect(() => {
    if (user?.loginType !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Access restricted to Admins only.',
      });
      return;
    }
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        const deptOptions = response.data.map((dept) => ({
          value: dept._id,
          label: dept.name,
        }));
        setDepartments(deptOptions);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch departments.',
        });
      }
    };
    fetchDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name, selectedOptions) => {
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
    }));
  };

  const handleCheckboxChange = (type) => {
    setFormData((prev) => ({ ...prev, excelType: type }));
  };

  const validateForm = () => {
    if (!formData.fromDate || !formData.toDate) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select both From Date and To Date.',
      });
      return false;
    }
    if (new Date(formData.toDate) < new Date(formData.fromDate)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'To Date cannot be earlier than From Date.',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await api.get('/payroll/download', {
        params: {
          employeeId: formData.employeeId,
          departmentIds: formData.departments.join(','),
          employeeTypes: formData.employeeTypes.join(','),
          fromDate: formData.fromDate,
          toDate: formData.toDate,
          excelType: formData.excelType,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll_${formData.excelType}_${formData.fromDate}_to_${formData.toDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Payroll Excel downloaded successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download payroll Excel.',
      });
    }
  };

  if (user?.loginType !== 'Admin') return null;

  return (
    <ContentLayout>
      <Card className="max-w-2xl mx-auto mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Payroll Download</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="Enter Employee ID (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="departments">Departments</Label>
              <Select
                id="departments"
                isMulti
                options={departments}
                onChange={(selected) => handleMultiSelectChange('departments', selected)}
                placeholder="Select departments (optional)"
                closeMenuOnSelect={false}
                className="basic-multi-select"
                classNamePrefix="select"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employeeTypes">Employee Types</Label>
              <Select
                id="employeeTypes"
                isMulti
                options={employeeTypes}
                onChange={(selected) => handleMultiSelectChange('employeeTypes', selected)}
                placeholder="Select employee types (optional)"
                closeMenuOnSelect={false}
                className="basic-multi-select"
                classNamePrefix="select"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={formData.fromDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                name="toDate"
                type="date"
                value={formData.toDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Excel Type</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="excelType1"
                    checked={formData.excelType === 'Type 1'}
                    onCheckedChange={() => handleCheckboxChange('Type 1')}
                  />
                  <Label htmlFor="excelType1">Type 1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="excelType2"
                    checked={formData.excelType === 'Type 2'}
                    onCheckedChange={() => handleCheckboxChange('Type 2')}
                  />
                  <Label htmlFor="excelType2">Type 2</Label>
                </div>
              </div>
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white mt-4">
              Download Excel
            </Button>
          </form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
};

export default PayrollDownloadForm;
