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

function OTApproval() {
  const { user } = useContext(AuthContext);
  const initialFilters = useMemo(
    () => ({
      employeeId: user?.loginType === "Employee" ? user?.employeeId || "" : "",
      departmentId:
        user?.loginType === "HOD" && user?.department
          ? user.department._id
          : "all",
      status: "all",
      fromDate: "",
      toDate: "",
    }),
    [user]
  );
  const [claims, setClaims] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [pendingRejection, setPendingRejection] = useState(null);

  const fetchOtClaims = useCallback(async (filterParams) => {
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
      const res = await api.get("/ot", { params: normalizedFilters });
      setClaims(res.data.otClaims || []);
      setTotal(res.data.total || 0);
      if (res.data.otClaims.length === 0) {
        setError(
          filterParams.employeeId
            ? "No OT claim records found for the specified Employee ID."
            : "No OT claim records found for the selected filters."
        );
      }
    } catch (err) {
      console.error("Error fetching OT claims:", err);
      setError(
        err.response?.data?.message ||
          "Failed to fetch OT claims. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError("Failed to load departments");
    }
  }, []);

  useEffect(() => {
    if (user?.loginType === "HOD" && user?.department) {
      setDepartments([
        { _id: user.department._id, name: user.department.name },
      ]);
      fetchOtClaims({
        ...initialFilters,
        departmentId: user.department._id,
      });
    } else if (user?.loginType === "Employee") {
      fetchOtClaims({
        ...initialFilters,
        employeeId: user?.employeeId || "",
      });
    } else if (user) {
      fetchDepartments();
      fetchOtClaims(initialFilters);
    }
  }, [user, fetchDepartments, fetchOtClaims, initialFilters]);

  const handleChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const handleFilter = () => {
    if (filters.employeeId && !/^[A-Za-z0-9]+$/.test(filters.employeeId)) {
      setError("Invalid Employee ID format.");
      return;
    }
    setCurrentPage(1);
    fetchOtClaims(filters);
  };

  const handleApproval = async (id, status, currentStage, remarks = "") => {
    try {
      const otData = { status };
      if (status === "Rejected" && ["hod", "ceo"].includes(currentStage)) {
        if (!remarks.trim()) {
          alert("Remarks are required for rejection.");
          return;
        }
        otData.remarks = remarks;
      }
      await api.put(`/ot/${id}/approve`, otData);
      const updatedClaims = claims.map((claim) => {
        if (claim._id === id) {
          const newStatus = { ...claim.status, [currentStage]: status };
          if (status === "Approved") {
            if (currentStage === "hod") {
              newStatus.ceo = "Pending";
            } else if (currentStage === "ceo") {
              newStatus.admin = "Pending";
            }
          }
          return {
            ...claim,
            status: newStatus,
            remarks: status === "Rejected" ? remarks : claim.remarks,
          };
        }
        return claim;
      });
      setClaims(updatedClaims);
      alert(`OT claim ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error("Approval error:", err);
      alert(
        `Error processing OT claim approval: ${
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

  const hodDepartmentName =
    user?.loginType === "HOD" && user?.department
      ? departments.find((dep) => dep._id === user.department._id)?.name ||
        "Unknown"
      : "";

  return (
    <ContentLayout title="OT Claims Approval">
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
              <Label htmlFor="status">Approval Status (Any Stage)</Label>
              <Select
                onValueChange={(value) => handleChange("status", value)}
                value={filters.status}
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
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Hours</TableHead>
                  <TableHead className="font-semibold">View</TableHead>
                  <TableHead className="font-semibold">Status (HOD)</TableHead>
                  <TableHead className="font-semibold">Status (CEO)</TableHead>
                  <TableHead className="font-semibold">Status (Admin)</TableHead>
                  {["HOD", "Admin", "CEO"].includes(user?.loginType) && (
                    <TableHead className="font-semibold">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={["HOD", "Admin", "CEO"].includes(user?.loginType) ? 8 : 7} className="text-center py-4">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={["HOD", "Admin", "CEO"].includes(user?.loginType) ? 8 : 7} className="text-center py-4">
                      No OT claim records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((claim) => (
                    <TableRow key={claim._id} className="hover:bg-gray-50">
                      <TableCell>{claim.name}</TableCell>
                      <TableCell>
                        {new Date(claim.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{claim.hours}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedClaim(claim)}
                          className="bg-blue-600 text-white"
                        >
                          View
                        </Button>
                      </TableCell>
                      <TableCell>{claim.status.hod || "Pending"}</TableCell>
                      <TableCell>{claim.status.ceo || "Pending"}</TableCell>
                      <TableCell>{claim.status.admin || "Pending"}</TableCell>
                      {["HOD", "Admin", "CEO"].includes(user.loginType) && (
                        <TableCell>
                          {user.loginType === "HOD" &&
                            claim.status.hod === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(claim._id, "Approved", "hod")
                                  }
                                  disabled={loading}
                                  aria-label={`Approve OT claim for ${claim.name}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() =>
                                    handleRejection(claim._id, "hod")
                                  }
                                  disabled={loading}
                                  aria-label={`Reject OT claim for ${claim.name}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          {user.loginType === "CEO" &&
                            claim.status.hod === "Approved" &&
                            claim.status.ceo === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(claim._id, "Approved", "ceo")
                                  }
                                  disabled={loading}
                                  aria-label={`Approve OT claim for ${claim.name}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() =>
                                    handleRejection(claim._id, "ceo")
                                  }
                                  disabled={loading}
                                  aria-label={`Reject OT claim for ${claim.name}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          {user.loginType === "Admin" &&
                            claim.status.ceo === "Approved" &&
                            claim.status.admin === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(
                                      claim._id,
                                      "Acknowledged",
                                      "admin"
                                    )
                                  }
                                  disabled={loading}
                                  aria-label={`Acknowledge OT claim for ${claim.name}`}
                                >
                                  Acknowledged
                                </Button>
                              </div>
                            )}
                        </TableCell>
                      )}
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
            <Dialog
              open={!!selectedClaim}
              onOpenChange={() => setSelectedClaim(null)}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>OT Claim Details</DialogTitle>
                  <DialogDescription>
                    Complete details of the selected OT claim.
                  </DialogDescription>
                </DialogHeader>
                {selectedClaim && (
                  <div className="space-y-3">
                    <p>
                      <strong>Employee:</strong> {selectedClaim.name}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(selectedClaim.date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Hours:</strong> {selectedClaim.hours}
                    </p>
                    <p>
                      <strong>Project Details:</strong>{" "}
                      {selectedClaim.projectDetails}
                    </p>
                    <p>
                      <strong>Compensatory Hours:</strong>{" "}
                      {selectedClaim.compensatoryHours || 0}
                    </p>
                    <p>
                      <strong>Payment Amount:</strong>{" "}
                      {selectedClaim.paymentAmount || 0}
                    </p>
                    <p>
                      <strong>Remarks:</strong> {selectedClaim.remarks || "N/A"}
                    </p>
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button onClick={() => setSelectedClaim(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={showRejectionDialog}
              onOpenChange={() => setShowRejectionDialog(false)}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Reject OT Claim</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this OT claim.
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
                  <Button onClick={() => setShowRejectionDialog(false)}>
                    Cancel
                  </Button>
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

export default OTApproval;
