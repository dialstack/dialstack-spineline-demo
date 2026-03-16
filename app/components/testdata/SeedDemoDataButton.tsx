'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';

export default function SeedDemoDataButton({ classes }: { classes?: string }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/testdata/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const { error } = await response.json();
        setError(error || 'Failed to seed demo data');
        setLoading(false);
        return;
      }

      setLoading(false);
      setOpen(false);
      window.location.reload();
    } catch {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`${classes || 'border'}`} variant="ghost" size="sm">
          Seed demo data
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Seed demo data</DialogTitle>
          <DialogDescription>
            Populate the practice with realistic patient profiles and appointments for live demos.
            This will replace any existing demo data.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex flex-row justify-end space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="default" onClick={onSeed} disabled={loading}>
            Seed data{' '}
            {loading && <LoaderCircle className="ml-2 animate-spin items-center" size={20} />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
