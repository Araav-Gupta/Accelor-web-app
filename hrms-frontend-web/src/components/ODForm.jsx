import React, { useState, useContext } from 'react';
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function ODForm() {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    dateOut: '',
    timeOut: '',
    dateIn: '',
    timeIn: '',
    purpose: '',
    placeUnitVisit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.dateOut) return 'Date Out is required';
    if (!form.timeOut) return 'Time Out is required';
    if (!form.dateIn) return 'Date In is required';
    if (new Date(form.dateOut) > new Date(form.dateIn)) {
      return 'Date Out must be before or equal to Date In';
    }
    if (!form.purpose) return 'Purpose is required';
    if (!form.placeUnitVisit) return 'Place/Unit Visit is required';
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
      const odData = {
        dateOut: form.dateOut,
        timeOut: form.timeOut,
        dateIn: form.dateIn,
        timeIn: form.timeIn,
        purpose: form.purpose,
        placeUnitVisit: form.placeUnitVisit,
        user: user.id,
      };
      await api.post('/od', odData);
      alert('OD request submitted successfully');
      setForm({
        dateOut: '',
        timeOut: '',
        dateIn: '',
        timeIn: '',
        purpose: '',
        placeUnitVisit: '',
      });
    } catch (err) {
      console.error('OD submit error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'An error occurred while submitting the OD request';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContentLayout title="Apply for OD">
      <Card className="max-w-lg mx-auto shadow-lg border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="dateOut">Date Out</Label>
              <Input
                id="dateOut"
                name="dateOut"
                type="date"
                value={form.dateOut}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="timeOut">Time Out</Label>
              <Input
                id="timeOut"
                name="timeOut"
                type="time"
                value={form.timeOut}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="dateIn">Date In</Label>
              <Input
                id="dateIn"
                name="dateIn"
                type="date"
                value={form.dateIn}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="timeIn">Time In</Label>
              <Input
                id="timeIn"
                name="timeIn"
                type="time"
                value={form.timeIn}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                rows={3}
                placeholder="Enter purpose..."
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="placeUnitVisit">Place/Unit Visit</Label>
              <Input
                id="placeUnitVisit"
                name="placeUnitVisit"
                type="text"
                value={form.placeUnitVisit}
                onChange={handleChange}
                placeholder="Enter place/unit visit"
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Note</Label>
              <div className="mt-1 text-sm text-gray-600 bg-gray-100 p-4 rounded">
                <p><strong>Important Notes:</strong></p>
                <ol className="list-decimal pl-5">
                  <li>Person on OD should submit daily report to their immediate Head via email at contact@accelorindia.com.</li>
                  <li>Submit a report/PPT on returning back to immediate Head and O/o Admin.</li>
                  <li>Person on OD should submit their duly signed TA Bills to O/o Admin within two days of joining the office.</li>
                </ol>
              </div>
            </div>
            <div className="col-span-2 flex justify-center mt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Submitting...' : 'Submit OD'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default ODForm;