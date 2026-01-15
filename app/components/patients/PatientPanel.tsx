'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  X,
  Pencil,
  MessageSquare,
  Trash2,
  LoaderCircle,
} from 'lucide-react';
import { formatPhone, formatPhoneAsYouType, normalizePhone } from '@/lib/phone';
import { CallHistory } from '@dialstack/sdk';
import { useDialstackContext } from '@/app/hooks/EmbeddedComponentProvider';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import { EditableCell } from '@/app/components/EditableCell';
import { PatientQuickInfo } from '@/app/components/patients/PatientQuickInfo';
import type { Patient } from '@/app/models/patient';

/**
 * Delete a patient via the API
 */
const deletePatient = async (patientId: number): Promise<void> => {
  const res = await fetch(`/api/patients/${patientId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Failed to delete patient: ${res.status}`);
  }
};

interface PatientPanelProps {
  /** Patient to display (null when closed) */
  patient: Patient | null;
  /** Called when the panel should be closed */
  onClose: () => void;
}

/**
 * Patient details panel displayed as a right-side column.
 * Shows patient information with inline editing and call history.
 */
export function PatientPanel({ patient, onClose }: PatientPanelProps) {
  const queryClient = useQueryClient();
  const { dialstackInstance } = useDialstackContext();
  const [dialstackUserId, setDialstackUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isOpen = patient !== null;

  // Delete patient mutation
  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsDeleteDialogOpen(false);
      onClose();
    },
  });

  const handleDelete = () => {
    if (patient?.id) {
      deleteMutation.mutate(patient.id);
    }
  };

  // Fetch the DialStack user ID on mount for click-to-call
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/dialstack/user');
        if (response.ok) {
          const user = await response.json();
          setDialstackUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to fetch DialStack user:', error);
      }
    }

    fetchUser();
  }, []);

  // Handle call patient button
  const handleCallPatient = async () => {
    if (!patient?.phone || !dialstackInstance || !dialstackUserId) {
      return;
    }

    try {
      await dialstackInstance.initiateCall(dialstackUserId, patient.phone);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-[380px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-40 flex flex-col shadow-2xl shadow-slate-900/10 transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {patient && (
        <>
          {/* Header with gradient */}
          <div className="relative shrink-0 bg-white dark:bg-slate-950">
            {/* Accent border at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" />

            <div className="p-5 pb-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-center gap-3">
                {/* Patient avatar */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent shadow-lg shadow-accent/25 shrink-0">
                  <User className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Editable name in header */}
                  <div className="flex items-center gap-1">
                    <EditableCell
                      patient={patient}
                      field="first_name"
                      className="text-lg font-semibold tracking-tight"
                    />
                    <EditableCell
                      patient={patient}
                      field="last_name"
                      className="text-lg font-semibold tracking-tight"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {patient.status || 'Active'} Patient
                  </p>
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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Info card */}
            <PatientQuickInfo patient={patient} />

            {/* Editable info card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Contact Details</span>
                  <span className="text-xs text-muted-foreground">(click to edit)</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Phone */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    Phone
                  </label>
                  <EditableCell
                    patient={patient}
                    field="phone"
                    type="tel"
                    formatDisplay={(v) => formatPhone(v as string)}
                    formatOnChange={formatPhoneAsYouType}
                    parseValue={(v) => normalizePhone(v)}
                    className="text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Email
                  </label>
                  <EditableCell patient={patient} field="email" type="email" className="text-sm" />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Date of Birth
                  </label>
                  <EditableCell
                    patient={patient}
                    field="date_of_birth"
                    type="date"
                    className="text-sm"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <EditableCell
                    patient={patient}
                    field="status"
                    type="select"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    className="text-sm"
                  />
                </div>

                {/* Patient Since (read-only) */}
                {patient.registration_date && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Patient Since
                    </label>
                    <p className="text-sm px-1 py-0.5">
                      {new Date(patient.registration_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Call History Section */}
            {patient.phone && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Call History</span>
                  </div>
                </div>
                <div className="p-2">
                  <EmbeddedComponentContainer componentName="CallHistory">
                    <CallHistory
                      phoneNumber={patient.phone}
                      limit={5}
                      classes={{
                        base: 'rounded-lg',
                        item: 'rounded-md',
                      }}
                    />
                  </EmbeddedComponentContainer>
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer with actions */}
          <div className="shrink-0 p-5 pt-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <Button
                onClick={handleCallPatient}
                disabled={!patient.phone || !dialstackUserId}
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Patient
              </Button>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm" className="w-full" title="Send SMS">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="w-full" title="Send Email">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="w-full" title="Schedule Appointment">
                  <Calendar className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete Patient"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {patient?.first_name} {patient?.last_name}? This
              action cannot be undone.
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
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
