import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import api from '../services/api';
import ContentLayout from './ContentLayout';

function GenerateLetters() {
  //const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employeeId: '',
    letterType: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees');
        setEmployees(response.data);
      } catch (err) {
        console.error('Error fetching employees:', err);
        alert('Failed to load employees');
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.employeeId) return 'Please select an employee';
    if (!form.letterType) return 'Please select a letter type';
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/employees/generate-letter', {
        employeeId: form.employeeId,
        letterType: form.letterType,
      }, {
        responseType: 'blob', // Expect binary data
      });
      
      // Trigger download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.letterType}_${form.employeeId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('Letter generated successfully');
    } catch (err) {
      console.error('Letter generation error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'An error occurred while generating the letter';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContentLayout title="Generate Letters">
      <Card className="max-w-lg mx-auto shadow-lg border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="employeeId">Select Employee</Label>
              <Select
                onValueChange={value => handleChange('employeeId', value)}
                value={form.employeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="letterType">Letter Type</Label>
              <Select
                onValueChange={value => handleChange('letterType', value)}
                value={form.letterType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select letter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appointment Letter</SelectItem>
                  <SelectItem value="confidentiality">Confidentiality Agreement</SelectItem>
                  <SelectItem value="training">Training Agreement</SelectItem>
                  <SelectItem value="service">Service Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-center mt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Generating...' : 'Generate Letter'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default GenerateLetters;
