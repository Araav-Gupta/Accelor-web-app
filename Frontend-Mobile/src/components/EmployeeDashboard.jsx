import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  Image,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext.jsx';
import { BarChart } from 'react-native-chart-kit';
import AttendanceChart from './AttendanceChart';
import { Dimensions } from 'react-native';
import io from 'socket.io-client';
import api, {fetchFileAsBlob} from '../services/api.js';
import * as FileSystem from 'expo-file-system';

function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const [userName, setUserName] = useState('');
  const [designation, setDesignation] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [data, setData] = useState({
    attendanceData: [],
    leaveDaysTaken: { monthly: 0, yearly: 0 },
    paidLeavesRemaining: 0,
    unpaidLeavesTaken: 0,
    overtimeHours: 0,
    restrictedHolidays: 0,
    medicalLeaves: 0,
    // compensatoryAvailable: [],
    unclaimedOTRecords: [],
  });

  const [attendanceView, setAttendanceView] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  // const { fileSrc: profilePictureSrc, error: profilePictureError, handleViewFile: handleViewProfilePicture } = useFileHandler(user.profilePicture);
  const [profileUri, setProfileUri] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Change the stauts as per updates
  const calculateAttendanceStats = useCallback(() => {
    if (!Array.isArray(data.attendanceData)) return { present: 0, absent: 0, leave: 0 };
    const stats = { present: 0, absent: 0, leave: 0, half: 0 };
    data.attendanceData.forEach(day => {
      if (day.status === 'present') stats.present++;
      else if (day.status === 'absent') stats.absent++;
      else if (day.status === 'half') stats.half++;
      else if (day.status === 'leave') stats.leave++;
    });
    return stats;
  }, [data.attendanceData]);

  const formatNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const calculateLeaveStats = useCallback(() => {
    const stats = {
      paid: formatNumber(data.paidLeavesRemaining),
      unpaid: formatNumber(data.unpaidLeavesTaken),
      medical: formatNumber(data.medicalLeaves),
      restricted: formatNumber(data.restrictedHolidays)
    };

    return stats;
  }, [data]);

  const handleViewToggle = useCallback((view) => {
    setAttendanceView(view);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.employeeId) return;
    try {
      setLoading(true);
      setError(null);
      setUserName(user.name);
      setDesignation(user.designation);

      const employeeRes = await api.get('/dashboard/employee-info');
      const { paidLeaves, employeeType, restrictedHolidays, medicalLeaves} = employeeRes.data;

      const eligibleDepartments = ['Production', 'Testing', 'AMETL', 'Admin'];
      const isDeptEligible = user.department.name && eligibleDepartments.includes(user.department.name);
      setIsEligible(isDeptEligible);

      // Get current date for reference
      const today = new Date();
      let fromDate, toDate;

      if (attendanceView === 'monthly') {
        // Monthly view shows full month
        // If current month, limit to today
        if (today.getMonth() === new Date().getMonth()) {
          fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
          toDate = new Date(today);
          toDate.setHours(23, 59, 59, 999);
        } else {
          // For previous months, show full month
          fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
          toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
      } else {
        // Yearly view
        // If current year, limit to today
        if (today.getFullYear() === new Date().getFullYear()) {
          fromDate = new Date(today.getFullYear(), 0, 1);
          toDate = new Date(today);
          toDate.setHours(23, 59, 59, 999);
        } else {
          // For previous years, show full year
          fromDate = new Date(today.getFullYear(), 0, 1);
          toDate = new Date(today.getFullYear(), 11, 31);
        }
      }

      // Fetch attendance data with current view
      const attendanceRecords = await api.get(`/dashboard/employee-stats?attendanceView=${attendanceView}&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);
      // Fetch yearly leave data
      const yearlyFromDate = new Date(today.getFullYear(),0,1);  //Start of the year
      const yearlyToDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); //End of the year
      const leaveData = await api.get(`/dashboard/employee-stats?attendanceView=yearly&fromDate=${yearlyFromDate.toISOString()}&toDate=${yearlyToDate.toISOString()}`);

      // Update state with fetched data
      const newData = {
        attendanceData: attendanceRecords.data.attendanceData || [],
        leaveDaysTaken: leaveData.data.yearly, // Using yearly leave days taken
        paidLeavesRemaining: employeeType === 'Confirmed' ? paidLeaves : 0, // Single number value
        unpaidLeavesTaken: leaveData.data.unpaidLeavesTaken || 0,
        restrictedHolidays: restrictedHolidays || 0,
        medicalLeaves: medicalLeaves || 0,
        // compensatoryAvailable: leaveData.data.compensatoryAvailable || [],
      };

      if (isDeptEligible) {
        // Add OT records if eligible
        newData.unclaimedOTRecords = leaveData.data.unclaimedOTRecords || [];
        console.log('Fetchend unclaimed OT Records:', {
          unclaimed: newData.unclaimedOTRecords
        })
      } else {
        // Ensure empty arrays if not eligible
        newData.unclaimedOTRecords = [];
      }

      setData(newData);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [attendanceView]);

  const handleClaimOT = async (record) => {
    try {
      setClaimingId(record._id);

      const response = await api.post('/ot', {
        date: record.date,
        hours: parseFloat(record.hours),
        projectDetails: {
          projectName: 'Regular Work',
          description: 'Overtime claim'
        },
        claimType: 'overtime'
      });

      // Refresh dashboard data to show updated records
      await fetchData();

      Alert.alert('Success', 'OT claim submitted successfully!');
    } catch (error) {
      console.error('Error claiming OT:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit OT claim');
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    const loadProfilePicture = async () => {
      if (!user?.profilePicture) return;
      setProfileLoading(true);

      try {
        const cacheDir = `${FileSystem.cacheDirectory}downloaded_files/`;
        const extension = 'jpg'; // or png if you're using that
        const filePath = `${cacheDir}${user.profilePicture}.${extension}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        const isCacheValid = fileInfo.exists && Date.now() - fileInfo.modificationTime * 1000 < 24 * 60 * 60 * 1000 && fileInfo.size > 0;

        if (isCacheValid) {
          console.log('Using cached profile picture');
          setProfileUri(filePath);
        } else {
          console.log('Downloading new profile picture');
          const path = await fetchFileAsBlob(user.profilePicture, `profile.${extension}`);
          setProfileUri(path);
        }
      } catch (err) {
        console.error('Failed to load profile picture:', err.message);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfilePicture();
  }, [user?.profilePicture]);

  // Check this if this is works and if required
  useEffect(() => {
    if (!user?.employeeId) return;
    fetchData();

    const socketInstance = io(process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.34:5001/api', {
      query: { employeeId: user.employeeId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketInstance.on('dashboard-update', fetchData);

    setSocket(socketInstance);
    return () => socketInstance.disconnect();

  }, [user?.employeeId, fetchData]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6b21a8" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={fetchData} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={true}
        bounces={true}
        showsVerticalScrollIndicator={true}>
        <View style={styles.profileSection}>
          <View style={styles.profileContainer}>
            {user?.profilePicture ? (
                profileLoading ? (
                  <ActivityIndicator size="small" color="#0000ff" />
                ) : profileUri ? (
                  <Image source={{ uri: profileUri }} style={styles.profileImage} />
                ) : (
                  <MaterialIcons name="person" size={50} color="#666666" style={styles.defaultIcon} />
                )  
            ) : (
              <MaterialIcons name="person" size={50} color="#666666" style={styles.defaultIcon} />
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{userName || user?.name}</Text>
              <Text style={styles.designation}>{designation || user?.designation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <View style={styles.viewToggleContainer}>
              {['monthly', 'yearly'].map(view => (
                <TouchableOpacity
                  key={view}
                  style={[styles.viewToggle, attendanceView === view && styles.viewToggleActive]}
                  onPress={() => handleViewToggle(view)}
                >
                  <Text style={[styles.viewToggleText, attendanceView === view && styles.viewToggleTextActive]}>
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {Array.isArray(data.attendanceData) && data.attendanceData.length > 0 ? (
            <AttendanceChart attendanceData={data.attendanceData} /> // Update AttendanceChart usage
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No attendance data available</Text>
              <Button title="Refresh" onPress={fetchData} />
            </View>
          )}
          {(() => {
            const stats = calculateLeaveStats();
            return (
              <BarChart
                data={{
                  labels: ["Paid Remaining", "Unpaid Taken", "Medical Remaining", "Restricted Remaining"],
                  datasets: [{
                    data: [
                      stats.paid,
                      stats.unpaid,
                      stats.medical,
                      stats.restricted
                    ]
                  }]
                }}
                width={Dimensions.get("window").width - 40}
                height={400}
                chartConfig={{
                  backgroundColor: "#4c8c4a",
                  backgroundGradientFrom: "#81c784",
                  backgroundGradientTo: "#a5d6a7",
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  barPercentage: 0.7,
                  propsForBackgroundLines: {
                    stroke: "#e0e0e0"
                  },
                  fillShadowGradient: "#2e7d32",
                  fillShadowGradientOpacity: 1,
                  // propsForLabels: {
                  //   dx: -20,
                  //   dy: 0,
                  //   rotation: -45,
                  //   anchor: 'end',
                  // },
                  // X-axis labels (horizontal) will be rotated
                  // Y-axis labels (vertical) will remain horizontal
                  propsForHorizontalLabels: {
                    rotation: 0
                  },
                  propsForVerticalLabels: {
                    dx: -20,
                    dy: 0,
                    rotation: -45,
                    anchor: 'end'
                  }
                }}
                withHorizontalLabels={true}
                withVerticalLabels={true}
                segments={4}
                style={{
                  padding: 10,
                  marginVertical: 8,
                  borderRadius: 16,
                  alignSelf: 'center'
                }}
                fromZero={true}
                showBarTops={true}
                verticalLabelRotation={0}
              />
            );
          })()}
        </View>

        {isEligible && (
          <View style={styles.otContainer}>
            <Text style={styles.sectionTitle}>Pending OT Claims</Text>
            {data.unclaimedOTRecords && (() => {
              console.log('Original unclaimedOTRecords:', data.unclaimedOTRecords);

              const claimableRecords = data.unclaimedOTRecords
                .filter(record => {
                  // Convert hours to number and ensure it's at least 1
                  const hoursNum = parseFloat(record.hours) || 0;
                  const hasValidHours = hoursNum >= 1;

                  // Calculate deadline (end of next day if no specific deadline)
                  const recordDate = new Date(record.date);
                  const deadline = record.claimDeadline
                    ? new Date(record.claimDeadline)
                    : new Date(recordDate.setDate(recordDate.getDate() + 1)); // End of next day

                  const currentTime = new Date();
                  const isBeforeDeadline = deadline >= currentTime;

                  const isClaimable = hasValidHours && isBeforeDeadline;

                  if (isClaimable) {
                    console.log('Claimable Record:', {
                      id: record._id,
                      date: record.date,
                      hours: record.hours,
                      hoursNum: hoursNum,
                      deadline: deadline.toISOString(),
                      currentTime: currentTime.toISOString(),
                      isClaimable
                    });
                  }

                  return isClaimable;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by most recent first

              console.log('Filtered claimableRecords:', claimableRecords);

              return claimableRecords.length > 0 ? (
                claimableRecords.map((record, index) => (
                  <View key={`unclaimed-${index}`} style={styles.otRecord}>
                    <View style={styles.otRecordLeft}>
                      <Text style={styles.otRecordDate}>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                      <Text style={styles.otRecordDeadline}>
                        Claim by: {record.claimDeadline
                          ? new Date(record.claimDeadline).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'End of next day' // Default text when claimDeadline is null
                        }
                      </Text>
                    </View>
                    <View style={styles.otRecordRight}>
                      <Text style={styles.otRecordHours}>{record.hours} hrs</Text>
                      <TouchableOpacity
                        style={[
                          styles.claimButton,
                          (claimingId === record._id || (record.claimDeadline && new Date(record.claimDeadline) < new Date())) &&
                          styles.claimButtonDisabled
                        ]}
                        onPress={() => handleClaimOT(record)}
                        disabled={claimingId === record._id || (record.claimDeadline && new Date(record.claimDeadline) < new Date())}
                      >
                        {claimingId === record._id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.claimButtonText}>
                            {record.claimDeadline && new Date(record.claimDeadline) < new Date() ? 'Expired' : 'Claim'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noRecordsText}>No pending OT claims found</Text>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: '#6b21a8',
    marginTop: 20,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 10,
    padding: 0,
  },
  profileContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileImage: {
    width: 60,
    height: 70,
    borderRadius: 50,
    marginBottom: 20,
    marginRight: 20,
    marginLeft: 10,
    marginTop: 20,
    flex: 1,

  },
  defaultIcon: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',

  },
  nameContainer: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 2,
  },

  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  designation: {
    fontSize: 14,
    color: '#64748b',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  viewToggle: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewToggleActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: '#6b21a8',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5

  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    marginRight: 16,

  },
  otContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  otRecordLeft: {
    flex: 1,
    marginRight: 10,
  },
  otRecordRight: {
    alignItems: 'flex-end',
  },
  otRecordDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  otRecordDeadline: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  otRecordHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  claimButton: {
    backgroundColor: '#6b21a8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  claimButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  noRecordsText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  otRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  otRecordDate: {
    color: '#475569'
  },
  otRecordHours: {
    color: '#1e293b',
    fontWeight: '600'
  },
  loadingText: {
    marginTop: 8,
    color: '#475569'
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center'
  },
});

export default EmployeeDashboard;
