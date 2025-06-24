import React, { useState, useContext, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import ContentLayout from "./ContentLayout";

function LeaveForm() {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    leaveType: "",
    dates: {
      from: "",
      to: "",
      fromDuration: "full",
      fromSession: "forenoon",
      toDuration: "full",
      toSession: "forenoon",
    },
    reason: "",
    chargeGivenTo: "",
    emergencyContact: "",
    compensatoryEntryId: "",
    restrictedHoliday: "",
    projectDetails: "",
    medicalCertificate: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [compensatoryBalance, setCompensatoryBalance] = useState(0);
  const [compensatoryEntries, setCompensatoryEntries] = useState([]);
  const [canApplyEmergencyLeave, setCanApplyEmergencyLeave] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Fetch employee data and department employees
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const res = await api.get("/dashboard/employee-info");
        console.log("Employee Info Response:", res.data);
        setCompensatoryBalance(res.data.compensatoryLeaves || 0);
        setCompensatoryEntries(res.data.compensatoryAvailable || []);
        setCanApplyEmergencyLeave(res.data.canApplyEmergencyLeave || false);
      } catch (err) {
        console.error("Error fetching employee data:", err);
      }
    };

    const fetchDepartmentEmployees = async () => {
      try {
        const params = {};
        if (form.dates.from) {
          params.startDate = form.dates.from;
          params.endDate = form.dates.to || form.dates.from;
          params.fromDuration = form.dates.fromDuration;
          params.fromSession =
            form.dates.fromDuration === "half"
              ? form.dates.fromSession
              : undefined;
          params.toDuration = form.dates.to ? form.dates.toDuration : undefined;
          params.toSession =
            form.dates.to && form.dates.toDuration === "half"
              ? form.dates.toSession
              : undefined;
        }
        const res = await api.get("/employees/department", { params });
        setEmployees(res.data);
      } catch (err) {
        console.error("Error fetching department employees:", err);
      }
    };

    fetchEmployeeData();
    fetchDepartmentEmployees();
  }, [
    form.dates.from,
    form.dates.to,
    form.dates.fromDuration,
    form.dates.fromSession,
    form.dates.toDuration,
    form.dates.toSession,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("dates")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        dates: {
          ...prev.dates,
          [field]: value,
          ...(field === "fromDuration" && value === "half"
            ? { fromSession: "forenoon" }
            : {}),
          ...(field === "fromSession" && value === "forenoon"
            ? { to: "", toDuration: "full", toSession: "forenoon" }
            : {}),
        },
      }));
    } else if (name === "medicalCertificate") {
      const file = e.target.files[0];
      if (file && file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit");
        e.target.value = null;
        return;
      }
      if (
        file &&
        !["image/jpeg", "image/jpg", "application/pdf"].includes(file.type)
      ) {
        alert("Only JPEG/JPG or PDF files are allowed");
        e.target.value = null;
        return;
      }
      setForm((prev) => ({ ...prev, medicalCertificate: file }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCompensatoryEntryChange = (value) => {
    setForm((prev) => ({ ...prev, compensatoryEntryId: value }));
  };

  const handleChargeGivenToChange = (value) => {
    setForm((prev) => ({ ...prev, chargeGivenTo: value }));
  };

  const calculateLeaveDays = () => {
    if (!form.dates.from) return 0;

    // Case 1: From Duration = Full, To Date not filled
    if (form.dates.fromDuration === "full" && !form.dates.to) {
      return 1;
    }

    // Case 2: From Duration = Half
    if (form.dates.fromDuration === "half") {
      if (form.dates.fromSession === "forenoon") {
        return 0.5; // To Date disabled
      }
      if (form.dates.fromSession === "afternoon") {
        if (!form.dates.to) {
          return 0.5; // To Date not filled
        }
        const from = new Date(form.dates.from);
        const to = new Date(form.dates.to);
        if (to < from) return 0;
        let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
        if (form.dates.toDuration === "full") {
          return days - 0.5; // 1.5 for one day apart, etc.
        }
        if (
          form.dates.toDuration === "half" &&
          form.dates.toSession === "forenoon"
        ) {
          return days - 1; // 1 for one day apart, etc.
        }
        return 0; // Invalid combination
      }
    }

    // Case 3: From Duration = Full, To Date filled
    if (form.dates.fromDuration === "full" && form.dates.to) {
      const from = new Date(form.dates.from);
      const to = new Date(form.dates.to);
      if (to < from) return 0;
      let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
      if (form.dates.toDuration === "half") {
        days -= 0.5;
      }
      return days;
    }

    return 0;
  };

  const validateForm = () => {
    console.log("User Context:", user);
    if (!form.leaveType) return "Leave Type is required";
    if (!form.reason) return "Reason is required";
    if (!form.chargeGivenTo) return "Charge Given To is required";
    if (!form.emergencyContact) return "Emergency Contact is required";
    if (!form.dates.from) return "From Date is required";
    if (form.dates.to && new Date(form.dates.to) < new Date(form.dates.from))
      return "To Date cannot be earlier than From Date";
    if (!["full", "half"].includes(form.dates.fromDuration))
      return 'From Duration must be "full" or "half"';
    if (
      form.dates.fromDuration === "half" &&
      !["forenoon", "afternoon"].includes(form.dates.fromSession)
    )
      return 'From Session must be "forenoon" or "afternoon"';
    if (form.dates.to && !["full", "half"].includes(form.dates.toDuration))
      return 'To Duration must be "full" or "half"';
    if (
      form.dates.to &&
      form.dates.toDuration === "half" &&
      form.dates.toSession !== "forenoon"
    )
      return 'To Session must be "forenoon" for Half Day To Duration';

    // Compute today in IST
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(today.getTime() + istOffset);
    istTime.setUTCHours(0, 0, 0, 0); // Midnight IST

    const sevenDaysAgo = new Date(istTime);
    sevenDaysAgo.setDate(istTime.getDate() - 7);

    if (
      form.dates.from &&
      form.leaveType !== "Medical" &&
      form.leaveType !== "Emergency"
    ) {
      const fromDate = new Date(form.dates.from);
      if (fromDate <= istTime)
        return "From Date must be after today for this leave type";
    }
    if (form.leaveType === "Medical" && form.dates.from) {
      const fromDate = new Date(form.dates.from);
      if (fromDate < sevenDaysAgo || fromDate > istTime)
        return "Medical leave From Date must be within today and 7 days prior";
      if (!form.dates.to) return "To Date is required for Medical leave";
    }
    if (form.leaveType === "Emergency") {
      if (!canApplyEmergencyLeave)
        return "You are not authorized to apply for Emergency Leave";
      const leaveDays = calculateLeaveDays();
      if (leaveDays > 1)
        return "Emergency leave must be half day or one full day";
      const todayStr = istTime.toISOString().split("T")[0];
      if (
        form.dates.from !== todayStr ||
        (form.dates.to && form.dates.to !== todayStr)
      ) {
        return "Emergency leave must be for the current date only";
      }
    }
    if (form.leaveType === "Compensatory") {
      if (!form.compensatoryEntryId)
        return "Compensatory leave entry is required";
      const entry = compensatoryEntries.find(
        (e) => e._id === form.compensatoryEntryId
      );
      if (!entry || entry.status !== "Available")
        return "Invalid or unavailable compensatory leave entry";
      const leaveDays = calculateLeaveDays();
      const hoursNeeded = leaveDays === 0.5 ? 4 : 8;
      if (entry.hours !== hoursNeeded) {
        return `Selected entry (${
          entry.hours
        } hours) does not match leave duration (${
          leaveDays === 0.5 ? "Half Day (4 hours)" : "Full Day (8 hours)"
        })`;
      }
    }
    if (form.leaveType === "Restricted Holidays" && !form.restrictedHoliday)
      return "Please select a restricted holiday";
    if (
      form.leaveType === "Casual" &&
      user?.employeeType === "Confirmed" &&
      form.dates.fromDuration === "full" &&
      form.dates.to
    ) {
      const from = new Date(form.dates.from);
      const to = new Date(form.dates.to);
      let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
      if (form.dates.toDuration === "half") days -= 0.5;
      if (days > 3)
        return "Confirmed employees can only take up to 3 consecutive Casual leaves.";
    }
    if (form.leaveType === "Medical") {
      console.log(
        "Validating Medical leave, user:",
        user,
        "employeeType:",
        user?.employeeType
      );
      if (!user || user.employeeType !== "Confirmed")
        return "Medical leave is only available for Confirmed employees";
    }
    if (form.leaveType === "Medical" && form.dates.fromDuration === "full") {
      const from = new Date(form.dates.from);
      const to = new Date(form.dates.to);
      let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
      if (form.dates.toDuration === "half") days -= 0.5;
      if (days !== 3 && days !== 4)
        return "Medical leave must be exactly 3 or 4 days";
      if (!form.medicalCertificate)
        return "Medical certificate is required for Medical leave";
    }
    if (form.leaveType === "Medical" && form.dates.fromDuration === "half")
      return "Medical leave cannot be applied as a half-day leave";
    if (
      form.leaveType === "Maternity" &&
      (!user || user.gender?.trim().toLowerCase() !== "female")
    )
      return "Maternity leave is only available for female employees";
    if (
      form.leaveType === "Maternity" &&
      (!user || user.employeeType !== "Confirmed")
    )
      return "Maternity leave is only available for Confirmed employees";
    if (form.leaveType === "Maternity" && form.dates.fromDuration === "full") {
      const from = new Date(form.dates.from);
      const to = new Date(form.dates.to || form.dates.from);
      let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
      if (form.dates.to && form.dates.toDuration === "half") days -= 0.5;
      if (days !== 90) return "Maternity leave must be exactly 90 days";
    }
    if (form.leaveType === "Maternity" && form.dates.fromDuration === "half")
      return "Maternity leave cannot be applied as a half-day leave";
    if (
      form.leaveType === "Paternity" &&
      (!user || user.gender?.trim().toLowerCase() !== "male")
    ) {
      console.log("Paternity Gender Validation:", { gender: user?.gender });
      return "Paternity leave is only available for male employees";
    }
    if (
      form.leaveType === "Paternity" &&
      (!user || user.employeeType !== "Confirmed")
    ) {
      console.log("Paternity Employee Type Validation:", {
        employeeType: user?.employeeType,
      });
      return "Paternity leave is only available for Confirmed employees";
    }
    if (form.leaveType === "Paternity" && form.dates.fromDuration === "full") {
      const from = new Date(form.dates.from);
      const to = new Date(form.dates.to || form.dates.from);
      let days = (to - from) / (1000 * 60 * 60 * 24) + 1;
      if (form.dates.to && form.dates.toDuration === "half") days -= 0.5;
      if (days !== 7) return "Paternity leave must be exactly 7 days";
    }
    if (form.leaveType === "Paternity" && form.dates.fromDuration === "half")
      return "Paternity leave cannot be applied as a half-day leave";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const leaveData = new FormData();
      leaveData.append("leaveType", form.leaveType);
      leaveData.append("fullDay[from]", form.dates.from || "");
      leaveData.append("fullDay[fromDuration]", form.dates.fromDuration);
      if (form.dates.fromDuration === "half") {
        leaveData.append("fullDay[fromSession]", form.dates.fromSession);
      }
      if (form.dates.to) {
        leaveData.append("fullDay[to]", form.dates.to);
        leaveData.append("fullDay[toDuration]", form.dates.toDuration);
        if (form.dates.toDuration === "half") {
          leaveData.append("fullDay[toSession]", form.dates.toSession);
        }
      }
      leaveData.append("reason", form.reason);
      leaveData.append("chargeGivenTo", form.chargeGivenTo);
      leaveData.append("emergencyContact", form.emergencyContact);
      if (form.leaveType === "Compensatory") {
        leaveData.append("compensatoryEntryId", form.compensatoryEntryId);
      }
      leaveData.append("restrictedHoliday", form.restrictedHoliday);
      leaveData.append("projectDetails", form.projectDetails);
      leaveData.append("user", user.id);
      if (form.medicalCertificate) {
        leaveData.append("medicalCertificate", form.medicalCertificate);
      }
      console.log("Submitting FormData:", {
        leaveType: form.leaveType,
        fromDate: form.dates.from,
        toDate: form.dates.to,
        fromDuration: form.dates.fromDuration,
        fromSession: form.dates.fromSession,
        toDuration: form.dates.toDuration,
        toSession: form.dates.toSession,
      });

      await api.post("/leaves", leaveData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Leave submitted successfully");
      setForm({
        leaveType: "",
        dates: {
          from: "",
          to: "",
          fromDuration: "full",
          fromSession: "forenoon",
          toDuration: "full",
          toSession: "forenoon",
        },
        reason: "",
        chargeGivenTo: "",
        emergencyContact: "",
        compensatoryEntryId: "",
        restrictedHoliday: "",
        projectDetails: "",
        medicalCertificate: null,
      });
      const res = await api.get("/dashboard/employee-info");
      setCompensatoryBalance(res.data.compensatoryLeaves || 0);
      setCompensatoryEntries(res.data.compensatoryAvailable || []);
      setCanApplyEmergencyLeave(res.data.canApplyEmergencyLeave || false);
      const employeeRes = await api.get("/employees/department");
      setEmployees(employeeRes.data);
    } catch (err) {
      console.error("Leave submit error:", err.response?.data || err.message);
      const errorMessage =
        err.response?.data?.message ||
        "An error occurred while submitting the leave";
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute date constraints in IST
  const today = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(today.getTime() + istOffset);
  istTime.setUTCHours(0, 0, 0, 0); // Midnight IST
  const sevenDaysAgo = new Date(istTime);
  sevenDaysAgo.setDate(istTime.getDate() - 7);
  const tomorrow = new Date(istTime);
  tomorrow.setDate(istTime.getDate() + 1);
  const minDateMedical = sevenDaysAgo.toISOString().split("T")[0];
  const maxDateMedical = istTime.toISOString().split("T")[0];
  const minDateOther = tomorrow.toISOString().split("T")[0];
  const currentDate = istTime.toISOString().split("T")[0];

  const isToDateDisabled =
    form.dates.fromDuration === "half" && form.dates.fromSession === "forenoon";

  return (
    <ContentLayout title="Apply for Leave">
      <Card className="max-w-lg mx-auto shadow-lg border">
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                onValueChange={(value) =>
                  handleChange({ target: { name: "leaveType", value } })
                }
                value={form.leaveType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="Paternity">Paternity</SelectItem>
                  <SelectItem value="Compensatory">Compensatory</SelectItem>
                  <SelectItem value="Restricted Holidays">
                    Restricted Holidays
                  </SelectItem>
                  <SelectItem value="Leave Without Pay(LWP)">
                    Leave Without Pay (LWP)
                  </SelectItem>
                  {canApplyEmergencyLeave && (
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.leaveType === "Compensatory" && (
              <>
                <div className="col-span-2">
                  <Label htmlFor="compensatoryBalance">
                    Compensatory Leave Balance
                  </Label>
                  <p className="mt-1 text-sm">{compensatoryBalance} hours</p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="compensatoryEntryId">
                    Compensatory Leave Entry
                  </Label>
                  <Select
                    onValueChange={handleCompensatoryEntryChange}
                    value={form.compensatoryEntryId}
                    disabled={compensatoryEntries.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          compensatoryEntries.length === 0
                            ? "No available entries"
                            : "Select compensatory entry"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {compensatoryEntries
                        .filter((entry) => entry.status === "Available")
                        .map((entry) => (
                          <SelectItem key={entry._id} value={entry._id}>
                            {new Date(entry.date).toLocaleDateString()} -{" "}
                            {entry.hours} hours
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="projectDetails">Project Details</Label>
                  <Textarea
                    name="projectDetails"
                    value={form.projectDetails}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </>
            )}

            {form.leaveType === "Restricted Holidays" && (
              <div className="col-span-2">
                <Label htmlFor="restrictedHoliday">Restricted Holiday</Label>
                <Select
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: "restrictedHoliday", value },
                    })
                  }
                  value={form.restrictedHoliday}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select holiday" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diwali">Diwali</SelectItem>
                    <SelectItem value="Christmas">Christmas</SelectItem>
                    <SelectItem value="Eid">Eid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="dates.from">From Date</Label>
              <Input
                id="dates.from"
                name="dates.from"
                type="date"
                value={form.dates.from}
                onChange={handleChange}
                min={
                  form.leaveType === "Medical"
                    ? minDateMedical
                    : form.leaveType === "Emergency"
                    ? currentDate
                    : minDateOther
                }
                max={
                  form.leaveType === "Medical"
                    ? maxDateMedical
                    : form.leaveType === "Emergency"
                    ? currentDate
                    : ""
                }
              />
            </div>
            <div>
              <Label htmlFor="dates.fromDuration">From Duration</Label>
              <Select
                onValueChange={(value) =>
                  handleChange({
                    target: { name: "dates.fromDuration", value },
                  })
                }
                value={form.dates.fromDuration}
                aria-label="Select from duration"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.dates.fromDuration === "half" && (
              <div>
                <Label htmlFor="dates.fromSession">From Session</Label>
                <Select
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: "dates.fromSession", value },
                    })
                  }
                  value={form.dates.fromSession}
                  aria-label="Select from session"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forenoon">Forenoon</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="dates.to">To</Label>
              <Input
                id="dates.to"
                name="dates.to"
                type="date"
                value={form.dates.toDate}
                onChange={handleChange}
                min={
                  form.dates.from ||
                  (form.leaveType === "Medical"
                    ? minDateMedical
                    : form.leaveType === "Emergency"
                    ? currentDate
                    : minDateOther)
                }
                max={form.leaveType === "Emergency" ? currentDate : ""}
                disabled={isToDateDisabled}
              />
            </div>
            {!isToDateDisabled && form.dates.to && (
              <div>
                <Label htmlFor="dates.toDuration">To Duration</Label>
                <Select
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: "dates.toDuration", value },
                    })
                  }
                  value={form.dates.toDuration}
                  aria-label="Select to duration"
                  disabled={isToDateDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="half">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isToDateDisabled &&
              form.dates.to &&
              form.dates.toDuration === "half" && (
                <div>
                  <Label htmlFor="dates.toSession">To Session</Label>
                  <Select
                    onValueChange={(value) =>
                      handleChange({
                        target: { name: "dates.toSession", value },
                      })
                    }
                    value={form.dates.toSession}
                    aria-label="Select to session"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forenoon">Forenoon</SelectItem>
                      <SelectItem value="afternoon" disabled>
                        Afternoon
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            {form.leaveType === "Medical" &&
              form.dates.fromDuration === "full" && (
                <div className="col-span-2">
                  <Label htmlFor="medicalCertificate">
                    Medical Certificate (JPEG/PDF, max 5MB)
                  </Label>
                  <Input
                    id="medicalCertificate"
                    name="medicalCertificate"
                    type="file"
                    accept="image/jpeg,image/jpg,application/pdf"
                    onChange={handleChange}
                  />
                </div>
              )}

            <div className="col-span-2">
              <Label>Leave Days</Label>
              <p className="mt-1 text-sm text-gray-600">
                {calculateLeaveDays()} days
              </p>
            </div>

            <div className="col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={3}
                placeholder="Enter reason..."
              />
            </div>

            <div>
              <Label htmlFor="chargeGivenTo">Charge Given To</Label>
              <Select
                onValueChange={handleChargeGivenToChange}
                value={form.chargeGivenTo}
                disabled={employees.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      employees.length === 0
                        ? "No available employees"
                        : "Select employee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="emergencyContact">
                Emergency Contact Add. & No.
              </Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                type="text"
                value={form.emergencyContact}
                onChange={handleChange}
                placeholder="Enter emergency contact"
              />
            </div>

            <div className="col-span-2 flex justify-center mt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? "Submitting..." : "Submit Leave"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
export default LeaveForm;
