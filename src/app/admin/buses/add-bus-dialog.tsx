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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { BusForm, BusFormValues, busSchema } from './bus-form';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, WithId, Route } from '@/lib/types';


interface AddBusDialogProps {
  drivers: UserProfile[];
  routes: WithId<Route>[];
}

export function AddBusDialog({ drivers, routes }: AddBusDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<BusFormValues>({
    resolver: zodResolver(busSchema),
    defaultValues: {
      busNumber: '',
      capacity: 40,
      driverId: undefined,
    },
  });

  const onSubmit = async (values: BusFormValues) => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available' });
        return;
    }
    try {
      const busRef = doc(collection(firestore, 'buses'));
      
      await setDoc(busRef, { 
        busNumber: values.busNumber,
        capacity: values.capacity,
        driverId: values.driverId,
        id: busRef.id,
        routeId: '', // A new bus won't have a route initially
        passengerIds: [], // Passengers will self-assign
      });

      toast({
        title: 'Success',
        description: 'Bus has been added successfully.',
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding bus:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add bus. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Bus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Bus</DialogTitle>
          <DialogDescription>
            Fill out the form to add a new bus and assign a driver. Passengers will choose their bus later.
          </DialogDescription>
        </DialogHeader>
        <BusForm form={form} onSubmit={onSubmit} drivers={drivers} buttonText="Add Bus" />
      </DialogContent>
    </Dialog>
  );
}
