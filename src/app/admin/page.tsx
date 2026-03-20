
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { UserProfile, Bus, Route, WithId, Stop, Attendance, SOSAlert } from '@/lib/types';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Bus as BusIcon, Users, Milestone, Siren, Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { MapView } from '@/components/map-view';
import { BusOccupancyChart } from './analytics/bus-occupancy-chart';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileQuery = useMemoFirebase(
    () =>
      user && !isUserLoading
        ? query(collection(firestore, 'users'), where('id', '==', user.uid))
        : null,
    [user, isUserLoading, firestore]
  );
  const { data: userProfileData, isLoading: isProfileLoading } =
    useCollection<UserProfile>(userProfileQuery);
  const userProfile = userProfileData?.[0];

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'users') : null), [firestore, user, isUserLoading])
  );
   // Fetch all buses
  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'buses') : null), [firestore, user, isUserLoading])
  );
  // Fetch all routes
  const { data: routes, isLoading: routesLoading } = useCollection<WithId<Route>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'routes') : null), [firestore, user, isUserLoading])
  );
  
  // Fetch all stops
  const { data: stops, isLoading: stopsLoading } = useCollection<WithId<Stop>>(
    useMemoFirebase(() => (firestore && user && !isUserLoading ? collection(firestore, 'stops') : null), [firestore, user, isUserLoading])
  );
  
  // Fetch attendance data for occupancy chart
  const { data: attendance, isLoading: attendanceLoading } = useCollection<WithId<Attendance>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'attendance'), orderBy('attendanceDate', 'desc')) : null), [firestore])
  );

  // Fetch active SOS alerts
  const { data: activeAlerts, isLoading: alertsLoading } = useCollection<WithId<SOSAlert>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'sosAlerts'), where('status', '==', 'active')) : null), [firestore])
  );


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
    if (!isProfileLoading && userProfile && userProfile.userType !== 'admin') {
      router.push(`/login/${userProfile.userType}`);
    }
  }, [isUserLoading, user, isProfileLoading, userProfile, router]);
  
  const isLoading = isUserLoading || isProfileLoading || usersLoading || busesLoading || routesLoading || stopsLoading || attendanceLoading || alertsLoading;
  
  if (isLoading || !userProfile || userProfile.userType !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalUsers = users?.length || 0;
  const activeAlertsCount = activeAlerts?.length || 0;

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader
            title="Admin Dashboard"
            description="Monitor and manage all aspects of the bus transportation system."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
                <BusIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{buses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {buses?.length === 1 ? '1 bus added' : `${buses?.length || 0} buses added`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total User + Admin</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {totalUsers === 1 ? '1 user registered' : `${totalUsers} users registered`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                <Milestone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{routes?.length || 0}</div>
                 <p className="text-xs text-muted-foreground">
                  {routes?.length === 1 ? '1 active route' : `${routes?.length || 0} active routes`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SOS Alerts</CardTitle>
                <Siren className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeAlertsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {activeAlertsCount === 1 ? '1 active alert' : `${activeAlertsCount} active alerts`}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <BusOccupancyChart buses={buses || []} attendance={attendance || []} />

          <Card>
            <CardHeader>
              <CardTitle>Live Bus Monitoring</CardTitle>
              <CardDescription>
                Real-time location of all active buses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] bg-muted rounded-lg flex items-center justify-center">
                 <MapView stops={stops || []} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarInset>
  );
}
