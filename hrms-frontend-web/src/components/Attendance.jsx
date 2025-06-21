import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import ContentLayout from "./ContentLayout";
import Pagination from "./Pagination";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";

function Attendance() {
  const { user } = useContext(AuthContext);
  const initialFilters = useMemo(
    () => ({
      employeeId: user?.loginType === "Employee" ? user?.employeeId || "" : "",
      departmentId:
        user?.loginType === "HOD" && user?.department
          ? user.department._id
          : "all",
      fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
      status: "all",
    }),
    [user]
  );
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [absenceAlerts, setAbsenceAlerts] = useState({});

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError("Failed to load departments");
    }
  }, []);

  const formatDateDisplay = (dateStr) => {
    const dateUTC = new Date(dateStr);
    // Convert UTC to IST by adding 5.5 hours (5.5 * 60 * 60 * 1000 ms)
    const dateIST = new Date(dateUTC.getTime() + (5.5 * 60 * 60 * 1000));
    return dateIST.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // Returns e.g., 18/06/2025
  };

  const fetchAttendance = useCallback(async (filterParams) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedFilters = { ...filterParams };
      if (normalizedFilters.fromDate && !normalizedFilters.toDate) {
        normalizedFilters.toDate = normalizedFilters.fromDate;
      }
      if (
        normalizedFilters.fromDate &&
        normalizedFilters.toDate &&
        new Date(normalizedFilters.toDate) <
          new Date(normalizedFilters.fromDate)
      ) {
        setError("To Date cannot be earlier than From Date.");
        setLoading(false);
        return;
      }
      if (normalizedFilters.departmentId === "all") {
        delete normalizedFilters.departmentId;
      }
      const res = await api.get("/attendance", { params: normalizedFilters });
      const attendanceData = res.data.attendance || [];
      setAttendance(attendanceData);
      setTotal(res.data.total || 0);

      // Fetch absence alerts for admin
      if (user?.loginType === "Admin") {
        const alertsRes = await api.get("/attendance/absence-alerts");
        const alerts = alertsRes.data.reduce((acc, alert) => {
          acc[alert.employeeId] = alert;
          return acc;
        }, {});
        setAbsenceAlerts(alerts);
      }

      // Log duplicates for debugging
      const keyCounts = {};
      attendanceData.forEach((record) => {
        const key = `${record.employeeId}-${new Date(record.logDate).toISOString().split('T')[0]}`;
        keyCounts[key] = (keyCounts[key] || 0) + 1;
        if (keyCounts[key] > 1) {
          console.warn(
            `Duplicate attendance record found in frontend for key: ${key}`,
            record
          );
        }
      });

      if (attendanceData.length === 0) {
        setError(
          filterParams.employeeId
            ? "No attendance records found for the specified Employee ID."
            : "No attendance records found for the selected date or filters."
        );
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err.response?.data?.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.loginType === "HOD" && user?.department) {
      setDepartments([
        { _id: user.department._id, name: user.department.name },
      ]);
      fetchAttendance({
        ...initialFilters,
        departmentId: user.department._id,
      });
    } else if (user?.loginType === "Employee") {
      fetchAttendance({
        ...initialFilters,
        employeeId: user?.employeeId || "",
      });
    } else if (user) {
      fetchDepartments();
      fetchAttendance(initialFilters);
    }
  }, [user, fetchDepartments, fetchAttendance, initialFilters]);

  const handleChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const handleFilter = () => {
    if (filters.employeeId && !/^[A-Za-z0-9]+$/.test(filters.employeeId)) {
      setError("Invalid Employee ID format.");
      return;
    }
    setCurrentPage(1);
    fetchAttendance(filters);
  };

  const handleDownload = async (status) => {
    try {
      const normalizedFilters = { ...filters, status };
      if (normalizedFilters.departmentId === "all") {
        delete normalizedFilters.departmentId;
      }
      const res = await api.get("/attendance/download", {
        params: normalizedFilters,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_${status}_${filters.fromDate}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading Excel:", err);
      setError("Failed to download attendance report");
    }
  };

  const handleSendNotification = async (employeeId, alertType) => {
    try {
      await api.post("/attendance/send-absence-notification", {
        employeeId,
        alertType,
      });
      setError(null);
      // Refresh alerts after sending notification
      const alertsRes = await api.get("/attendance/absence-alerts");
      const alerts = alertsRes.data.reduce((acc, alert) => {
        acc[alert.employeeId] = alert;
        return acc;
      }, {});
      setAbsenceAlerts(alerts);
    } catch (err) {
      console.error("Error sending notification:", err);
      setError(err.response?.data?.message || "Failed to send notification");
    }
  };

  const paginatedAttendance = attendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTime = (minutes) => {
    if (!minutes) return "00:00";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const hodDepartmentName =
    user?.loginType === "HOD" && user?.department
      ? departments.find((dep) => dep._id === user.department._id)?.name ||
        "Unknown"
      : "";

  return (
    <ContentLayout title="Attendance List">
      <Card className="w-full mx-auto shadow-lg border">
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={filters.employeeId}
                onChange={(e) => handleChange("employeeId", e.target.value)}
                placeholder="Employee ID"
                disabled={user?.loginType === "Employee"}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="departmentId">Department</Label>
              {user?.loginType === "HOD" ? (
                <Input
                  id="departmentId"
                  value={hodDepartmentName}
                  readOnly
                  className="mt-1 border-gray-300 bg-gray-100 cursor-not-allowed"
                  placeholder="Your Department"
                />
              ) : user?.loginType === "Employee" ? (
                <Input
                  id="departmentId"
                  value={user?.department?.name || "Unknown"}
                  readOnly
                  className="mt-1 border-gray-300 bg-gray-100 cursor-not-allowed"
                  placeholder="Your Department"
                />
              ) : (
                <Select
                  onValueChange={(value) => handleChange("departmentId", value)}
                  value={filters.departmentId}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="departmentId"
                    className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dep) => (
                      <SelectItem key={dep._id} value={dep._id}>
                        {dep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleChange("fromDate", e.target.value)}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                name="toDate"
                type="date"
                value={filters.toDate}
                onChange={(e) => handleChange("toDate", e.target.value)}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={handleFilter}
                className="px-4 py-2 bg-blue-600 text-white"
              >
                Filter
              </Button>
            </div>
          </motion.div>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 rounded-lg bg-gray-100">
              <p className="text-lg font-semibold">
                No attendance records found.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="font-semibold">
                        Employee ID
                      </TableHead>
                      <TableHead className="font-semibold">User ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Time IN</TableHead>
                      <TableHead className="font-semibold">Time OUT</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">OT</TableHead>
                      {user?.loginType === "Admin" && (
                        <TableHead className="font-semibold">Action</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendance.map((a) => (
                      <TableRow
                        key={a._id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell>{a.employeeId}</TableCell>
                        <TableCell>{a.userId}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell>{formatDateDisplay(a.logDate)}</TableCell>
                        <TableCell>{a.timeIn || "-"}</TableCell>
                        <TableCell>{a.timeOut || "-"}</TableCell>
                        <TableCell>
                          {a.status}
                          {a.halfDay ? ` (${a.halfDay})` : ""}
                        </TableCell>
                        <TableCell>{formatTime(a.ot)}</TableCell>
                        {user?.loginType === "Admin" && (
                          <TableCell>
                            {absenceAlerts[a.employeeId]?.days === 3 && (
                              <Button
                                onClick={() =>
                                  handleSendNotification(a.employeeId, "warning")
                                }
                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              >
                                Send Warning
                              </Button>
                            )}
                            {absenceAlerts[a.employeeId]?.days === 5 && (
                              <Button
                                onClick={() =>
                                  handleSendNotification(
                                    a.employeeId,
                                    "termination"
                                  )
                                }
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Send Termination Notice
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  onClick={() => handleDownload("Present")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Download Present
                </Button>
                <Button
                  onClick={() => handleDownload("Absent")}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Download Absent
                </Button>
              </div>
              <Pagination
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={total}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default Attendance;
