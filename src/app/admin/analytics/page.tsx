
'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2 } from 'lucide-react';
import { UserProfile, Bus, Route, Attendance, SOSAlert, WithId } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCards } from './stats-cards';
import { AttendanceChart } from './attendance-chart';
import { RecentAlerts } from './recent-alerts';
import { BusOccupancyChart } from './bus-occupancy-chart';


export default function Page() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore])
  );
  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'buses') : null), [firestore])
  );
  const { data: routes, isLoading: routesLoading } = useCollection<WithId<Route>>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'routes') : null), [firestore])
  );
  const { data: attendance, isLoading: attendanceLoading } = useCollection<WithId<Attendance>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'attendance'), orderBy('attendanceDate', 'desc')) : null), [firestore])
  );
  const { data: alerts, isLoading: alertsLoading } = useCollection<WithId<SOSAlert>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'sosAlerts'), orderBy('timestamp', 'desc'), limit(5)) : null), [firestore])
  );
  const { data: activeAlerts } = useCollection<WithId<SOSAlert>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'sosAlerts'), where('status', '==', 'active')) : null), [firestore])
  );
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);
  
  const students = useMemo(() => users?.filter(u => u.userType === 'student') || [], [users]);
  
  const isLoading = usersLoading || busesLoading || routesLoading || attendanceLoading || alertsLoading || isUserLoading;

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
            title="Analytics Dashboard"
            description="Overview of the system performance and safety alerts."
          />
          <div className="space-y-6">
              <StatsCards 
                students={students} 
                buses={buses || []} 
                routes={routes || []} 
                activeAlertsCount={activeAlerts?.length || 0} 
              />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <AttendanceChart attendance={attendance || []} />
                  <RecentAlerts alerts={alerts || []} users={users || []} />
              </div>
              <BusOccupancyChart buses={buses || []} attendance={attendance || []} />
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
