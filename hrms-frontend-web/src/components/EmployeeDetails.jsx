import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import api from '../services/api';
import { useFileHandler } from '../hooks/useFileHandler';
import { AuthContext } from '../context/AuthContext';

function EmployeeDetails({ employee, onClose, isAdmin, onLockToggle, onEmployeeUpdate }) {
  const { user } = React.useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [documentMetadata, setDocumentMetadata] = useState([]);
  const { fileSrc: profilePictureSrc, error: profilePictureError, handleViewFile: handleViewProfilePicture } = useFileHandler(employee.profilePicture);
  const [canApplyEmergencyLeave, setCanApplyEmergencyLeave] = useState(employee.canApplyEmergencyLeave || false);

  // Fetch document metadata
  useEffect(() => {
    const fetchDocumentMetadata = async () => {
      try {
        const response = await api.get(`/employees/${employee._id}/documents`);
        setDocumentMetadata(response.data);
      } catch (err) {
        console.error('Error fetching document metadata:', err);
      }
    };
    if (employee._id) {
      fetchDocumentMetadata();
    }
  }, [employee._id]);

  // Debug logging for toggle visibility
  useEffect(() => {
    console.log('User data:', {
      loginType: user?.loginType,
      role: user?.role,
      department: user?.department,
      departmentId: user?.department?._id,
    });
    console.log('Employee data:', {
      loginType: employee?.loginType,
      department: employee?.department,
      departmentId: employee?.department?._id,
      canApplyEmergencyLeave: employee?.canApplyEmergencyLeave,
    });
  }, [user, employee]);

  const formatDate = (date) => {
    return date ? new Date(date).toISOString().split('T')[0] : 'N/A';
  };

  const getDocumentLabel = (fieldname) => {
    const docLabels = {
      tenthTwelfthDocs: '10th & 12th Certificates',
      graduationDocs: 'Graduation Certificates',
      postgraduationDocs: 'Postgraduation/PhD Certificates',
      experienceCertificate: 'Experience Certificate',
      salarySlips: 'Last 3 Months Salary Slips',
      panCard: 'PAN Card',
      aadharCard: 'Aadhar Card',
      bankPassbook: 'Bank Passbook/Cancelled Cheque',
      medicalCertificate: 'Medical Fitness Certificate',
      backgroundVerification: 'Background Verification',
    };
    return docLabels[fieldname] || fieldname;
  };

  const handleEmergencyLeaveToggle = async () => {
    try {
      const response = await api.patch(`/employees/${employee._id}/emergency-leave-permission`);
      setCanApplyEmergencyLeave(response.data.canApplyEmergencyLeave);
      // Notify parent component of the update
      if (onEmployeeUpdate) {
        onEmployeeUpdate({ ...employee, canApplyEmergencyLeave: response.data.canApplyEmergencyLeave });
      }
      alert('Emergency Leave permission updated successfully');
    } catch (err) {
      console.error('Error toggling Emergency Leave permission:', err);
      alert('Failed to update Emergency Leave permission');
    }
  };

  // Determine if the toggle should be visible
  const canShowEmergencyToggle = () => {
    if (!user || !employee) {
      return false;
    }
    const userDeptId = user.department?._id?.toString();
    const employeeDeptId = employee.department?._id?.toString();
    
    if (user.loginType === 'Admin') return true;

    if (user.loginType === 'HOD' && employee.loginType === 'Employee' && userDeptId && employeeDeptId && userDeptId === employeeDeptId) {
      return true; // HOD can toggle for Employees in their department
    }
    if (user.loginType === 'CEO' && employee.loginType === 'HOD') {
      return true; // CEO can toggle for HODs
    }
    return false;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="flex justify-center mb-4">
              {profilePictureError ? (
                <p className="text-red-500">Failed to load profile picture</p>
              ) : (
                <button onClick={handleViewProfilePicture}>
                  <img
                    src={profilePictureSrc || 'https://via.placeholder.com/96?text=User'}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Employee No.:</strong> {employee.employeeId}
              </div>
              <div>
                <strong>User ID:</strong> {employee.userId}
              </div>
              <div>
                <strong>Name:</strong> {employee.name}
              </div>
              <div>
                <strong>Date of Birth:</strong> {formatDate(employee.dateOfBirth)}
              </div>
              <div>
                <strong>Father Name:</strong> {employee.fatherName}
              </div>
              <div>
                <strong>Mother Name:</strong> {employee.motherName}
              </div>
              <div>
                <strong>Mobile Number:</strong> {employee.mobileNumber}
              </div>
              <div>
                <strong>Permanent Address:</strong> {employee.permanentAddress}
              </div>
              <div>
                <strong>Current Address:</strong> {employee.currentAddress}
              </div>
              <div>
                <strong>Email:</strong> {employee.email}
              </div>
              <div>
                <strong>Aadhar Number:</strong> {employee.aadharNumber}
              </div>
              <div>
                <strong>Blood Group:</strong> {employee.bloodGroup || 'N/A'}
              </div>
              <div>
                <strong>Gender:</strong> {employee.gender}
              </div>
              <div>
                <strong>Marital Status:</strong> {employee.maritalStatus}
              </div>
              {employee.maritalStatus === 'Married' && (
                <div>
                  <strong>Spouse Name:</strong> {employee.spouseName || 'N/A'}
                </div>
              )}
              <div>
                <strong>Emergency Contact Name:</strong> {employee.emergencyContactName}
              </div>
              <div>
                <strong>Emergency Contact Number:</strong> {employee.emergencyContactNumber}
              </div>
              <div>
                <strong>Date of Joining:</strong> {formatDate(employee.dateOfJoining)}
              </div>
              <div>
                <strong>Reporting Manager:</strong> {employee.reportingManager?.name || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong> {employee.status}
              </div>
              {employee.status === 'Resigned' && (
                <div>
                  <strong>Date of Resigning:</strong> {formatDate(employee.dateOfResigning)}
                </div>
              )}
              {employee.status === 'Working' && (
                <div>
                  <strong>Employee Type:</strong> {employee.employeeType || 'N/A'}
                </div>
              )}
              {employee.status === 'Working' && employee.employeeType === 'Probation' && (
                <>
                  <div>
                    <strong>Probation Period:</strong> {employee.probationPeriod} months
                  </div>
                  <div>
                    <strong>Confirmation Date:</strong> {formatDate(employee.confirmationDate)}
                  </div>
                </>
              )}
              {employee.status === 'Working' && employee.employeeType === 'OJT' && (
                <div>
                  <strong>Service Agreement:</strong> {employee.serviceAgreement ? `${employee.serviceAgreement} months` : 'N/A'}
                </div>
              )}
              <div>
                <strong>Referred By:</strong> {employee.referredBy || 'N/A'}
              </div>
              <div>
                <strong>Login Type:</strong> {employee.loginType}
              </div>
              {canShowEmergencyToggle() && (
                <div className="col-span-2 flex items-center gap-2">
                  <label htmlFor="emergency-leave-toggle" className="text-sm font-medium">
                    Can Apply Emergency Leave
                  </label>
                  <input
                    id="emergency-leave-toggle"
                    type="checkbox"
                    checked={canApplyEmergencyLeave}
                    onChange={handleEmergencyLeaveToggle}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              )}
              {isAdmin && (
                <div className="col-span-2">
                  <Button
                    onClick={() => onLockToggle('basicInfo')}
                    className={employee.basicInfoLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  >
                    {employee.basicInfoLocked ? 'Unlock Basic Info' : 'Lock Basic Info'}
                  </Button>
                </div>
              )}
            </div>
          </>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Designation:</strong> {employee.designation}
            </div>
            <div>
              <strong>Location:</strong> {employee.location}
            </div>
            <div>
              <strong>Department:</strong> {employee.department?.name || 'N/A'}
            </div>
            {isAdmin && (
              <div className="col-span-2">
                <Button
                  onClick={() => onLockToggle('position')}
                  className={employee.positionLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {employee.positionLocked ? 'Unlock Position' : 'Lock Position'}
                </Button>
                </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>PAN Number:</strong> {employee.panNumber}
            </div>
            <div>
              <strong>PF Number:</strong> {employee.pfNumber || 'N/A'}
            </div>
            <div>
              <strong>UAN Number:</strong> {employee.uanNumber || 'N/A'}
            </div>
            <div>
              <strong>ESI Number:</strong> {employee.esiNumber || 'N/A'}
            </div>
            {isAdmin && (
              <div className="col-span-2">
                <Button
                  onClick={() => onLockToggle('statutory')}
                  className={employee.statutoryLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {employee.statutoryLocked ? 'Unlock Statutory' : 'Lock Statutory'}
                </Button>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { fieldname: 'profilePicture', label: 'Profile Picture' },
              { fieldname: 'tenthTwelfthDocs', label: '10th & 12th Certificates' },
              { fieldname: 'graduationDocs', label: 'Graduation Certificates' },
              { fieldname: 'postgraduationDocs', label: 'Postgraduation/PhD Certificates' },
              { fieldname: 'experienceCertificate', label: 'Experience Certificate' },
              { fieldname: 'salarySlips', label: 'Last 3 Months Salary Slips' },
              { fieldname: 'panCard', label: 'PAN Card' },
              { fieldname: 'aadharCard', label: 'Aadhar Card' },
              { fieldname: 'bankPassbook', label: 'Bank Passbook/Cancelled Cheque' },
              { fieldname: 'medicalCertificate', label: 'Medical Fitness Certificate' },
              { fieldname: 'backgroundVerification', label: 'Background Verification' },
            ].map((doc, index) => {
              const docMeta = documentMetadata.find(meta => meta.fieldname === doc.fieldname);
              const fileId = doc.fieldname === 'profilePicture' ? employee.profilePicture : docMeta?.id;
              return (
                <div key={index}>
                  <strong>{getDocumentLabel(doc.fieldname)}:</strong>{' '}
                  {fileId ? (
                    <FileViewer fileId={fileId} />
                  ) : (
                    'Not Uploaded'
                  )}
                </div>
              );
            })}
            {isAdmin && (
              <div className="col-span-2">
                <Button
                  onClick={() => onLockToggle('documents')}
                  className={employee.documentsLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {employee.documentsLocked ? 'Unlock Documents' : 'Lock Documents'}
                </Button>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Payment Type:</strong> {employee.paymentType}
            </div>
            {employee.paymentType === 'Bank Transfer' && (
              <>
                <div>
                  <strong>Bank Name:</strong> {employee.bankDetails?.bankName || 'N/A'}
                </div>
                <div>
                  <strong>Bank Branch:</strong> {employee.bankDetails?.bankBranch || 'N/A'}
                </div>
                <div>
                  <strong>Account Number:</strong> {employee.bankDetails?.accountNumber || 'N/A'}
                </div>
                <div>
                  <strong>IFSC Code:</strong> {employee.bankDetails?.ifscCode || 'N/A'}
                </div>
              </>
            )}
            <div>
              <strong>CTC (Annual):</strong> {employee.ctc ? `₹${employee.ctc.toLocaleString()}` : 'N/A'}
            </div>
            <div>
              <strong>Basic (Monthly):</strong> {employee.basic ? `₹${employee.basic.toLocaleString()}` : 'N/A'}
            </div>
            <div>
              <strong>In Hand (Monthly):</strong> {employee.inHand ? `₹${employee.inHand.toLocaleString()}` : 'N/A'}
            </div>
            {isAdmin && (
              <div className="col-span-2">
                <Button
                  onClick={() => onLockToggle('payment')}
                  className={employee.paymentLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {employee.paymentLocked ? 'Unlock Payment' : 'Lock Payment'}
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const FileViewer = ({ fileId }) => {
    const { handleViewFile } = useFileHandler(fileId);
    return (
      <button
        onClick={handleViewFile}
        className="text-blue-600 hover:underline"
      >
        View
      </button>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogTitle>Employee Details</DialogTitle>
        <DialogDescription>
          View the details of the employee below. Navigate through the steps to see all sections.
        </DialogDescription>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-lg border">
            <CardContent className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">
                  {step === 1 && 'Basic Information'}
                  {step === 2 && 'Employee Position'}
                  {step === 3 && 'Statutory Information'}
                  {step === 4 && 'Document Upload'}
                  {step === 5 && 'Payment Information'}
                </h2>
                <div className="flex justify-between mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={`h-2 w-1/5 rounded ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              {renderStep()}
              <div className="mt-6 flex justify-between">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Previous
                  </Button>
                )}
                <div className="flex gap-2">
                  {step < 5 && (
                    <Button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Next
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default EmployeeDetails;
