"use client";

import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Phone,
  User,
  Calendar,
  UserPlus,
  FileText,
  Loader2,
} from "lucide-react";
import { formatPhone } from "@/lib/phone";
import type { IncomingCallWithPatient } from "@/app/hooks/useCallEvents";

interface ScreenPopPanelProps {
  /** Current incoming call data (null when no call) */
  call: IncomingCallWithPatient | null;
  /** Called when the panel should be dismissed */
  onDismiss: () => void;
}

/**
 * Screen pop panel that slides in from the right when a call arrives.
 * Shows caller info and matched patient details with quick actions.
 */
export function ScreenPopPanel({ call, onDismiss }: ScreenPopPanelProps) {
  const router = useRouter();
  const isOpen = call !== null;

  const handleViewPatient = () => {
    if (call?.patient?.id) {
      router.push(`/patients?highlight=${call.patient.id}`);
      onDismiss();
    }
  };

  const handleCreatePatient = () => {
    // Navigate to patients page with pre-filled phone number
    const phone = encodeURIComponent(call?.call.from_number || "");
    router.push(`/patients?new=true&phone=${phone}`);
    onDismiss();
  };

  const handleSchedule = () => {
    // Future: navigate to scheduling with patient pre-selected
    onDismiss();
  };

  const handleAddNote = () => {
    // Future: open note dialog for patient
    onDismiss();
  };

  // Format date of birth for display
  const formatDOB = (dob?: Date | string) => {
    if (!dob) return null;
    const date = new Date(dob);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <SheetContent
        side="right"
        className="w-[340px] sm:w-[380px] p-0 overflow-hidden"
      >
        {/* Animated header with gradient border */}
        <div className="relative">
          {/* Breathing gradient border effect */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-400 animate-pulse" />

          <SheetHeader className="p-5 pb-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-3">
              {/* Pulsing phone icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
                <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full shadow-lg shadow-teal-500/25">
                  <Phone className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold tracking-tight">
                  Incoming Call
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {call?.call.from_name || "Unknown Caller"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Call details */}
        <div className="p-5 space-y-5">
          {/* Phone number display */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-mono tracking-wide">
              {formatPhone(call?.call.from_number)}
            </span>
          </div>

          {/* Patient card or no match message */}
          {call?.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              <span className="ml-2 text-muted-foreground">
                Looking up patient...
              </span>
            </div>
          ) : call?.patient ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Patient header */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {call.patient.first_name} {call.patient.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {call.patient.status || "Active"} Patient
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient details */}
              <div className="p-4 space-y-2.5 text-sm">
                {call.patient.date_of_birth && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="font-medium">
                      {formatDOB(call.patient.date_of_birth)}
                    </span>
                  </div>
                )}
                {call.patient.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium truncate max-w-[180px]">
                      {call.patient.email}
                    </span>
                  </div>
                )}
                {call.patient.registration_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Patient Since</span>
                    <span className="font-medium">
                      {formatDOB(call.patient.registration_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">
                No matching patient found
              </p>
              <p className="text-xs text-muted-foreground/70">
                Create a new patient record for this caller
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            {call?.patient ? (
              <>
                <Button
                  onClick={handleViewPatient}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20"
                >
                  <User className="w-4 h-4 mr-2" />
                  View Patient
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddNote}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSchedule}
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Schedule
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={handleCreatePatient}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20"
                disabled={call?.isLoading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Patient
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
