import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import Pagination from "./Pagination";
import api from "../services/api";
import ContentLayout from "./ContentLayout";
import { AuthContext } from "../context/AuthContext";
import { useFileHandler } from "../hooks/useFileHandler";

function LeaveList() {
  const { user } = useContext(AuthContext);
  const initialFilters = useMemo(
    () => ({
      employeeId: user?.loginType === "Employee" ? user?.employeeId || "" : "",
      departmentId:
        user?.loginType === "HOD" && user?.department
          ? user.department._id
          : "all",
      leaveType: "all",
      status: "all",
      fromDate: "",
      toDate: "",
    }),
    [user]
  );
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [tempFilters, setTempFilters] = useState(initialFilters);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [pendingRejection, setPendingRejection] = useState(null);

  const { handleViewFile, error: fileError } = useFileHandler(
    selectedLeave?.medicalCertificate?._id
  );

  const fetchLeaves = useCallback(async (filterParams) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedFilters = { ...filterParams, page: currentPage, limit: itemsPerPage };
      if (normalizedFilters.fromDate && !normalizedFilters.toDate) {
        normalizedFilters.toDate = normalizedFilters.fromDate;
      }
      if (
        normalizedFilters.fromDate &&
        normalizedFilters.toDate &&
        new Date(normalizedFilters.toDate) < new Date(normalizedFilters.fromDate)
      ) {
        setError("To Date cannot be earlier than From Date.");
        setLoading(false);
        return;
      }
      if (normalizedFilters.departmentId === "all") {
        delete normalizedFilters.departmentId;
      }
      console.log("Fetching leaves with:", normalizedFilters);
      const res = await api.get("/leaves", { params: normalizedFilters });
      setLeaves(res.data.leaves || []);
      setTotal(res.data.total || 0);
      if (res.data.leaves.length === 0) {
        setError(
          filterParams.employeeId
            ? "No leave records found for the specified Employee ID."
            : "No leave records found for the selected filters."
        );
      }
    } catch (err) {
      console.error("Error fetching leave list:", err);
      setError(
        err.response?.data?.message || "Failed to fetch leaves. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError("Failed to load departments");
    }
  }, []);

  // Initial data fetch and filter setup based on user role
  useEffect(() => {
    if (user?.loginType === "HOD" && user?.department) {
      setDepartments([{ _id: user.department._id, name: user.department.name }]);
      const hodFilters = {
        ...initialFilters,
        departmentId: user.department._id,
      };
      setFilters(hodFilters);
      setTempFilters(hodFilters);
      fetchLeaves(hodFilters);
    } else if (user?.loginType === "Employee") {
      const empFilters = {
        ...initialFilters,
        employeeId: user?.employeeId || "",
      };
      setFilters(empFilters);
      setTempFilters(empFilters);
      fetchLeaves(empFilters);
    } else if (user) {
      fetchDepartments();
      setFilters(initialFilters);
      setTempFilters(initialFilters);
      fetchLeaves(initialFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchDepartments, initialFilters]);

  // Refetch leaves when pagination changes
  useEffect(() => {
    fetchLeaves(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, fetchLeaves]);

  const handleChange = (name, value) => {
    setTempFilters({ ...tempFilters, [name]: value });
  };

  const handleFilter = () => {
    if (tempFilters.employeeId && !/^[A-Za-z0-9]+$/.test(tempFilters.employeeId)) {
      setError("Invalid Employee ID format.");
      return;
    }
    setFilters(tempFilters);
    setCurrentPage(1);
    fetchLeaves(tempFilters);
  };

  const handleApproval = async (id, status, currentStage, remarks = "") => {
    try {
      const leaveData = { status };
      if (status === "Rejected" && ["hod", "ceo"].includes(currentStage)) {
        if (!remarks.trim()) {
          alert("Remarks are required for rejection.");
          return;
        }
        leaveData.remarks = remarks;
      }
      await api.put(`/leaves/${id}/approve`, leaveData);
      const updatedLeaves = leaves.map((l) => {
        if (l._id === id) {
          const newStatus = { ...l.status, [currentStage]: status };
          if (status === "Approved") {
            if (currentStage === "hod") {
              newStatus.ceo = "Pending";
            } else if (currentStage === "ceo") {
              newStatus.admin = "Pending";
            }
          }
          return {
            ...l,
            status: newStatus,
            remarks: status === "Rejected" ? remarks : l.remarks,
          };
        }
        return l;
      });
      setLeaves(updatedLeaves);
      alert(`Leave ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error("Approval error:", err);
      alert(
        `Error processing leave approval: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  };

  const handleRejection = (id, stage) => {
    setPendingRejection({ id, stage });
    setRejectionRemarks("");
    setShowRejectionDialog(true);
  };

  const confirmRejection = () => {
    if (!rejectionRemarks.trim()) {
      alert("Please enter remarks for rejection.");
      return;
    }
    handleApproval(
      pendingRejection.id,
      "Rejected",
      pendingRejection.stage,
      rejectionRemarks
    );
    setShowRejectionDialog(false);
    setPendingRejection(null);
  };

  // Calculate leave duration
  const getLeaveDuration = (leave) => {
    if (leave.halfDay?.date) {
      return "Half Day";
    }
    if (leave.fullDay?.from && leave.fullDay?.to) {
      const from = new Date(leave.fullDay.from);
      const to = new Date(leave.fullDay.to);
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} Day${days > 1 ? 's' : ''}`;
    }
    return "N/A";
  };

  const hodDepartmentName =
    user?.loginType === "HOD" && user?.department
      ? departments.find((dep) => dep._id === user.department._id)?.name ||
        "Unknown"
      : "";

  return (
    <ContentLayout title="Leave List">
      <Card className="w-full mx-auto shadow-lg border">
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {fileError && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {fileError}
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
                value={tempFilters.employeeId}
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
                  value={tempFilters.departmentId}
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
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                onValueChange={(value) => handleChange("leaveType", value)}
                value={tempFilters.leaveType}
                disabled={loading}
              >
                <SelectTrigger
                  id="leaveType"
                  className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                >
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="Paternity">Paternity</SelectItem>
                  <SelectItem value="Compensatory">Compensatory</SelectItem>
                  <SelectItem value="Restricted Holidays">
                    Restricted Holidays
                  </SelectItem>
                  <SelectItem value="Leave Without Pay(LWP)">
                    Leave Without Pay(LWP)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="status">Approval Status (Any Stage)</Label>
              <Select
                onValueChange={(value) => handleChange("status", value)}
                value={tempFilters.status}
                disabled={loading}
              >
                <SelectTrigger
                  id="status"
                  className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={tempFilters.fromDate}
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
                value={tempFilters.toDate}
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
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">L.A Date</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">From</TableHead>
                  <TableHead className="font-semibold">To</TableHead>
                  <TableHead className="font-semibold">View</TableHead>
                  <TableHead className="font-semibold">Status (HOD)</TableHead>
                  <TableHead className="font-semibold">Status (CEO)</TableHead>
                  <TableHead className="font-semibold">Status (Admin)</TableHead>
                  {["HOD", "Admin", "CEO"].includes(user?.loginType) && (
                    <TableHead className="font-semibold">Action</TableHead>
                  )}
                  <TableHead className="font-semibold">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        ["HOD", "Admin", "CEO"].includes(user?.loginType) ? 11 : 10
                      }
                      className="text-center py-4"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : leaves.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        ["HOD", "Admin", "CEO"].includes(user?.loginType) ? 11 : 10
                      }
                      className="text-center py-4"
                    >
                      No leave records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave._id} className="hover:bg-gray-50">
                      <TableCell>{leave.name}</TableCell>
                      <TableCell>
                        {new Date(leave.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{leave.leaveType}</TableCell>
                      <TableCell>
                        {new Date(
                          leave.fullDay?.from || leave.halfDay?.date || leave.createdAt
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          leave.fullDay?.to || leave.halfDay?.date || leave.createdAt
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedLeave(leave)}
                          className="bg-blue-600 text-white"
                        >
                          View
                        </Button>
                      </TableCell>
                      <TableCell>{leave.status.hod || "Pending"}</TableCell>
                      <TableCell>{leave.status.ceo || "Pending"}</TableCell>
                      <TableCell>{leave.status.admin || "Pending"}</TableCell>
                      {["HOD", "Admin", "CEO"].includes(user?.loginType) && (
                        <TableCell>
                          {user.loginType === "HOD" && leave.status.hod === "Pending" && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() =>
                                  handleApproval(leave._id, "Approved", "hod")
                                }
                                disabled={loading || leave.status.hod !== "Pending"}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleRejection(leave._id, "hod")}
                                disabled={loading || leave.status.hod !== "Pending"}
                                aria-label={`Reject leave for ${leave.name}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {user.loginType === "CEO" &&
                            leave.status.hod === "Approved" &&
                            leave.status.ceo === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(leave._id, "Approved", "ceo")
                                  }
                                  disabled={loading || leave.status.ceo !== "Pending"}
                                  aria-label={`Approve leave for ${leave.name}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handleRejection(leave._id, "ceo")}
                                  disabled={loading || leave.status.ceo !== "Pending"}
                                  aria-label={`Reject leave for ${leave.name}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          {user.loginType === "Admin" &&
                            leave.status.ceo === "Approved" &&
                            leave.status.admin === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(leave._id, "Acknowledged", "admin")
                                  }
                                  disabled={loading || leave.status.admin !== "Pending"}
                                  aria-label={`Acknowledge leave for ${leave.name}`}
                                >
                                  Acknowledged
                                </Button>
                              </div>
                            )}
                        </TableCell>
                      )}
                      <TableCell>{leave.remarks || "N/A"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Leave Details</DialogTitle>
                  <DialogDescription>
                    Complete details of the selected leave application.
                  </DialogDescription>
                </DialogHeader>
                {selectedLeave && (
                  <div className="space-y-3">
                    <p>
                      <strong>L.A Date:</strong>{" "}
                      {new Date(selectedLeave.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Leave Type:</strong> {selectedLeave.leaveType}
                    </p>
                    <p>
                      <strong>Leave Duration:</strong> {getLeaveDuration(selectedLeave)}
                    </p>
                    <p>
                      <strong>Reason:</strong> {selectedLeave.reason}
                    </p>
                    <p>
                      <strong>Charge Given To:</strong> {selectedLeave.chargeGivenTo?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Emergency Contact:</strong>{" "}
                      {selectedLeave.emergencyContact}
                    </p>
                    {selectedLeave.compensatoryDate && (
                      <p>
                        <strong>Compensatory Date:</strong>{" "}
                        {new Date(selectedLeave.compensatoryDate).toLocaleDateString()}
                      </p>
                    )}
                    {selectedLeave.projectDetails && (
                      <p>
                        <strong>Project Details:</strong> {selectedLeave.projectDetails}
                      </p>
                    )}
                    {selectedLeave.restrictedHoliday && (
                      <p>
                        <strong>Restricted Holiday:</strong>{" "}
                        {selectedLeave.restrictedHoliday}
                      </p>
                    )}
                    {selectedLeave.medicalCertificate && (
                      <p>
                        <strong>Medical Certificate:</strong>{" "}
                        <Button
                          size="sm"
                          onClick={handleViewFile}
                          className="bg-blue-600 text-white"
                          disabled={fileError}
                        >
                          View {selectedLeave.medicalCertificate.filename}
                        </Button>
                      </p>
                    )}
                    <p>
                      <strong>Remarks:</strong> {selectedLeave.remarks || "N/A"}
                    </p>
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button onClick={() => setSelectedLeave(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showRejectionDialog}
              onOpenChange={() => setShowRejectionDialog(false)}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Reject Leave</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this leave application.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Label htmlFor="rejectionRemarks">Rejection Remarks</Label>
                  <Input
                    id="rejectionRemarks"
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                    placeholder="Enter reason for rejection"
                  />
                </div>
                <DialogFooter className="mt-4">
                  <Button onClick={() => setShowRejectionDialog(false)}>Cancel</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={confirmRejection}
                  >
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default LeaveList;
