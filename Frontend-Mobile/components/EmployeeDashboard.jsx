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
    console.log('Attendance Data:', data.attendanceData);
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

    console.log('Formatted leave stats:', stats);
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
      console.log('Fetching dashboard data for employee:', user);
      
      const me = await api.get(`/auth/me`);
      setUserName(me.data.name);
      setDesignation(me.data.designation);

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
      console.log('Attendance View:', attendanceView)
      const Records = await api.get(`/dashboard/employee-stats?attendanceView=${attendanceView}&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);

      const leaveData = Records.data;

      let otData = { claimed: [], unclaimed: [] };
      if (isDeptEligible) {
        // Fetch OT records with yearly view to get all records
        otData = Records.data;
      }

      // Update state with fetched data
      setData({
        attendanceData: Records.data.attendanceData || [],
        leaveDaysTaken: {
          monthly: leaveData.monthly,
          yearly: leaveData.yearly
        },
        paidLeavesRemaining: {
          monthly: paidLeaves,
          yearly: employeeType === 'Confirmed' ? paidLeaves : 0,
        },
        unpaidLeavesTaken: leaveData.unpaidLeavesTaken,
        restrictedHolidays: restrictedHolidays,
        compensatoryLeaves: compensatoryLeaves,
        compensatoryAvailable: leaveData.compensatoryAvailable,
        otClaimRecords: otData.claimed || [],
        unclaimedOTRecords: otData.unclaimed || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [attendanceView]);

  useEffect(() => {
    if (!user?.employeeId) return;
    fetchData();

    const socketInstance = io(process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5005/api', {
      query: { employeeId: user.employeeId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketInstance.on('dashboard-update', fetchData);
    socketInstance.on('connect', () => console.log('WebSocket connected'));
    socketInstance.on('disconnect', () => console.log('WebSocket disconnected'));
    socketInstance.on('error', error => console.error('WebSocket error:', error));

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
            <Text style={styles.sectionTitle}>OT Records</Text>
            {data.otClaimRecords.map((record, index) => (
              <View key={index} style={styles.otRecord}>
                <Text style={styles.otRecordDate}>{record.date}</Text>
                <Text style={styles.otRecordHours}>{record.hours} hours</Text>
              </View>
            ))}
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
