'use client';

import { Calendar, FileText, DollarSign, Clock } from 'lucide-react';
import { generatePatientActivity, type PatientActivity } from '@/lib/patientActivity';
import type { Patient } from '@/app/models/patient';

interface PatientQuickInfoProps {
  patient: Patient;
  /** Compact mode for screen pop (less padding, smaller text) */
  compact?: boolean;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFutureDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Tomorrow at ${time}`;
  const dayPart = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${dayPart} at ${time}`;
}

function ActivityIcon({ type }: { type: PatientActivity['type'] }) {
  return type === 'appointment' ? (
    <Calendar className="w-3 h-3" />
  ) : (
    <FileText className="w-3 h-3" />
  );
}

export function PatientQuickInfo({ patient, compact = false }: PatientQuickInfoProps) {
  const { lastActivity, nextActivity, outstandingBalance } = generatePatientActivity(patient.id!);

  const hasBalance = outstandingBalance > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div
        className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50`}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>Quick Info</span>
        </div>
      </div>

      <div className={`${compact ? 'p-3 space-y-2 text-xs' : 'p-4 space-y-2.5 text-sm'}`}>
        {/* Last Activity - wraps to next line only if needed */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
            <ActivityIcon type={lastActivity.type} />
            Last Activity
          </span>
          <span className="font-medium ml-auto text-right">
            {lastActivity.title} ({formatRelativeDate(lastActivity.date)})
          </span>
        </div>

        {/* Next Appointment - wraps to next line only if needed */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3 h-3" />
            Next Appointment
          </span>
          <span className="font-medium ml-auto text-right">
            {nextActivity ? formatFutureDate(nextActivity.date) : 'None scheduled'}
          </span>
        </div>

        {/* Outstanding Balance */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
            <DollarSign className="w-3 h-3" />
            Balance
          </span>
          <span
            className={`font-medium ${hasBalance ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}
          >
            {hasBalance ? `$${outstandingBalance.toFixed(2)} due` : '$0.00'}
          </span>
        </div>
      </div>
    </div>
  );
}
