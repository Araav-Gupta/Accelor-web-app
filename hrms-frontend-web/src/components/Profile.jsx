import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';
import { useFileHandler } from '../hooks/useFileHandler';

function Profile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    employeeId: '',
    userId: '',
    name: '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    mobileNumber: '',
    permanentAddress: '',
    currentAddress: '',
    email: '',
    aadharNumber: '',
    bloodGroup: '',
    gender: '',
    maritalStatus: '',
    spouseName: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    dateOfJoining: '',
    reportingManager: { name: '' },
    status: '',
    dateOfResigning: '',
    employeeType: '',
    probationPeriod: '',
    confirmationDate: '',
    referredBy: '',
    loginType: '',
    designation: '',
    location: '',
    department: { name: '' },
    panNumber: '',
    pfNumber: '',
    uanNumber: '',
    esiNumber: '',
    documents: [],
    profilePicture: '',
    paymentType: '',
    bankDetails: {
      bankName: '',
      bankBranch: '',
      accountNumber: '',
      ifscCode: '',
    },
    locked: false,
    basicInfoLocked: false,
    positionLocked: false,
    statutoryLocked: false,
    documentsLocked: false,
    paymentLocked: false,
  });
  const [files, setFiles] = useState({
    profilePicture: null,
    tenthTwelfthDocs: null,
    graduationDocs: null,
    postgraduationDocs: null,
    experienceCertificate: null,
    salarySlips: null,
    panCard: null,
    aadharCard: null,
    bankPassbook: null,
    medicalCertificate: null,
    backgroundVerification: null,
  });
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileErrors, setFileErrors] = useState({});
  const [step, setStep] = useState(1);
  const [refresh, setRefresh] = useState(false);

  const { fileSrc: profilePictureSrc, error: profilePictureError, handleViewFile: handleViewProfilePicture } = useFileHandler(profile.profilePicture);

  const lockedFields = [
    'employeeId',
    'userId',
    'dateOfJoining',
    'reportingManager.name',
    'status',
    'probationPeriod',
    'confirmationDate',
    'loginType',
    'referredBy',
    'designation',
    'department.name',
    'paymentType',
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/employees/${user.id}`);
        setProfile({
          employeeId: res.data.employeeId || '',
          userId: res.data.userId || '',
          name: res.data.name || '',
          dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : '',
          fatherName: res.data.fatherName || '',
          motherName: res.data.motherName || '',
          mobileNumber: res.data.mobileNumber || '',
          permanentAddress: res.data.permanentAddress || '',
          currentAddress: res.data.currentAddress || '',
          email: res.data.email || '',
          aadharNumber: res.data.aadharNumber || '',
          bloodGroup: res.data.bloodGroup || '',
          gender: res.data.gender || '',
          maritalStatus: res.data.maritalStatus || '',
          spouseName: res.data.spouseName || '',
          emergencyContactName: res.data.emergencyContactName || '',
          emergencyContactNumber: res.data.emergencyContactNumber || '',
          dateOfJoining: res.data.dateOfJoining ? new Date(res.data.dateOfJoining).toISOString().split('T')[0] : '',
          reportingManager: res.data.reportingManager || { name: '' },
          status: res.data.status || '',
          dateOfResigning: res.data.dateOfResigning ? new Date(res.data.dateOfResigning).toISOString().split('T')[0] : '',
          employeeType: res.data.status === 'Working' ? res.data.employeeType || '' : '',
          probationPeriod: res.data.status === 'Working' && res.data.employeeType === 'Probation' ? res.data.probationPeriod || '' : '',
          confirmationDate: res.data.status === 'Working' && res.data.employeeType === 'Probation' ? (res.data.confirmationDate ? new Date(res.data.confirmationDate).toISOString().split('T')[0] : '') : '',
          referredBy: res.data.referredBy || '',
          loginType: res.data.loginType || '',
          designation: res.data.designation || '',
          location: res.data.location || '',
          department: res.data.department || { name: '' },
          panNumber: res.data.panNumber || '',
          pfNumber: res.data.pfNumber || '',
          uanNumber: res.data.uanNumber || '',
          esiNumber: res.data.esiNumber || '',
          documents: res.data.documents || [],
          profilePicture: res.data.profilePicture || '',
          paymentType: res.data.paymentType || '',
          bankDetails: res.data.bankDetails || { bankName: '', bankBranch: '', accountNumber: '', ifscCode: '' },
          locked: res.data.locked || false,
          basicInfoLocked: res.data.basicInfoLocked || false,
          positionLocked: res.data.positionLocked || false,
          statutoryLocked: res.data.statutoryLocked || false,
          documentsLocked: res.data.documentsLocked || false,
          paymentLocked: res.data.paymentLocked || false,
        });
        setIsLocked(res.data.locked || false);
      } catch (err) {
        console.error('Error fetching profile:', err.response?.data || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to fetch profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfile();
    } else {
      navigate('/login');
    }
  }, [user, navigate, refresh]);

  const handleChange = (e) => {
    const { name, value, files: fileList } = e.target;
    if (fileList && fileList[0]) {
      const file = fileList[0];
      const newErrors = { ...fileErrors };

      // Validate file type and size
      if (name === 'profilePicture') {
        if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
          newErrors[name] = 'Profile Picture must be a JPEG/JPG image';
        } else if (file.size > 5 * 1024 * 1024) {
          newErrors[name] = 'Profile Picture must be less than or equal to 5MB';
        } else {
          delete newErrors[name];
        }
      } else {
        if (file.type !== 'application/pdf') {
          newErrors[name] = `${name.replace(/([A-Z])/g, ' $1').trim()} must be a PDF file`;
        } else {
          const maxSize = name === 'salarySlips' || name === 'panCard' || name === 'aadharCard' || name === 'bankPassbook' ? 1 * 1024 * 1024 :
                          name === 'medicalCertificate' || name === 'backgroundVerification' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
          if (file.size > maxSize) {
            newErrors[name] = `${name.replace(/([A-Z])/g, ' $1').trim()} must be less than or equal to ${maxSize / (1024 * 1024)}MB`;
          } else {
            delete newErrors[name];
          }
        }
      }

      setFileErrors(newErrors);
      if (!newErrors[name]) {
        setFiles({ ...files, [name]: file });
      }
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile({
        ...profile,
        [parent]: { ...profile[parent], [child]: value },
      });
    } else {
      setProfile((prevProfile) => {
        const updatedProfile = { ...prevProfile, [name]: value };
        if (name === 'status') {
          updatedProfile.dateOfResigning = value === 'Working' ? '' : updatedProfile.dateOfResigning;
          updatedProfile.employeeType = value === 'Working' ? updatedProfile.employeeType : '';
          updatedProfile.probationPeriod = value === 'Working' && updatedProfile.employeeType === 'Probation' ? updatedProfile.probationPeriod : '';
          updatedProfile.confirmationDate = value === 'Working' && updatedProfile.employeeType === 'Probation' ? updatedProfile.confirmationDate : '';
        }
        if (name === 'employeeType' && value !== 'Probation') {
          updatedProfile.probationPeriod = '';
          updatedProfile.confirmationDate = '';
        }
        return updatedProfile;
      });
    }
  };

  const validateFiles = () => {
    const newErrors = {};
    const requiredFiles = [
      'tenthTwelfthDocs',
      'graduationDocs',
      'panCard',
      'aadharCard',
      'bankPassbook',
      'medicalCertificate',
      'backgroundVerification',
    ];
    requiredFiles.forEach((field) => {
      if (!profile.documents.includes(field) && !files[field]) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });
    if (files.salarySlips && !files.experienceCertificate && !profile.documents.includes('experienceCertificate')) {
      newErrors.salarySlips = 'Experience Certificate is required before uploading Salary Slips';
    }
    setFileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      alert('Profile is locked. Contact Admin to edit.');
      return;
    }

    const errors = {};
    // Basic Information Validation
    const basicFields = [
      'name', 'mobileNumber', 'dateOfBirth', 'fatherName', 'motherName',
      'permanentAddress', 'currentAddress', 'email', 'aadharNumber',
      'bloodGroup', 'gender', 'maritalStatus', 'emergencyContactName',
      'emergencyContactNumber', 'dateOfJoining', 'status',
    ];
    basicFields.forEach(field => {
      if (!profile[field] || profile[field].toString().trim() === '') {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });
    if (profile.maritalStatus === 'Married' && (!profile.spouseName || profile.spouseName.trim() === '')) {
      errors.spouseName = 'Spouse Name is required';
    }
    if (profile.status === 'Resigned' && (!profile.dateOfResigning || profile.dateOfResigning.trim() === '')) {
      errors.dateOfResigning = 'Date of Resigning is required';
    }
    if (profile.status === 'Working' && (!profile.employeeType || profile.employeeType.trim() === '')) {
      errors.employeeType = 'Employee Type is required';
    }
    if (profile.status === 'Working' && profile.employeeType === 'Probation' && (!profile.probationPeriod || !profile.confirmationDate)) {
      errors.probationPeriod = 'Probation Period is required';
      errors.confirmationDate = 'Confirmation Date is required';
    }
    if (profile.email && !/\S+@\S+\.\S+/.test(profile.email)) {
      errors.email = 'Valid email is required';
    }
    if (profile.aadharNumber && !/^\d{12}$/.test(profile.aadharNumber)) {
      errors.aadharNumber = 'Aadhar Number must be exactly 12 digits';
    }
    if (profile.mobileNumber && !/^\d{10}$/.test(profile.mobileNumber)) {
      errors.mobileNumber = 'Mobile Number must be exactly 10 digits';
    }
    if (profile.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(profile.bloodGroup)) {
      errors.bloodGroup = 'Invalid blood group';
    }

    if (Object.keys(errors).length > 0) {
      alert('Please fix the following errors:\n' + Object.values(errors).join('\n'));
      return;
    }

    if (step === 4 && !validateFiles()) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.keys(profile).forEach((key) => {
      if (key === 'department' || key === 'reportingManager' || key === 'bankDetails') {
        formData.append(key, JSON.stringify(profile[key]));
      } else if (key !== 'documents' && profile[key]) {
        formData.append(key, profile[key]);
      }
    });
    Object.keys(files).forEach((key) => {
      if (files[key]) formData.append(key, files[key]);
    });

    try {
      const res = await api.put(`/employees/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const successMessage = res.data.message || 'Profile updated successfully';
      alert(successMessage);
      setProfile({
        ...profile,
        ...res.data,
        department: res.data.department || profile.department,
        reportingManager: res.data.reportingManager || profile.reportingManager,
        bankDetails: res.data.bankDetails || profile.bankDetails,
        documents: res.data.documents || profile.documents,
        profilePicture: res.data.profilePicture || profile.profilePicture,
        locked: res.data.locked || profile.locked,
        basicInfoLocked: res.data.basicInfoLocked || profile.basicInfoLocked,
        positionLocked: res.data.positionLocked || profile.positionLocked,
        statutoryLocked: res.data.statutoryLocked || profile.statutoryLocked,
        documentsLocked: res.data.documentsLocked || profile.documentsLocked,
        paymentLocked: res.data.paymentLocked || profile.paymentLocked,
      });
      setFiles({
        profilePicture: null,
        tenthTwelfthDocs: null,
        graduationDocs: null,
        postgraduationDocs: null,
        experienceCertificate: null,
        salarySlips: null,
        panCard: null,
        aadharCard: null,
        bankPassbook: null,
        medicalCertificate: null,
        backgroundVerification: null,
      });
      setRefresh(r => !r); // Trigger refresh after successful update
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      alert(errorMessage);
      console.error('Error updating profile:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const FileViewer = ({ fileId }) => {
    const { handleViewFile } = useFileHandler(fileId);
    return (
      <button
        onClick={handleViewFile}
        className="text-blue-600 hover:underline block mt-1"
      >
        View
      </button>
    );
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
                <img
                  src={profilePictureSrc || 'https://via.placeholder.com/96?text=User'}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border border-gray-200"
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeId">Employee No.</Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={profile.employeeId}
                  onChange={handleChange}
                  disabled={lockedFields.includes('employeeId') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  name="userId"
                  type="text"
                  value={profile.userId}
                  onChange={handleChange}
                  disabled={lockedFields.includes('userId') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fatherName">Father Name</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  type="text"
                  value={profile.fatherName}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="motherName">Mother Name</Label>
                <Input
                  id="motherName"
                  name="motherName"
                  type="text"
                  value={profile.motherName}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  value={profile.mobileNumber}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="permanentAddress">Permanent Address</Label>
                <Input
                  id="permanentAddress"
                  name="permanentAddress"
                  type="text"
                  value={profile.permanentAddress}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currentAddress">Current Address</Label>
                <Input
                  id="currentAddress"
                  name="currentAddress"
                  type="text"
                  value={profile.currentAddress}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="aadharNumber">Aadhar Number</Label>
                <Input
                  id="aadharNumber"
                  name="aadharNumber"
                  type="text"
                  value={profile.aadharNumber}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={profile.bloodGroup}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 bg-white dark:bg-black"
                >
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 bg-white dark:bg-black"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <select
                  id="maritalStatus"
                  name="maritalStatus"
                  value={profile.maritalStatus}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 bg-white dark:bg-black"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </select>
              </div>
              {profile.maritalStatus === 'Married' && (
                <div>
                  <Label htmlFor="spouseName">Spouse Name</Label>
                  <Input
                    id="spouseName"
                    name="spouseName"
                    type="text"
                    value={profile.spouseName}
                    onChange={handleChange}
                    disabled={profile.basicInfoLocked}
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  value={profile.emergencyContactName}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactNumber">Emergency Contact Number</Label>
                <Input
                  id="emergencyContactNumber"
                  name="emergencyContactNumber"
                  type="tel"
                  value={profile.emergencyContactNumber}
                  onChange={handleChange}
                  disabled={profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <Input
                  id="dateOfJoining"
                  name="dateOfJoining"
                  type="date"
                  value={profile.dateOfJoining}
                  onChange={handleChange}
                  disabled={lockedFields.includes('dateOfJoining') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reportingManager.name">Reporting Manager</Label>
                <Input
                  id="reportingManager.name"
                  name="reportingManager.name"
                  type="text"
                  value={profile.reportingManager.name}
                  onChange={handleChange}
                  disabled={lockedFields.includes('reportingManager.name') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={profile.status}
                  onChange={handleChange}
                  disabled={lockedFields.includes('status') || profile.basicInfoLocked}
                  className="mt-1 block w-full rounded-md border shadow-sm bg-white dark:bg-black"
                >
                  <option value="">Select</option>
                  <option value="Working">Working</option>
                  <option value="Resigned">Resigned</option>
                </select>
              </div>
              {profile.status === 'Resigned' && (
                <div>
                  <Label htmlFor="dateOfResigning">Date of Resigning</Label>
                  <Input
                    id="dateOfResigning"
                    name="dateOfResigning"
                    type="date"
                    value={profile.dateOfResigning}
                    onChange={handleChange}
                    disabled={profile.basicInfoLocked}
                    className="mt-1"
                  />
                </div>
              )}
              {profile.status === 'Working' && (
                <>
                  <div>
                    <Label htmlFor="employeeType">Employee Type</Label>
                    <select
                      id="employeeType"
                      name="employeeType"
                      value={profile.employeeType}
                      onChange={handleChange}
                      disabled={profile.basicInfoLocked}
                      className="mt-1 block w-full rounded-md border shadow-sm bg-white dark:bg-black"
                    >
                      <option value="">Select</option>
                      <option value="Intern">Intern</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Probation">Probation</option>
                      <option value="Contractual">Contractual</option>
                    </select>
                  </div>
                  {profile.employeeType === 'Probation' && (
                    <>
                      <div>
                        <Label htmlFor="probationPeriod">Probation Period (Months)</Label>
                        <Input
                          id="probationPeriod"
                          name="probationPeriod"
                          type="text"
                          value={profile.probationPeriod}
                          onChange={handleChange}
                          disabled={lockedFields.includes('probationPeriod') || profile.basicInfoLocked}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmationDate">Confirmation Date</Label>
                        <Input
                          id="confirmationDate"
                          name="confirmationDate"
                          type="date"
                          value={profile.confirmationDate}
                          onChange={handleChange}
                          disabled={lockedFields.includes('confirmationDate') || profile.basicInfoLocked}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              <div>
                <Label htmlFor="referredBy">Referred By</Label>
                <Input
                  id="referredBy"
                  name="referredBy"
                  type="text"
                  value={profile.referredBy}
                  onChange={handleChange}
                  disabled={lockedFields.includes('referredBy') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="loginType">Login Type</Label>
                <Input
                  id="loginType"
                  name="loginType"
                  type="text"
                  value={profile.loginType}
                  onChange={handleChange}
                  disabled={lockedFields.includes('loginType') || profile.basicInfoLocked}
                  className="mt-1"
                />
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                type="text"
                value={profile.designation}
                onChange={handleChange}
                disabled={lockedFields.includes('designation') || profile.positionLocked}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                type="text"
                value={profile.location}
                onChange={handleChange}
                disabled={profile.positionLocked}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="department.name">Department</Label>
              <Input
                id="department.name"
                name="department.name"
                type="text"
                value={profile.department.name}
                onChange={handleChange}
                disabled={lockedFields.includes('department.name') || profile.positionLocked}
                className="mt-1"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                name="panNumber"
                type="text"
                value={profile.panNumber}
                onChange={handleChange}
                disabled={profile.statutoryLocked}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pfNumber">PF Number</Label>
              <Input
                id="pfNumber"
                name="pfNumber"
                type="text"
                value={profile.pfNumber}
                onChange={handleChange}
                disabled={profile.statutoryLocked}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="uanNumber">UAN Number</Label>
              <Input
                id="uanNumber"
                name="uanNumber"
                type="text"
                value={profile.uanNumber}
                onChange={handleChange}
                disabled={profile.statutoryLocked}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="esiNumber">ESI Number</Label>
              <Input
                id="esiNumber"
                name="esiNumber"
                type="text"
                value={profile.esiNumber}
                onChange={handleChange}
                disabled={profile.statutoryLocked}
                className="mt-1"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'tenthTwelfthDocs', label: '10th & 12th Certificates (PDF, 5MB)', accept: 'application/pdf' },
              { id: 'graduationDocs', label: 'Graduation Certificates (PDF, 5MB)', accept: 'application/pdf' },
              { id: 'postgraduationDocs', label: 'Postgraduation/PhD Certificates (PDF, 5MB, Optional)', accept: 'application/pdf' },
              { id: 'experienceCertificate', label: 'Experience Certificate (PDF, 5MB, Optional)', accept: 'application/pdf' },
              { id: 'salarySlips', label: 'Last 3 Months Salary Slips (PDF, 1MB)', accept: 'application/pdf', conditional: true },
              { id: 'panCard', label: 'PAN Card (PDF, 1MB)', accept: 'application/pdf' },
              { id: 'aadharCard', label: 'Aadhar Card (PDF, 1MB)', accept: 'application/pdf' },
              { id: 'bankPassbook', label: 'Bank Passbook/Cancelled Cheque (PDF, 1MB)', accept: 'application/pdf' },
              { id: 'medicalCertificate', label: 'Medical Fitness Certificate (PDF, 2MB)', accept: 'application/pdf' },
              { id: 'backgroundVerification', label: 'Background Verification (PDF, 2MB)', accept: 'application/pdf' },
              { id: 'profilePicture', label: 'Profile Picture', accept: 'image/jpeg,image/jpg' },
            ].map((doc, index) => (
              <div key={index} className={doc.conditional && !profile.documents.includes('experienceCertificate') && !files.experienceCertificate ? 'hidden' : ''}>
                <Label htmlFor={doc.id}>{doc.label}</Label>
                {profile.documents.includes(doc.id) || (doc.id === 'profilePicture' && profile.profilePicture) ? (
                  doc.id === 'profilePicture' ? (
                    <button
                      onClick={handleViewProfilePicture}
                      className="text-blue-600 hover:underline block mt-1"
                    >
                      View
                    </button>
                  ) : (
                    <FileViewer fileId={profile[doc.id] || profile.documents.find(id => id === doc.id)} />
                  )
                ) : (
                  <>
                    <Input
                      id={doc.id}
                      name={doc.id}
                      type="file"
                      accept={doc.accept}
                      onChange={handleChange}
                      disabled={profile.documentsLocked}
                      className={fileErrors[doc.id] ? 'border-red-500 mt-1' : 'mt-1'}
                      required={doc.id !== 'postgraduationDocs' && doc.id !== 'experienceCertificate' && (!doc.conditional || (profile.documents.includes('experienceCertificate') || files.experienceCertificate))}
                    />
                    {fileErrors[doc.id] && <p className="mt-1 text-sm text-red-500">{fileErrors[doc.id]}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <select
                id="paymentType"
                name="paymentType"
                value={profile.paymentType}
                onChange={handleChange}
                disabled={lockedFields.includes('paymentType') || profile.paymentLocked}
                className="mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 bg-white dark:bg-black"
              >
                <option value="">Select</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            {profile.paymentType === 'Bank Transfer' && (
              <>
                <div>
                  <Label htmlFor="bankDetails.bankName">Bank Name</Label>
                  <Input
                    id="bankDetails.bankName"
                    name="bankDetails.bankName"
                    type="text"
                    value={profile.bankDetails.bankName}
                    onChange={handleChange}
                    disabled={profile.paymentLocked}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bankDetails.bankBranch">Bank Branch</Label>
                  <Input
                    id="bankDetails.bankBranch"
                    name="bankDetails.bankBranch"
                    type="text"
                    value={profile.bankDetails.bankBranch}
                    onChange={handleChange}
                    disabled={profile.paymentLocked}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bankDetails.accountNumber">Account Number</Label>
                  <Input
                    id="bankDetails.accountNumber"
                    name="bankDetails.accountNumber"
                    type="text"
                    value={profile.bankDetails.accountNumber}
                    onChange={handleChange}
                    disabled={profile.paymentLocked}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bankDetails.ifscCode">IFSC Code</Label>
                  <Input
                    id="bankDetails.ifscCode"
                    name="bankDetails.ifscCode"
                    type="text"
                    value={profile.bankDetails.ifscCode}
                    onChange={handleChange}
                    disabled={profile.paymentLocked}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ContentLayout title="Profile">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="Profile">
        <p className="text-red-500">{error}</p>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Profile">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="shadow-lg border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
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
                    type="submit"
                    disabled={isLocked || loading}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </ContentLayout>
  );
}

export default Profile;
