'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2, Trash2, Download } from 'lucide-react';
import { Route, Bus, UserProfile, Stop, WithId } from '@/lib/types';
import { AddRouteDialog } from './add-route-dialog';
import { RouteList } from './route-list';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export default function RouteManagementPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: routes, isLoading: routesLoading } = useCollection<WithId<Route>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'routes') : null), [firestore, user, isUserLoading])
  );
  
  const { data: stops, isLoading: stopsLoading } = useCollection<WithId<Stop>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'stops') : null), [firestore, user, isUserLoading])
  );
  
  const { data: users, isLoading: usersLoading } = useCollection<WithId<UserProfile>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'users') : null), [firestore, user, isUserLoading])
  );

  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'buses') : null), [firestore, user, isUserLoading])
  );
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);

  const drivers = useMemo(() => users?.filter(u => u.userType === 'driver') || [], [users]);
  const students = useMemo(() => users?.filter(u => u.userType === 'student') || [], [users]);
  const faculty = useMemo(() => users?.filter(u => u.userType === 'faculty') || [], [users]);

  const isLoading = routesLoading || usersLoading || busesLoading || stopsLoading || isUserLoading;

  const routesWithDetails = useMemo(() => {
    if (!routes || !stops || !buses || !drivers || !students || !faculty) return [];
    return routes.map(route => {
        const assignedBus = buses.find((b) => b.id === route.busId);
        const assignedDriver = drivers.find((d) => d.id === route.driverId);
        const routeStops = stops
            .filter((s) => s.routeId === route.id)
            .sort((a,b) => (a.stopOrder || 0) - (b.stopOrder || 0));

        const stopsWithPassengers = routeStops.map(stop => {
            const passengers = [...students, ...faculty].filter(p => p.stopId === stop.id);
            return {
                ...stop,
                passengers
            }
        });

        return { ...route, assignedBus, assignedDriver, stops: stopsWithPassengers };
    });
  }, [routes, stops, buses, drivers, students, faculty]);

  const handleExport = () => {
    if (!routesWithDetails) return;

    const headers = [
        'Route Name',
        'Route Description',
        'Assigned Bus',
        'Assigned Driver',
        'Stop Order',
        'Stop Name',
        'Passenger Name',
        'Passenger Role'
    ];
    
    let csvContent = [headers.join(',')];

    routesWithDetails.forEach(route => {
        if (route.stops.length === 0) {
            csvContent.push([
                `"${route.name}"`,
                `"${route.description || ''}"`,
                `"${route.assignedBus?.busNumber || 'N/A'}"`,
                `"${route.assignedDriver ? `${route.assignedDriver.firstName} ${route.assignedDriver.lastName}` : 'N/A'}"`,
                'N/A',
                'No Stops',
                'N/A',
                'N/A'
            ].join(','));
        } else {
            route.stops.forEach((stop, stopIndex) => {
                if (stop.passengers.length === 0) {
                    csvContent.push([
                        `"${route.name}"`,
                        `"${route.description || ''}"`,
                        `"${route.assignedBus?.busNumber || 'N/A'}"`,
                        `"${route.assignedDriver ? `${route.assignedDriver.firstName} ${route.assignedDriver.lastName}` : 'N/A'}"`,
                        `${stopIndex + 1}`,
                        `"${stop.name}"`,
                        'No Passengers',
                        'N/A'
                    ].join(','));
                } else {
                    stop.passengers.forEach(passenger => {
                         csvContent.push([
                            `"${route.name}"`,
                            `"${route.description || ''}"`,
                            `"${route.assignedBus?.busNumber || 'N/A'}"`,
                            `"${route.assignedDriver ? `${route.assignedDriver.firstName} ${route.assignedDriver.lastName}` : 'N/A'}"`,
                            `${stopIndex + 1}`,
                            `"${stop.name}"`,
                            `"${passenger.firstName} ${passenger.lastName}"`,
                            `"${passenger.userType}"`
                        ].join(','));
                    });
                }
            });
        }
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `routes_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader
            title="Route Management"
            description="Create, view, and manage bus routes, stops, and assignments."
          />

          <div className="flex justify-end mb-4 gap-2">
            <Button variant="outline" onClick={handleExport} disabled={routesWithDetails.length === 0}>
                <Download className="mr-2 h-4 w-4"/>
                Export as Excel
            </Button>
            <AddRouteDialog
              buses={buses || []}
              drivers={drivers || []}
              routes={routes || []}
            />
          </div>
          <RouteList 
              routes={routes || []} 
              stops={stops || []} 
              buses={buses || []}
              drivers={drivers || []}
              students={students || []}
              faculty={faculty || []}
              routesWithDetails={routesWithDetails}
          />
        </div>
      </main>
    </SidebarInset>
  );
}
