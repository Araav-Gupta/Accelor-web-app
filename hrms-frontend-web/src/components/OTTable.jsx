import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import OTForm from "./OTForm";

function OTTable({ unclaimedOTRecords, claimedOTRecords, onClaimSuccess }) {
  const { toast } = useToast();
  const [selectedOT, setSelectedOT] = useState(null);
  const [timers, setTimers] = useState({});

  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      unclaimedOTRecords.forEach((record) => {
        // Assume eligible employee if claimDeadline exists
        if (record.claimDeadline) {
          const deadline = new Date(record.claimDeadline);
          const now = new Date();
          const timeLeft = deadline - now;
          if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            newTimers[record._id] = `${hours}h ${minutes}m`;
          } else {
            newTimers[record._id] = "Expired";
          }
        } else {
          newTimers[record._id] = "N/A"; // Non-eligible Sunday OT, no deadline
        }
      });
      setTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [unclaimedOTRecords]);

  const isClaimed = (record) => {
    return claimedOTRecords.some(
      (claimed) =>
        new Date(claimed.date).toDateString() ===
        new Date(record.date).toDateString()
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">OT Date</TableHead>
              <TableHead className="font-semibold">Day</TableHead>
              <TableHead className="font-semibold">Hours</TableHead>
              <TableHead className="font-semibold">Time Left to Claim</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unclaimedOTRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No unclaimed OT records available.
                </TableCell>
              </TableRow>
            ) : (
              unclaimedOTRecords.map((record) => (
                <TableRow key={record._id} className="hover:bg-gray-50">
                  <TableCell>
                    {new Date(record.date).toLocaleDateString('en-US')}
                  </TableCell>
                  <TableCell>{record.day}</TableCell>
                  <TableCell>{record.hours}</TableCell>
                  <TableCell>
                    {timers[record._id] || "."}
                  </TableCell>
                  <TableCell>
                    {record.hours >= 1 ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedOT(record)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={
                          timers[record._id] === "Expired" || isClaimed(record)
                        }
                      >
                        Claim
                      </Button>
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {selectedOT && (
        <OTForm
          open={!!selectedOT}
          onOpenChange={() => setSelectedOT(null)}
          otRecord={selectedOT}
          onClaimSuccess={() => {
            onClaimSuccess();
            toast({
              title: "Success",
              description: "OT claim submitted successfully!",
            });
          }}
        />
      )}
    </>
  );
}

export default OTTable;
