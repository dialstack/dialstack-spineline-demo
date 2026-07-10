'use client';

import { Phone } from 'lucide-react';

export interface CallSheetHeaderProps {
  /** Bold header line (e.g. "Incoming Call" or "Softphone"). */
  title: string;
  /** Secondary line (e.g. the caller name); omitted when absent. */
  subtitle?: string | null;
  /** Icon/text scale. "md" for a sheet header, "sm" for inline use. */
  size?: 'sm' | 'md';
  /** Pulse the phone badge (incoming-call affordance). */
  pulse?: boolean;
}

/**
 * The phone-badge + title header shared by the call drawers (incoming-call
 * screen pop and the softphone drawer) so both read identically.
 */
export function CallSheetHeader({ title, subtitle, size = 'md', pulse }: CallSheetHeaderProps) {
  const badge = size === 'md' ? 'h-10 w-10' : 'h-9 w-9';
  const icon = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  const titleSize = size === 'md' ? 'text-lg' : 'text-sm';

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {pulse && <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />}
        <div
          className={`relative flex items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/25 ${badge}`}
        >
          <Phone className={`text-accent-foreground ${icon}`} />
        </div>
      </div>
      <div>
        <p className={`font-semibold tracking-tight ${titleSize}`}>{title}</p>
        {subtitle !== undefined && (
          <p className="text-sm text-muted-foreground">{subtitle || 'Unknown Caller'}</p>
        )}
      </div>
    </div>
  );
}
