


function buildAttendanceData(attendanceRecords, attendanceView, fromDate, toDate, today = new Date()) {
    // Convert string dates to Date objects
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const attendanceData = [];
  
    if (attendanceView === 'daily') {
      // For daily view, we'll show a range of days
      const totalDays = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
      
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(from);
        currentDate.setDate(from.getDate() + i);
        const count = attendanceRecords.filter(
          a => new Date(a.logDate).toDateString() === currentDate.toDateString()
        ).length;
        
        // Skip Sundays
        if (currentDate.getDay() === 0) continue;
        
        const records = attendanceRecords.filter(
          a => {
            const logDate = new Date(a.logDate);
            return logDate.toDateString() === currentDate.toDateString();
          }
        );
        
        // Determine status based on attendance records
        const fullDay = records.some(a => a.status === 'Present');
        const halfDay = records.some(a => a.status === 'Half Day');
        const absent = records.length === 0;
  
        const status = fullDay ? 'present' : halfDay ? 'half' : absent ? 'absent' : 'leave';
        
        // Format date as DD MMM
        const formattedDate = currentDate.toLocaleString('default', { day: '2-digit', month: 'short' });
        attendanceData.push({ name: formattedDate, status, count });
      }
    } else if (attendanceView === 'monthly') {
      // For monthly view, show each day of the current month up to today
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Adjust for any provided date range filters
      const adjustedStartDate = from > startOfMonth ? from : startOfMonth;
      const adjustedEndDate = to < currentDate ? to : currentDate;
      
      // Calculate total days to process
      const totalDays = Math.ceil((adjustedEndDate - adjustedStartDate) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= totalDays; i++) {
        const date = new Date(adjustedStartDate);
        date.setDate(adjustedStartDate.getDate() + i);
        
        // Skip Sundays
        if (date.getDay() === 0) continue;
        
        // Format as DD (e.g., "01", "02", etc.)
        const formattedDate = date.getDate().toString();
        
        // Find records for this specific date
        const records = attendanceRecords.filter(a => {
          const logDate = new Date(a.logDate);
          return (
            logDate.getDate() === date.getDate() &&
            logDate.getMonth() === date.getMonth() &&
            logDate.getFullYear() === date.getFullYear()
          );
        });
        
        // Determine status based on records
        const fullDay = records.some(a => a.status === 'Present');
        const halfDay = records.some(a => a.status === 'Half Day');
        const absent = records.length === 0;
        
        const status = fullDay ? 'present' : halfDay ? 'half' : absent ? 'absent' : 'leave';
        const count = fullDay ? 1 : halfDay ? 0.5 : 0;
        
        attendanceData.push({ 
          name: formattedDate, 
          status, 
          count,
        });
      }
    }else if (attendanceView === 'yearly') {
      // For yearly view, show each day of the year up to today for current year, or full year for past years
      const currentYear = today.getFullYear();
      const isCurrentYear = currentYear === new Date().getFullYear();
      
      // Set date range
      const startDate = new Date(currentYear, 0, 1); // Jan 1 of the year
      const endDate = isCurrentYear 
        ? new Date() // Today for current year
        : new Date(currentYear, 11, 31); // Dec 31 for past years
      
      // Adjust for any provided date range filters
      const adjustedStartDate = from > startDate ? from : startDate;
      const adjustedEndDate = to < endDate ? to : endDate;
      
      // Calculate total days to process
      const totalDays = Math.ceil((adjustedEndDate - adjustedStartDate) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= totalDays; i++) {
        const currentDate = new Date(adjustedStartDate);
        currentDate.setDate(adjustedStartDate.getDate() + i);
        
        // Skip Sundays
        if (currentDate.getDay() === 0) continue;
        
        // Format as DD MMM (e.g., "01 Jan")
        const formattedDate = currentDate.toLocaleString('default', { day: '2-digit', month: 'short' });
        
        // Find records for this specific date
        const records = attendanceRecords.filter(a => {
          const logDate = new Date(a.logDate);
          return (
            logDate.getDate() === currentDate.getDate() &&
            logDate.getMonth() === currentDate.getMonth() &&
            logDate.getFullYear() === currentDate.getFullYear()
          );
        });
        
        // Determine status based on records
        const fullDay = records.some(a => a.status === 'Present');
        const halfDay = records.some(a => a.status === 'Half Day');
        const absent = records.length === 0;
        
        const status = fullDay ? 'present' : halfDay ? 'half' : absent ? 'absent' : 'leave';
        const count = fullDay ? 1 : halfDay ? 0.5 : 0;
        
        // Add to results
        attendanceData.push({
          name: formattedDate,
          status,
          count,
        });
      }}
    return attendanceData;
  }

export { buildAttendanceData };
