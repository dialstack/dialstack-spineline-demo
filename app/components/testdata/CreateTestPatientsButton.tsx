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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';

const formSchema = z.object({
  count: z.string(),
});

export default function CreateTestPatientsButton({ classes }: { classes?: string }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      count: '5',
    },
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);

    const data = {
      count: parseInt(values.count, 10),
    };

    try {
      const response = await fetch('/api/testdata/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const { error } = await response.json();
        setError(error || 'Failed to create test patients');
        setLoading(false);
        return;
      }

      // Success - reload the page to show new patients
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
          Create test patients
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create test patients</DialogTitle>
          <DialogDescription>
            Generate dummy patient records for testing the CRM. These will be added to your
            practice&apos;s patient list.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of patients</FormLabel>
                  <FormControl>
                    <Select {...field} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-row justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="default" type="submit" disabled={loading}>
                Create patients{' '}
                {loading && <LoaderCircle className="ml-2 animate-spin items-center" size={20} />}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
