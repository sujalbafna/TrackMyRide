'use client';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const busSchema = z.object({
  busNumber: z.string().min(1, 'Bus number is required'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  driverId: z.string().optional(),
});

export type BusFormValues = z.infer<typeof busSchema>;


interface BusFormProps {
  form: UseFormReturn<BusFormValues>;
  onSubmit: (values: BusFormValues) => void;
  drivers: UserProfile[];
  buttonText?: string;
}

export function BusForm({
  form,
  onSubmit,
  drivers,
  buttonText = 'Submit',
}: BusFormProps) {
  const {
    formState: { isSubmitting },
  } = form;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="busNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bus Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., KA01AB1234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity</FormLabel>
              <FormControl>
                <Input type="number" placeholder="50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="driverId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Driver (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a driver" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassign Driver</SelectItem>
                        {drivers.map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>
                                {driver.firstName} {driver.lastName} ({driver.employeeCode || 'No ID'})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </form>
    </Form>
  );
}
