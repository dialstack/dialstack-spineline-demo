'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Accessible sheet title (Radix a11y contract). When `header` is supplied the
   * visible header is `header` and this title is rendered visually-hidden;
   * otherwise this text IS the visible header.
   */
  title: string;
  /**
   * Accessible description wired to the dialog's `aria-describedby` (Radix warns
   * when a Dialog has none). Rendered visually-hidden — it's the screen-reader
   * announcement for the drawer (e.g. the caller name, or "Browser softphone").
   */
  description: string;
  /** Optional custom visible header (e.g. a shared badge header). */
  header?: React.ReactNode;
  /** Pulse the accent bar (used by the incoming-call screen pop). */
  pulse?: boolean;
  children: React.ReactNode;
}

/**
 * The shared right-side call drawer chrome — the Radix Sheet, the fixed width,
 * the accent underline, and the gradient header — used by both the incoming-call
 * screen pop and the softphone drawer so the two call surfaces are identical.
 * Panels supply only their header content + body.
 */
export function CallSheet({
  open,
  onOpenChange,
  title,
  description,
  header,
  pulse,
  children,
}: CallSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[340px] overflow-y-auto bg-white p-0 sm:w-[380px] dark:bg-slate-950"
      >
        <div className="relative">
          <div
            className={`absolute inset-x-0 bottom-0 h-[2px] bg-accent ${pulse ? 'animate-pulse' : ''}`}
          />
          <SheetHeader className="bg-gradient-to-b from-slate-50 to-white p-5 pb-4 dark:from-slate-900 dark:to-slate-950">
            {header ? (
              <>
                <SheetTitle className="sr-only">{title}</SheetTitle>
                {header}
              </>
            ) : (
              <SheetTitle className="text-lg font-semibold tracking-tight">{title}</SheetTitle>
            )}
            <SheetDescription className="sr-only">{description}</SheetDescription>
          </SheetHeader>
        </div>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
