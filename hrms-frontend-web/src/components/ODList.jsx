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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import Pagination from "./Pagination";
import api from "../services/api";
import ContentLayout from "./ContentLayout";
import { AuthContext } from "../context/AuthContext";

function ODList() {
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
  const [odRecords, setOdRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOD, setSelectedOD] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchODs = useCallback(async (filterParams) => {
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
      const res = await api.get("/od", { params: normalizedFilters });
      setOdRecords(res.data.odRecords || []);
      setTotal(res.data.total || 0);
      if (res.data.odRecords.length === 0) {
        setError(
          filterParams.employeeId
            ? "No OD records found for the specified Employee ID."
            : "No OD records found for the selected filters."
        );
      }
    } catch (err) {
      console.error("Error fetching OD list:", err);
      setError(
        err.response?.data?.message ||
          "Failed to fetch OD records. Please try again."
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
      fetchODs({
        ...initialFilters,
        departmentId: user.department._id,
      });
    } else if (user?.loginType === "Employee") {
      fetchODs({
        ...initialFilters,
        employeeId: user?.employeeId || "",
      });
    } else if (user) {
      fetchDepartments();
      fetchODs(initialFilters);
    }
  }, [user, fetchDepartments, fetchODs, initialFilters]);

  const handleChange = (name, value) => {
    setFilters({ ...filters, [name]: value });
  };

  const handleFilter = () => {
    if (filters.employeeId && !/^[A-Za-z0-9]+$/.test(filters.employeeId)) {
      setError("Invalid Employee ID format.");
      return;
    }
    setCurrentPage(1);
    fetchODs(filters);
  };

  const handleApproval = async (id, status, currentStage) => {
    try {
      const odData = { status };
      await api.put(`/od/${id}/approve`, odData);
      const updatedODs = odRecords.map((od) => {
        if (od._id === id) {
          const newStatus = { ...od.status, [currentStage]: status };
          if (status === "Approved" || status === "Acknowledged") {
            if (currentStage === "hod") {
              newStatus.ceo = "Pending";
            } else if (currentStage === "ceo") {
              newStatus.admin = "Pending";
            }
          }
          return { ...od, status: newStatus };
        }
        return od;
      });
      setOdRecords(updatedODs);
      alert(`OD ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error("Approval error:", err);
      alert(
        `Error processing OD approval: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  };

  const hodDepartmentName =
    user?.loginType === "HOD" && user?.department
      ? departments.find((dep) => dep._id === user.department._id)?.name ||
        "Unknown"
      : "";

  return (
    <ContentLayout title="OD List">
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
                  <TableHead className="font-semibold">Date Out</TableHead>
                  <TableHead className="font-semibold">Date In</TableHead>
                  <TableHead className="font-semibold">Purpose</TableHead>
                  <TableHead className="font-semibold">Place/Unit</TableHead>
                  <TableHead className="font-semibold">View</TableHead>
                  <TableHead className="font-semibold">Status (HOD)</TableHead>
                  <TableHead className="font-semibold">Status (CEO)</TableHead>
                  <TableHead className="font-semibold">
                    Status (Admin)
                  </TableHead>
                  {["HOD", "Admin", "CEO"].includes(user?.loginType) && (
                    <TableHead className="font-semibold">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        ["HOD", "Admin", "CEO"].includes(user?.loginType)
                          ? 10
                          : 9
                      }
                      className="text-center py-4"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : odRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        ["HOD", "Admin", "CEO"].includes(user?.loginType)
                          ? 10
                          : 9
                      }
                      className="text-center py-4"
                    >
                      No OD records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  odRecords.map((od) => (
                    <TableRow key={od._id} className="hover:bg-gray-50">
                      <TableCell>{od.name}</TableCell>
                      <TableCell>
                        {new Date(od.dateOut).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(od.dateIn).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{od.purpose}</TableCell>
                      <TableCell>{od.placeUnitVisit}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedOD(od)}
                          className="bg-blue-600 text-white"
                        >
                          View
                        </Button>
                      </TableCell>
                      <TableCell>{od.status.hod || "Pending"}</TableCell>
                      <TableCell>{od.status.ceo || "Pending"}</TableCell>
                      <TableCell>{od.status.admin || "Pending"}</TableCell>
                      {["HOD", "Admin", "CEO"].includes(user?.loginType) && (
                        <TableCell>
                          {user.loginType === "HOD" &&
                            od.status.hod === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(od._id, "Approved", "hod")
                                  }
                                  disabled={
                                    loading || od.status.hod !== "Pending"
                                  }
                                  aria-label={`Approve OD for ${od.name}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() =>
                                    handleApproval(od._id, "Rejected", "hod")
                                  }
                                  disabled={
                                    loading || od.status.hod !== "Pending"
                                  }
                                  aria-label={`Reject OD for ${od.name}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          {user.loginType === "CEO" &&
                            ["Approved", "Submitted"].includes(od.status.hod) &&
                            od.status.ceo === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(od._id, "Approved", "ceo")
                                  }
                                  disabled={
                                    loading || od.status.ceo !== "Pending"
                                  }
                                  aria-label={`Approve OD for ${od.name}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() =>
                                    handleApproval(od._id, "Rejected", "ceo")
                                  }
                                  disabled={
                                    loading || od.status.ceo !== "Pending"
                                  }
                                  aria-label={`Reject OD for ${od.name}`}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          {user.loginType === "Admin" &&
                            od.status.ceo === "Approved" &&
                            od.status.admin === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() =>
                                    handleApproval(
                                      od._id,
                                      "Acknowledged",
                                      "admin"
                                    )
                                  }
                                  disabled={
                                    loading || od.status.admin !== "Pending"
                                  }
                                  aria-label={`Acknowledge OD for ${od.name}`}
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
              open={!!selectedOD}
              onOpenChange={() => setSelectedOD(null)}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>OD Details</DialogTitle>
                  <DialogDescription>
                    Complete details of the selected OD request.
                  </DialogDescription>
                </DialogHeader>
                {selectedOD && (
                  <div className="space-y-3">
                    <p>
                      <strong>Date Out:</strong>{" "}
                      {new Date(selectedOD.dateOut).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time Out:</strong> {selectedOD.timeOut || "N/A"}
                    </p>
                    <p>
                      <strong>Date In:</strong>{" "}
                      {new Date(selectedOD.dateIn).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Time In:</strong> {selectedOD.timeIn || "N/A"}
                    </p>
                    <p>
                      <strong>Purpose:</strong> {selectedOD.purpose}
                    </p>
                    <p>
                      <strong>Place/Unit Visit:</strong>{" "}
                      {selectedOD.placeUnitVisit}
                    </p>
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button onClick={() => setSelectedOD(null)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default ODList;
