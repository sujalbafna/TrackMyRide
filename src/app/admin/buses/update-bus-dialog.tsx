'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { BusForm, busSchema, BusFormValues } from './bus-form';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bus, UserProfile, WithId, Route } from '@/lib/types';
import { Pencil } from 'lucide-react';

interface UpdateBusDialogProps {
  bus: WithId<Bus>;
  drivers: UserProfile[];
  routes: WithId<Route>[];
}

export function UpdateBusDialog({ bus, drivers, routes }: UpdateBusDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<BusFormValues>({
    resolver: zodResolver(busSchema),
    defaultValues: {
        busNumber: bus.busNumber,
        capacity: bus.capacity,
        driverId: bus.driverId,
    },
  });

  const onSubmit = async (values: BusFormValues) => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available' });
        return;
    }
    
    try {
      const busDocRef = doc(firestore, 'buses', bus.id);

      const dataToUpdate: Partial<Bus> = { 
          busNumber: values.busNumber,
          capacity: values.capacity,
          driverId: values.driverId === 'unassigned' ? '' : values.driverId,
      };
      
      await setDoc(busDocRef, dataToUpdate, { merge: true });
      
      toast({
        title: 'Success',
        description: 'Bus has been updated successfully.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating bus:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update bus. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bus Details</DialogTitle>
          <DialogDescription>
            Update the bus information and driver assignment.
          </DialogDescription>
        </DialogHeader>
        <BusForm form={form} onSubmit={onSubmit} drivers={drivers} buttonText="Save Changes" />
      </DialogContent>
    </Dialog>
  );
}
