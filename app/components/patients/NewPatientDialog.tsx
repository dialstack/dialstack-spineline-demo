'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhone } from '@/lib/phone';
import type { Patient } from '@/app/models/patient';

interface NewPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Caller's number when creating from a call; stored with the patient. */
  phone?: string;
  /** Saves the patient; only called once both names are filled in. */
  onCreate: (data: Partial<Patient>) => void;
  isPending: boolean;
}

/**
 * Asks for a new patient's name before anything is saved, so an abandoned
 * "Add Patient" leaves no placeholder record behind (a placeholder holding a
 * caller's phone would then pop up for that caller instead of the real patient).
 */
export function NewPatientDialog({ open, onOpenChange, ...formProps }: NewPatientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* DialogContent unmounts when closed, so the form starts empty each time. */}
        <NewPatientForm {...formProps} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NewPatientForm({
  phone,
  onCreate,
  isPending,
  onCancel,
}: Omit<NewPatientDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const canSave = firstName.trim() !== '' && lastName.trim() !== '' && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onCreate({ first_name: firstName.trim(), last_name: lastName.trim(), phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>New patient</DialogTitle>
        {phone && <DialogDescription>Phone: {formatPhone(phone)}</DialogDescription>}
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-patient-first">First name</Label>
          <Input
            id="new-patient-first"
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-patient-last">Last name</Label>
          <Input
            id="new-patient-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave}>
          {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Create patient
        </Button>
      </DialogFooter>
    </form>
  );
}
