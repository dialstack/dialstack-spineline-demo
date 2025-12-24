"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  X,
  User,
  Phone,
  Trash2,
  LoaderCircle,
  FileText,
  Stethoscope,
} from "lucide-react";
import { useDialstackContext } from "@/app/hooks/EmbeddedComponentProvider";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from "@/app/models/appointment";
import type { Patient } from "@/app/models/patient";
import type { Provider } from "@/app/models/provider";

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "declined", label: "Declined" },
  { value: "no_show", label: "No Show" },
];

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "initial", label: "Initial" },
  { value: "adjustment", label: "Adjustment" },
  { value: "walk_in", label: "Walk-in" },
  { value: "follow_up", label: "Follow-up" },
];

/**
 * Fetch appointment by ID
 */
const fetchAppointment = async (id: number): Promise<Appointment> => {
  const res = await fetch(`/api/appointments/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch appointment: ${res.status}`);
  }
  return res.json();
};

/**
 * Fetch patients
 */
const fetchPatients = async (): Promise<Patient[]> => {
  const res = await fetch("/api/patients");
  if (!res.ok) {
    throw new Error(`Failed to fetch patients: ${res.status}`);
  }
  return res.json();
};

/**
 * Fetch providers
 */
const fetchProviders = async (): Promise<Provider[]> => {
  const res = await fetch("/api/providers");
  if (!res.ok) {
    throw new Error(`Failed to fetch providers: ${res.status}`);
  }
  return res.json();
};

/**
 * Update appointment
 */
const updateAppointment = async ({
  id,
  data,
}: {
  id: number;
  data: Partial<Appointment>;
}): Promise<Appointment> => {
  const res = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || `Failed to update appointment: ${res.status}`,
    );
  }
  return res.json();
};

/**
 * Delete appointment
 */
const deleteAppointment = async (id: number): Promise<void> => {
  const res = await fetch(`/api/appointments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete appointment: ${res.status}`);
  }
};

interface AppointmentPanelProps {
  /** Appointment ID to display (null when closed) */
  appointmentId: number | null;
  /** Called when the panel should be closed */
  onClose: () => void;
}

/**
 * Appointment details panel displayed as a right-side column.
 */
