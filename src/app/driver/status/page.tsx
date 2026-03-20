
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { UserProfile, Route, WithId, Stop } from '@/lib/types';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Loader2,
  AlertTriangle,
  User as UserIcon,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';


export default function Page() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // 1. Fetch the driver's profile first.
  const userProfileRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [user, isUserLoading, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // 2. Fetch the assigned route, but only if userProfile.routeId exists.
  const routeRef = useMemoFirebase(
    () => (userProfile?.routeId ? doc(firestore, 'routes', userProfile.routeId) : null),
    [userProfile?.routeId, firestore]
  );
  const { data: route, isLoading: routeLoading } = useDoc<WithId<Route>>(routeRef);

  // 3. Fetch the stops for this route.
  const { data: unsortedStops, isLoading: stopsLoading } = useCollection<WithId<Stop>>(
      useMemoFirebase(() => (
          route?.id ? query(collection(firestore, 'stops'), where('routeId', '==', route.id)) : null
      ), [route?.id, firestore])
  );
  
  // 4. Fetch all users assigned to the route
  const { data: passengers, isLoading: usersLoading } = useCollection<WithId<UserProfile>>(
      useMemoFirebase(() => (route?.id && firestore ? query(collection(firestore, 'users'), where('routeId', '==', route.id)) : null), [route?.id, firestore])
  );

  const stopsWithPassengers = useMemo(() => {
    if (!unsortedStops || !passengers) return [];
    
    const sortedStops = [...unsortedStops].sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));

    return sortedStops.map(stop => {
      const stopPassengers = passengers.filter(p => p.stopId === stop.id);
      return {
        ...stop,
        passengers: stopPassengers,
      };
    });
  }, [unsortedStops, passengers]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/driver');
    }
  }, [isUserLoading, user, router]);


  const isLoading = isUserLoading || isProfileLoading || routeLoading || stopsLoading || usersLoading;


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
        <div className="max-w-4xl mx-auto">
          <DashboardHeader
            title="Passenger & Stop List / यात्री और स्टॉप सूची"
            description="View all stops and assigned passengers for your route. / अपने मार्ग के लिए सभी स्टॉप और निर्धारित यात्रियों को देखें।"
          />
          {!route ? (
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className='flex items-center justify-center gap-2'><AlertTriangle className='text-destructive'/>No Route Assigned</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-muted-foreground'>You have not been assigned a route. Please contact an administrator.</p>
                </CardContent>
            </Card>
          ) : (
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-center'>
                        <CardTitle className='flex items-center gap-2'>{route.name}</CardTitle>
                    </div>
                    <CardDescription>{route.description || 'No description for this route.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stopsWithPassengers && stopsWithPassengers.length > 0 ? (
                         <Accordion type="multiple" className="w-full">
                            {stopsWithPassengers.map((stop, index) => (
                                <AccordionItem key={stop.id} value={stop.id}>
                                    <AccordionTrigger className="hover:bg-muted/50 px-4">
                                        <div className="flex justify-between w-full pr-4 items-center">
                                            <h3 className="font-semibold text-lg text-left">
                                                <span className="text-primary mr-2">{index + 1}.</span>
                                                {stop.name}
                                            </h3>
                                            <Badge variant="secondary">{stop.passengers?.length || 0} Passengers</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-muted/20">
                                       {stop.passengers && stop.passengers.length > 0 ? (
                                           <ul className='space-y-3'>
                                               {stop.passengers.map(passenger => (
                                                   <li key={passenger.id} className='flex items-center gap-3 p-2 border-b'>
                                                        <UserIcon className='h-5 w-5 text-muted-foreground'/>
                                                        <div className='flex-grow'>
                                                            <p className='font-medium'>{passenger.firstName} {passenger.lastName}</p>
                                                            <p className='text-xs text-muted-foreground capitalize'>{passenger.userType}</p>
                                                        </div>
                                                   </li>
                                               ))}
                                           </ul>
                                       ) : (
                                           <p className='text-center text-muted-foreground p-4'>No passengers assigned to this stop.</p>
                                       )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                         </Accordion>
                    ) : (
                        <div className="text-center text-muted-foreground py-16">
                            No stops have been assigned to this route yet.
                        </div>
                    )}
                </CardContent>
            </Card>
          )}
        </div>
      </main>
    </SidebarInset>
  );
}
