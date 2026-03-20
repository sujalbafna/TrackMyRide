
'use client';

import { useEffect } from 'react';
import { Loader2, UserCircle, Phone } from 'lucide-react';

import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Route, Stop, UserProfile } from '@/lib/types';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SidebarInset } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';

export default function Page() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [user, isUserLoading, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);

  const { data: route, isLoading: routeLoading } = useDoc<Route>(useMemoFirebase(() => (userProfile?.routeId ? doc(firestore, 'routes', userProfile.routeId) : null), [userProfile?.routeId]));

  const { data: driver, isLoading: driverLoading } = useDoc<UserProfile>(useMemoFirebase(() => (route?.driverId ? doc(firestore, 'users', route.driverId) : null), [route?.driverId]));

  const { data: stop, isLoading: stopLoading } = useDoc<Stop>(useMemoFirebase(() => (userProfile?.stopId ? doc(firestore, 'stops', userProfile.stopId) : null), [userProfile?.stopId]));


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/student');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading || isProfileLoading || routeLoading || driverLoading || stopLoading;

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
        <DashboardHeader
          title="My Route Details"
          description="Your assigned stop and driver information."
        />
        {!userProfile || !route ? (
          <div className="text-center text-muted-foreground py-16">
             You have not been assigned a route yet. Please contact an administrator.
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Route: {route.name}</CardTitle>
              <CardDescription>
                Below are the details for your assigned bus route.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">My Stop</h3>
                    <div className="p-4 bg-muted rounded-md">
                        <p className="text-xl font-bold">{stop?.name || 'Not Assigned'}</p>
                        <p className="text-sm text-muted-foreground">This is your designated pickup and drop-off location.</p>
                    </div>
                </div>
                 <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Driver Details</h3>
                     <div className="p-4 border rounded-md flex items-center gap-4">
                        <UserCircle className="w-10 h-10 text-primary" />
                        <div>
                        {driver ? (
                            <>
                                <p className="font-bold">{driver.firstName} {driver.lastName}</p>
                                {driver.phoneNumber && (
                                    <a href={`tel:${driver.phoneNumber}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                                    <Phone className='w-3 h-3'/>
                                    {driver.phoneNumber}
                                    </a>
                                )}
                            </>
                        ) : (
                            <p className="text-muted-foreground">No driver assigned to this route.</p>
                        )}
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}
      </main>
    </SidebarInset>
  );
}
