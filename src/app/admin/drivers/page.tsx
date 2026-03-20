'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Download, Loader2 } from 'lucide-react';
import { UserProfile, Route, WithId } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserTable } from '@/app/admin/users/user-table';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';


export default function DriverDetailsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'users'), where('userType', '==', 'driver')) : null), [firestore])
  );

  const { data: routes, isLoading: routesLoading } = useCollection<WithId<Route>>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'routes') : null), [firestore])
  );
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);

  const drivers = useMemo(() => users || [], [users]);

  const isLoading = usersLoading || routesLoading || isUserLoading;

  const handleExport = () => {
    if (!drivers || !routes) return;
    
    const routeMap = new Map(routes.map(route => [route.id, route.name]));

    const headers = [
      'Name', 'Email', 'Phone Number', 'License No.', 'Experience (years)', 'Assigned Route'
    ];
    
    const csvContent = [
      headers.join(','),
      ...drivers.map(driver => {
        const routeName = driver.routeId ? routeMap.get(driver.routeId) || 'Unassigned' : 'Unassigned';
        return [
            `"${driver.firstName} ${driver.lastName}"`,
            `"${driver.email || ''}"`,
            `"${driver.phoneNumber || 'N/A'}"`,
            `"${driver.licenseNumber || 'N/A'}"`,
            `"${driver.yearsOfExperience || 0}"`,
            `"${routeName}"`,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `drivers_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <DashboardHeader
                title="Driver Details"
                description="View and manage all registered drivers and their route assignments."
              />
              <Button variant="outline" onClick={handleExport} disabled={drivers.length === 0}>
                <Download className="mr-2 h-4 w-4"/>
                Export as Excel
            </Button>
            </div>
          <UserTable columns={columns(routes || [])} data={drivers} emptyMessage="No drivers found." />
        </div>
      </main>
    </SidebarInset>
  );
}