export function AppointmentPanel({
  appointmentId,
  onClose,
}: AppointmentPanelProps) {
  const queryClient = useQueryClient();
  const { dialstackInstance } = useDialstackContext();
  const [dialstackUserId, setDialstackUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = appointmentId !== null;

  // Fetch appointment data
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => fetchAppointment(appointmentId!),
    enabled: appointmentId !== null,
  });

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  // Fetch providers for dropdown
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["appointment", appointmentId],
      });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsDeleteDialogOpen(false);
      onClose();
    },
  });

  // Fetch DialStack user ID for click-to-call
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/dialstack/user");
        if (response.ok) {
          const user = await response.json();
          setDialstackUserId(user.id);
        }
      } catch (error) {
        console.error("Failed to fetch DialStack user:", error);
      }
    }
    fetchUser();
  }, []);

  const handleDelete = () => {
    if (appointmentId) {
      deleteMutation.mutate(appointmentId);
    }
  };

  const handleUpdate = (field: string, value: unknown) => {
    if (!appointmentId) return;
    setError(null);
    updateMutation.mutate({ id: appointmentId, data: { [field]: value } });
  };

  // Get patient for this appointment
  const patient =
    appointment?.patient_id && patients
      ? patients.find((p) => p.id === appointment.patient_id)
      : null;

  // Handle call patient
  const handleCallPatient = async () => {
    if (!patient?.phone || !dialstackInstance || !dialstackUserId) {
      return;
    }
    try {
      await dialstackInstance.initiateCall(dialstackUserId, patient.phone);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  // Format date for input
  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  // Format time for input (HH:MM)
  const formatTimeForInput = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // Handle date/time change
  const handleDateTimeChange = (
    field: "date" | "startTime" | "endTime",
    value: string,
  ) => {
    if (!appointment) return;

    const currentStart = new Date(appointment.start_at);
    const currentEnd = new Date(appointment.end_at);

    if (field === "date") {
      // Update both start and end dates, keep times
      const [year, month, day] = value.split("-").map(Number);
      const newStart = new Date(currentStart);
      newStart.setFullYear(year, month - 1, day);
      const newEnd = new Date(currentEnd);
      newEnd.setFullYear(year, month - 1, day);
      handleUpdate("start_at", newStart.toISOString());
      handleUpdate("end_at", newEnd.toISOString());
    } else if (field === "startTime") {
      const [hours, minutes] = value.split(":").map(Number);
      const newStart = new Date(currentStart);
      newStart.setHours(hours, minutes, 0, 0);
      handleUpdate("start_at", newStart.toISOString());
    } else if (field === "endTime") {
      const [hours, minutes] = value.split(":").map(Number);
      const newEnd = new Date(currentEnd);
      newEnd.setHours(hours, minutes, 0, 0);
      handleUpdate("end_at", newEnd.toISOString());
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-[380px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-40 flex flex-col shadow-2xl shadow-slate-900/10 transform transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {appointmentLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoaderCircle className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointment ? (
        <>
          {/* Header */}
          <div className="relative shrink-0 bg-white dark:bg-slate-950">
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" />
            <div className="p-5 pb-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent shadow-lg shadow-accent/25 shrink-0">
                  <Calendar className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold tracking-tight">
                    {patient
                      ? `${patient.first_name} ${patient.last_name}`
                      : "No patient assigned"}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        appointment.status === "accepted"
                          ? "default"
                          : appointment.status === "cancelled" ||
                              appointment.status === "declined"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_OPTIONS.find(
                        (s) => s.value === appointment.status,
                      )?.label || appointment.status}
                    </Badge>
                    <Badge variant="outline">
                      {TYPE_OPTIONS.find((t) => t.value === appointment.type)
                        ?.label || appointment.type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Patient Selection */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Patient</span>
                </div>
              </div>
              <div className="p-4">
                <Select
                  value={appointment.patient_id?.toString() || ""}
                  onValueChange={(value) =>
                    handleUpdate(
                      "patient_id",
                      value ? parseInt(value, 10) : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p) => (
                      <SelectItem key={p.id} value={p.id!.toString()}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Provider</span>
                </div>
              </div>
              <div className="p-4">
                <Select
                  value={appointment.provider_id?.toString() || ""}
                  onValueChange={(value) =>
                    handleUpdate(
                      "provider_id",
                      value ? parseInt(value, 10) : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map((p) => (
                      <SelectItem key={p.id} value={p.id!.toString()}>
                        {p.first_name} {p.last_name}
                        {p.specialty && ` - ${p.specialty}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Date & Time</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={formatDateForInput(appointment.start_at)}
                    onChange={(e) =>
                      handleDateTimeChange("date", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Start Time
                    </Label>
                    <Input
                      type="time"
                      value={formatTimeForInput(appointment.start_at)}
                      onChange={(e) =>
                        handleDateTimeChange("startTime", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      End Time
                    </Label>
                    <Input
                      type="time"
                      value={formatTimeForInput(appointment.end_at)}
                      onChange={(e) =>
                        handleDateTimeChange("endTime", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Type & Status */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Details</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Type
                  </Label>
                  <Select
                    value={appointment.type}
                    onValueChange={(value) => handleUpdate("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Status
                  </Label>
                  <Select
                    value={appointment.status}
                    onValueChange={(value) => handleUpdate("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Notes
                  </Label>
                  <Input
                    value={appointment.notes || ""}
                    placeholder="Add notes..."
                    onChange={(e) => handleUpdate("notes", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 p-5 pt-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <Button
                onClick={handleCallPatient}
                disabled={!patient?.phone || !dialstackUserId}
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Patient
              </Button>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Appointment
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this appointment? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
