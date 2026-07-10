'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Phone, User, Calendar, UserPlus, FileText, Loader2, Clock } from 'lucide-react';
import { formatPhone } from '@/lib/phone';
import { CallHistory } from '@dialstack/sdk/react';
import EmbeddedComponentContainer from '@/app/components/EmbeddedComponentContainer';
import { PatientQuickInfo } from '@/app/components/patients/PatientQuickInfo';
import type { Patient } from '@/app/models/patient';

export interface PatientCallCardProps {
  /** Caller phone number (E.164 or raw). */
  fromNumber: string;
  /** Matched patient, or null when no match. */
  patient: Patient | null;
  /** True while the patient lookup is in flight. */
  isLoading: boolean;
  /**
   * Show the caller's phone number row at the top (default true). The softphone
   * drawer sets this false — the SDK <Softphone> already displays the caller there,
   * so the card only needs to add the patient identification.
   */
  showCallerNumber?: boolean;
  /** Called after a quick action navigates away, so the host can dismiss/close. */
  onAction?: () => void;
}

function formatDate(d?: Date | string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * The caller + matched-patient card shown for an incoming call. Shared by the
 * ScreenPop panel and the softphone drawer so both surfaces look identical:
 * phone number, patient card (or "no match"), recent calls, and quick actions.
 */
export function PatientCallCard({
  fromNumber,
  patient,
  isLoading,
  showCallerNumber = true,
  onAction,
}: PatientCallCardProps) {
  const router = useRouter();

  const go = (href: string) => {
    router.push(href);
    onAction?.();
  };

  return (
    <div className="space-y-5">
      {/* Phone number — omitted in the softphone drawer, where the SDK <Softphone>
          already shows the caller. */}
      {showCallerNumber && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-lg tracking-wide">{formatPhone(fromNumber)}</span>
        </div>
      )}

      {/* Patient card / loading / no-match */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="ml-2 text-muted-foreground">Looking up patient...</span>
        </div>
      ) : patient ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {patient.first_name} {patient.last_name}
                </h3>
                <p className="text-sm capitalize text-muted-foreground">
                  {patient.status || 'Active'} Patient
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-4 text-sm">
            {patient.date_of_birth && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">{formatDate(patient.date_of_birth)}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Email</span>
                <span className="break-all text-right font-medium">{patient.email}</span>
              </div>
            )}
            {patient.registration_date && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patient Since</span>
                <span className="font-medium">{formatDate(patient.registration_date)}</span>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <PatientQuickInfo patient={patient} compact />
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Recent Calls</span>
            </div>
            <EmbeddedComponentContainer componentName="CallHistory">
              <CallHistory
                phoneNumber={fromNumber}
                limit={3}
                classes={{ base: 'rounded-lg', item: 'rounded-md text-sm' }}
              />
            </EmbeddedComponentContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mb-1 text-muted-foreground">No matching patient found</p>
          <p className="text-xs text-muted-foreground/70">
            Create a new patient record for this caller
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2.5 pt-2">
        {patient ? (
          <>
            <Button onClick={() => go(`/patients?highlight=${patient.id}`)} className="w-full">
              <User className="mr-2 h-4 w-4" />
              View Patient
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onAction?.()} className="w-full">
                <FileText className="mr-1.5 h-4 w-4" />
                Add Note
              </Button>
              <Button variant="outline" onClick={() => onAction?.()} className="w-full">
                <Calendar className="mr-1.5 h-4 w-4" />
                Schedule
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={() => go(`/patients?new=true&phone=${encodeURIComponent(fromNumber)}`)}
            className="w-full"
            disabled={isLoading}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create New Patient
          </Button>
        )}
      </div>
    </div>
  );
}
