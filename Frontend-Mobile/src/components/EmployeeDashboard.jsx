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
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import io from 'socket.io-client';
import api from '../services/api.js';

function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const [userName, setUserName] = useState('');
  const [designation, setDesignation] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [data, setData] = useState({
    attendanceData: [],
    leaveDaysTaken: { monthly: 0, yearly: 0 },
    paidLeavesRemaining: { monthly: 0, yearly: 0 },
    unpaidLeavesTaken: 0,
    overtimeHours: 0,
    restrictedHolidays: 0,
    compensatoryLeaves: 0,
    compensatoryAvailable: [],
    otClaimRecords: [],
    unclaimedOTRecords: [],
  });

  const [attendanceView, setAttendanceView] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

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
      paid: formatNumber(data.paidLeavesRemaining?.[attendanceView]),
      unpaid: formatNumber(data.unpaidLeavesTaken),
      compensatory: isEligible ? formatNumber(data.compensatoryLeaves) : 0,
      restricted: formatNumber(data.restrictedHolidays)
    };

    return stats;
  }, [data, attendanceView, isEligible]);

  const handleViewToggle = useCallback(view => {
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
      const { paidLeaves, department, employeeType, restrictedHolidays, compensatoryLeaves } = employeeRes.data;

      const eligibleDepartments = ['Production', 'Testing', 'AMETL', 'Admin'];
      const isDeptEligible = department && eligibleDepartments.includes(department.name);
      setIsEligible(isDeptEligible);

      // Get current date for reference
      const today = new Date();
      let fromDate, toDate;

      if (attendanceView === 'daily') {
        // Daily view always shows just today
        fromDate = new Date(today);
        toDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
      } else if (attendanceView === 'monthly') {
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
      const Records = await api.get(`/dashboard/employee-stats?attendanceView=${attendanceView}&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);

      const leaveData = await api.get(`/dashboard/employee-stats?attendanceView=yearly&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);

      // Update state with fetched data
      const newData = {
        attendanceData: Records.data.attendanceData || [],
        leaveDaysTaken: {
          monthly: leaveData.data.monthly,
          yearly: leaveData.data.yearly
        },
        paidLeavesRemaining: {
          monthly: paidLeaves,
          yearly: employeeType === 'Confirmed' ? paidLeaves : 0,
        },
        unpaidLeavesTaken: leaveData.data.unpaidLeavesTaken,
        restrictedHolidays: restrictedHolidays,
        compensatoryLeaves: compensatoryLeaves,
        compensatoryAvailable: leaveData.data.compensatoryAvailable || [],
      };

      if (isDeptEligible) {
        // Add OT records if eligible

        newData.unclaimedOTRecords = leaveData.data.unclaimedOTRecords || [];
        console.log('Fetchend unclaimed OT Records:',{
          unclaimed: newData.unclaimedOTRecords})
      } else {
        // Ensure empty arrays if not eligible
        newData.otClaimRecords = [];
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
    if (!user?.employeeId) return;
    fetchData();

    const socketInstance = io(process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5005/api', {
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
              <Image source={{ uri: user.profilePicture }} style={styles.profileImage} resizeMode="cover" />
            ) : (
              <MaterialIcons name="person" size={50} color="#666666" style={styles.defaultIcon} />
            )}<View style={styles.nameContainer}>
              <Text style={styles.name}>{userName || user?.name}</Text>
              <Text style={styles.designation}>{designation || user?.designation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.viewToggleContainer}>
          {['monthly', 'yearly'].map(view => (
            <TouchableOpacity
              key={view}
              style={[styles.viewToggle, attendanceView === view && styles.viewToggleActive]}
              onPress={() => handleViewToggle(view)}
            >
              <Text style={styles.viewToggleText}>{view.charAt(0).toUpperCase() + view.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          {Array.isArray(data.attendanceData) && data.attendanceData.length > 0 ? (
            <PieChart
              data={[
                { name: "Present", population: calculateAttendanceStats().present, color: "#4CAF50", legendFontColor: "#7F7F7F" },
                { name: "Half Day", population: calculateAttendanceStats().half, color: "#FFA000", legendFontColor: "#7F7F7F" },
                { name: "Absent", population: calculateAttendanceStats().absent, color: "#f44336", legendFontColor: "#7F7F7F" },
                { name: "Leave", population: calculateAttendanceStats().leave, color: "#2196F3", legendFontColor: "#7F7F7F" }
              ]}
              width={Dimensions.get("window").width - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No attendance data available</Text>
              <Button title="Refresh" onPress={fetchData} />
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Leave Statistics</Text>
          {(() => {
            const stats = calculateLeaveStats();
            return (
              <BarChart
                data={{
                  labels: ["Paid Remaining", "Unpaid Taken", "Compensatory", "Restricted Remaining"],
                  datasets: [{
                    data: [
                      stats.paid,
                      stats.unpaid,
                      stats.compensatory,
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
                  padding:10,
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
                  const isBeforeDeadline = deadline > currentTime;
                  
                  // Additional check: Don't show records from more than 30 days ago
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  const isWithin30Days = new Date(record.date) >= thirtyDaysAgo;
                  
                  const isClaimable = hasValidHours && isBeforeDeadline && isWithin30Days;
                  
                  if (isClaimable) {
                    console.log('Claimable Record:', {
                      id: record._id,
                      date: record.date,
                      hours: record.hours,
                      hoursNum: hoursNum,
                      deadline: deadline.toISOString(),
                      currentTime: currentTime.toISOString(),
                      isWithin30Days,
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

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6b21a8" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
    marginBottom: 24,
    padding: 20,
  },
  profileContainer: {
    alignItems: 'center',

    flexDirection: 'row',
    justifyContent: 'space-between',

  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
    marginBottom: 20,
    marginRight: 20,
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
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16
  },
  viewToggle: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f8fafc'
  },
  viewToggleActive: {
    backgroundColor: '#6b21a8'
  },
  viewToggleText: {
    color: '#1e293b'
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
  otSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b21a8',
    marginBottom: 10,
    marginTop: 5,
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
  otProject: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 3,
  },
  otRecordHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  otStatus: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
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
  shadowContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
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
  loadingContainer: {
    alignItems: 'center',
    padding: 16
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
