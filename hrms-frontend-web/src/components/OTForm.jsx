import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

function OTForm({ open, onOpenChange, otRecord, onClaimSuccess }) {
  const { toast } = useToast();
  const [claimType, setClaimType] = useState('Full');
  const [projectDetails, setProjectDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (type) => {
    // Toggle claimType to the selected type
    setClaimType(type);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!projectDetails) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Project details are required.',
    });
    return;
  }

  setIsSubmitting(true);
  const payload = {
    date: otRecord.date,
    hours: Number(otRecord.hours),
    projectDetails,
    claimType: Number(otRecord.hours) >= 4 ? claimType : undefined,
  };

  console.log('Submitting OT with payload:', payload);

  try {
    const response = await api.post('/ot', payload);
    toast({
      title: 'Success',
      description: 'OT claim submitted successfully!',
    });
    onClaimSuccess(response.data);
    onOpenChange(false);
  } catch (error) {
    console.error('OT Claim Error:', error.response?.data || error.message);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.response?.data?.error || error.response?.data?.message || 'Failed to submit OT claim.',
    });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Apply for Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Display pre-filled data */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                value={new Date(otRecord?.date).toLocaleDateString() || ''}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label>Day</Label>
              <Input
                value={otRecord?.day || ''}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                value={otRecord?.hours || ''}
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            {/* Claim Type for OT ≥ 4 hours */}
            {otRecord?.hours >= 4 && (
              <div className="space-y-2">
                <Label>Claim Type</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="full"
                      checked={claimType === 'Full'}
                      onCheckedChange={() => handleCheckboxChange('Full')}
                    />
                    <Label htmlFor="full">Claim Full (Payment)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="partial"
                      checked={claimType === 'Partial'}
                      onCheckedChange={() => handleCheckboxChange('Partial')}
                    />
                    <Label htmlFor="partial">Claim Partial (Payment + Compensatory)</Label>
                  </div>
                </div>
              </div>
            )}
            {/* Project Details */}
            <div className="space-y-2">
              <Label htmlFor="projectDetails">Project Details</Label>
              <Input
                id="projectDetails"
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                placeholder="Enter project details"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OTForm;
