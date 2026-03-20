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
import { RouteForm, routeSchema, type RouteFormValues } from './route-form';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bus, Route, UserProfile, WithId } from '@/lib/types';
import { useMemo } from 'react';

interface AddRouteDialogProps {
  buses: WithId<Bus>[];
  drivers: WithId<UserProfile>[];
  routes: WithId<Route>[];
}

export function AddRouteDialog({ buses, drivers, routes }: AddRouteDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: '',
      description: '',
      busId: 'unassigned',
      driverId: 'unassigned',
      stops: [{ name: '', latitude: 18.4912, longitude: 74.0255 }],
    },
  });

  const onSubmit = async (values: RouteFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Firestore not available' });
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const routeRef = doc(collection(firestore, 'routes'));
      const busId = values.busId !== 'unassigned' ? values.busId : '';
      const driverId = values.driverId !== 'unassigned' ? values.driverId : '';

      const stopIds: string[] = [];

      for (let i = 0; i < values.stops.length; i++) {
        const stopData = values.stops[i];
        if (stopData.name.trim()) {
          const stopRef = doc(collection(firestore, 'stops'));
          batch.set(stopRef, {
            name: stopData.name,
            latitude: stopData.latitude,
            longitude: stopData.longitude,
            routeId: routeRef.id,
            stopOrder: i,
          });
          stopIds.push(stopRef.id);
        }
      }

      const newRoute: Omit<Route, 'id'> = {
        name: values.name,
        description: values.description,
        busId: busId,
        driverId: driverId,
        stopOrder: stopIds,
      };
      batch.set(routeRef, newRoute);

      if (busId) {
        const busRef = doc(firestore, 'buses', busId);
        batch.update(busRef, { routeId: routeRef.id });
      }
      if (driverId) {
        const driverRef = doc(firestore, 'users', driverId);
        batch.update(driverRef, { routeId: routeRef.id });
      }

      await batch.commit();

      toast({
        title: 'Route Created',
        description: `Route "${values.name}" has been successfully created.`,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating route:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create route. Please try again.',
      });
    }
  };
  
  const unassignedBuses = useMemo(() => buses.filter(bus => !routes.some(r => r.busId === bus.id)), [buses, routes]);
  const unassignedDrivers = useMemo(() => drivers.filter(driver => !routes.some(r => r.driverId === driver.id)), [drivers, routes]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Route
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-screen-xl h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => {
          // Prevent the dialog focus trap from interfering with clicks on Google Maps suggestions
          if (e.target instanceof Element && e.target.closest('.pac-container')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Create a New Route</DialogTitle>
          <DialogDescription>
            Define a new route, add stops with coordinates, and assign a bus and driver.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <RouteForm
            form={form}
            onSubmit={onSubmit}
            buses={unassignedBuses}
            drivers={unassignedDrivers}
            buttonText="Create Route"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}