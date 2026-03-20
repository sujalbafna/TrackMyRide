'use client';

import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Bus, Route, Stop, UserProfile, WithId } from '@/lib/types';
import { deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { BusIcon, Trash2, UserCircle, User as UserIcon, MapPin, AlertTriangle } from 'lucide-react';
import { UpdateRouteDialog } from './update-route-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface RouteListProps {
  routes: WithId<Route>[];
  stops: WithId<Stop>[];
  buses: WithId<Bus>[];
  drivers: WithId<UserProfile>[];
  students: WithId<UserProfile>[];
  faculty: WithId<UserProfile>[];
  routesWithDetails: any[];
}

export function RouteList({ 
    routes, 
    stops, 
    buses, 
    drivers, 
    students, 
    faculty,
    routesWithDetails
}: RouteListProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [routeToDelete, setRouteToDelete] = useState<WithId<Route> | null>(null);

    const handleDeleteRoute = async () => {
        if (!firestore || !routeToDelete) return;

        const batch = writeBatch(firestore);

        // 1. Unassign the bus
        if (routeToDelete.busId) {
            const busRef = doc(firestore, 'buses', routeToDelete.busId);
            batch.update(busRef, { routeId: '' });
        }
        // 2. Unassign the driver
        if (routeToDelete.driverId) {
            const driverRef = doc(firestore, 'users', routeToDelete.driverId);
            batch.update(driverRef, { routeId: '' });
        }
        // 3. Delete all stops for this route
        const routeStops = stops?.filter(s => s.routeId === routeToDelete.id) || [];
        for (const stop of routeStops) {
            batch.delete(doc(firestore, 'stops', stop.id));
        }
        // 4. Unassign all users on this route
        const allUsersOnRoute = [...(students || []), ...(faculty || [])].filter(u => u.routeId === routeToDelete.id);
        for (const user of allUsersOnRoute) {
            batch.update(doc(firestore, 'users', user.id), { busId: '', routeId: '', stopId: '' });
        }
        // 5. Delete the route itself
        batch.delete(doc(firestore, 'routes', routeToDelete.id));

        try {
            await batch.commit();
            toast({
                title: 'Route Deleted',
                description: `Route "${routeToDelete.name}" has been successfully removed.`,
            });
        } catch (error) {
            console.error("Error deleting route:", error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to delete the route.",
            });
        } finally {
            setRouteToDelete(null);
        }
    }
    
  if (routes.length === 0) {
    return (
      <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
        No routes have been created yet.
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={!!routeToDelete} onOpenChange={(open) => !open && setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the route "{routeToDelete?.name}" and all associated data, including stops and passenger assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteRoute}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <Accordion type="multiple" className="w-full">
        {routesWithDetails.map(route => (
            <AccordionItem key={route.id} value={route.id} className="border-b-0 mb-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline rounded-t-lg data-[state=open]:bg-muted/50">
                    <div className='flex flex-col md:flex-row md:items-center justify-between w-full gap-2 md:gap-4 text-left'>
                        <h3 className="text-lg font-semibold">{route.name}</h3>
                        <div className="flex gap-2 flex-wrap">
                            <Badge variant={route.assignedBus ? "secondary" : "outline"}><BusIcon className="mr-1.5" />{route.assignedBus?.busNumber || 'No Bus'}</Badge>
                            <Badge variant={route.assignedDriver ? "secondary" : "outline"}><UserCircle className="mr-1.5" />{route.assignedDriver?.firstName || 'No Driver'}</Badge>
                            <Badge variant="default">{route.stops.length} Stops</Badge>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <div className='flex justify-end gap-2 my-2'>
                        <UpdateRouteDialog 
                            route={route} 
                            routes={routes}
                            stops={route.stops} 
                            buses={buses} 
                            drivers={drivers} 
                        />
                         <Button variant="destructive" size="icon" onClick={() => setRouteToDelete(route)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    {route.stops.length > 0 ? (
                        <div className='space-y-4'>
                            {route.stops.map((stop: any, index: number) => (
                                <div key={stop.id} className='p-3 border rounded-md bg-muted/20'>
                                    <div className='flex items-center justify-between mb-2'>
                                        <h4 className='font-semibold flex items-center'><MapPin className='mr-2 text-primary'/> {index + 1}. {stop.name}</h4>
                                        <Badge variant="outline">{stop.passengers.length} Passengers</Badge>
                                    </div>
                                    {stop.passengers.length > 0 ? (
                                        <ul className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm'>
                                            {stop.passengers.map((p: any) => (
                                                <li key={p.id} className='flex items-center gap-2 p-1.5 bg-background rounded'>
                                                    <UserIcon className='h-4 w-4 text-muted-foreground'/> 
                                                    <span>{p.firstName} {p.lastName}</span>
                                                    <Badge variant="secondary" className='ml-auto capitalize text-xs'>{p.userType}</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className='text-xs text-center text-muted-foreground py-2'>No passengers assigned to this stop.</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <AlertTriangle className='h-8 w-8 mb-2'/>
                            <p className='font-semibold'>No Stops Found</p>
                            <p>This route has no stops. Edit the route to add some.</p>
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        ))}
    </Accordion>
    </>
  );
}
