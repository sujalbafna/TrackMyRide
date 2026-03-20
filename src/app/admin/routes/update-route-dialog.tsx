'use client';

import { useState, useMemo } from 'react';
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
import { Pencil } from 'lucide-react';
import { RouteForm, routeSchema, type RouteFormValues } from './route-form';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bus, Route, Stop, UserProfile, WithId } from '@/lib/types';


interface UpdateRouteDialogProps {
  route: WithId<Route>;
  routes: WithId<Route>[];
  stops: WithId<Stop>[];
  buses: WithId<Bus>[];
  drivers: WithId<UserProfile>[];
}

export function UpdateRouteDialog({ route, routes, stops, buses, drivers }: UpdateRouteDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: route.name,
      description: route.description,
      busId: route.busId || 'unassigned',
      driverId: route.driverId || 'unassigned',
      stops: stops.length > 0 ? stops.sort((a,b) => (a.stopOrder || 0) - (b.stopOrder || 0)).map(s => ({ 
          name: s.name, 
          latitude: s.latitude || 18.4912, 
          longitude: s.longitude || 74.0255 
      })) : [{ name: '', latitude: 18.4912, longitude: 74.0255 }],
    },
  });

  const onSubmit = async (values: RouteFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Firestore not available' });
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const routeRef = doc(firestore, 'routes', route.id);
      const busId = values.busId !== 'unassigned' ? values.busId : '';
      const driverId = values.driverId !== 'unassigned' ? values.driverId : '';

      // --- Stop Management ---
      const newStopIds: string[] = [];
      
      // 1. Find all current stops for this route to delete them first (to handle order changes cleanly)
      for (const stop of stops) {
          batch.delete(doc(firestore, 'stops', stop.id));
      }

      // 2. Add all stops as new entries to ensure fresh order and IDs
      for (let i = 0; i < values.stops.length; i++) {
        const stopData = values.stops[i];
        if (stopData.name.trim()) {
            const stopRef = doc(collection(firestore, 'stops'));
            batch.set(stopRef, { 
                name: stopData.name, 
                latitude: stopData.latitude,
                longitude: stopData.longitude,
                routeId: route.id, 
                stopOrder: i 
            });
            newStopIds.push(stopRef.id);
        }
      }

      // --- Update Route, Bus, Driver ---
      batch.update(routeRef, {
        name: values.name,
        description: values.description,
        busId: busId,
        driverId: driverId,
        stopOrder: newStopIds,
      });

      if (busId) {
        const busRef = doc(firestore, 'buses', busId);
        batch.update(busRef, { routeId: route.id });
      }
      if (driverId) {
        const driverRef = doc(firestore, 'users', driverId);
        batch.update(driverRef, { routeId: route.id });
      }
      
      // Handle un-assignments
      if (route.busId && route.busId !== busId) {
        batch.update(doc(firestore, 'buses', route.busId), { routeId: '' });
      }
       if (route.driverId && route.driverId !== driverId) {
        batch.update(doc(firestore, 'users', route.driverId), { routeId: '' });
      }

      await batch.commit();

      toast({
        title: 'Route Updated',
        description: 'The route has been successfully updated.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating route:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update route. Please try again.',
      });
    }
  };
  
  const unassignedBuses = useMemo(() => buses.filter(bus => !routes.some(r => r.busId === bus.id && r.id !== route.id)), [buses, routes, route.id]);
  const unassignedDrivers = useMemo(() => drivers.filter(driver => !routes.some(r => r.driverId === driver.id && r.id !== route.id)), [drivers, routes, route.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
            <Pencil className="h-4 w-4" />
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
          <DialogTitle>Edit Route</DialogTitle>
          <DialogDescription>
            Update the route details, stops with coordinates, and assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <RouteForm
            form={form}
            onSubmit={onSubmit}
            buses={unassignedBuses}
            drivers={unassignedDrivers}
            buttonText="Save Changes"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}