import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../components/ui/select';

function PunchMissedForm() {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    punchMissedDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), // YYYY-MM-DD in IST
    when: 'Time IN',
    yourInput: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    const checkSubmissionLimit = async () => {
      try {
        const res = await api.get('/punch-missed/check-limit');
        setCanSubmit(res.data.canSubmit);
        if (!res.data.canSubmit) {
          setError('You have already submitted a Punch Missed Form this month.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to check submission limit');
      }
    };
    if (user) {
      checkSubmissionLimit();
    }
  }, [user]);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Submission limit reached for this month.');
      return;
    }
    const punchMissedDateIST = new Date(formData.punchMissedDate);
    if (isNaN(punchMissedDateIST)) {
      setError('Invalid Punch Missed Date format.');
      return;
    }
    const todayIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    if (punchMissedDateIST > new Date(todayIST)) {
      setError('Punch Missed Date cannot be in the future.');
      return;
    }
    if (!/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(formData.yourInput)) {
      setError('Your Input must be in valid time format (e.g., 09:30 AM).');
      return;
    }
    setLoading(true);
    try {
      await api.post('/punch-missed', formData);
      setSuccess('Punch Missed Form submitted successfully.');
      setFormData({
        punchMissedDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        when: 'Time IN',
        yourInput: '',
      });
      setCanSubmit(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentLayout title="Punch Missed Form">
      <Card className="w-full mx-auto shadow-lg border">
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="punchMissedDate">Punch Missed Date</Label>
              <Input
                id="punchMissedDate"
                name="punchMissedDate"
                type="date"
                value={formData.punchMissedDate}
                onChange={(e) => handleChange('punchMissedDate', e.target.value)}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || !canSubmit}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="when">When</Label>
              <Select
                onValueChange={(value) => handleChange('when', value)}
                value={formData.when}
                disabled={loading || !canSubmit}
              >
                <SelectTrigger
                  id="when"
                  className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                >
                  <SelectValue placeholder="Select Time" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="Time IN">Time IN</SelectItem>
                  <SelectItem value="Time OUT">Time OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="yourInput">Your Input (e.g., 09:30 AM)</Label>
              <Input
                id="yourInput"
                name="yourInput"
                value={formData.yourInput}
                onChange={(e) => handleChange('yourInput', e.target.value)}
                placeholder="Enter time (e.g., 09:30 AM)"
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || !canSubmit}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="adminInput">Admin Input</Label>
              <Input
                id="adminInput"
                name="adminInput"
                value=""
                readOnly
                className="mt-1 border-gray-300 bg-gray-100 cursor-not-allowed"
                placeholder="To be filled by Admin"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white"
                disabled={loading || !canSubmit}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </motion.form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default PunchMissedForm;
