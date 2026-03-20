
'use client';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { UserTable } from './user-table';
import { columns, adminColumns } from './columns';
import { Loader2, Search, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserProfile, Bus, WithId } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddUserDialog } from './add-user-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Page() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [searchQuery, setSearchQuery] = useState('');

  const usersRef = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'users') : null),
    [firestore, user, isUserLoading]
  );
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersRef);

  const busesRef = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'buses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(busesRef);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(user => 
        (user.firstName?.toLowerCase() || '').includes(lowercasedQuery) ||
        (user.lastName?.toLowerCase() || '').includes(lowercasedQuery) ||
        (user.email?.toLowerCase() || '').includes(lowercasedQuery)
    );
  }, [users, searchQuery])

  const students = useMemo(() => filteredUsers?.filter(u => u.userType === 'student') || [], [filteredUsers]);
  const faculty = useMemo(() => filteredUsers?.filter(u => u.userType === 'faculty') || [], [filteredUsers]);
  const drivers = useMemo(() => filteredUsers?.filter(u => u.userType === 'driver') || [], [filteredUsers]);
  const admins = useMemo(() => filteredUsers?.filter(u => u.userType === 'admin') || [], [filteredUsers]);

  const isLoading = usersLoading || isUserLoading || busesLoading;

  const handleExport = () => {
    if (!filteredUsers || !buses) return;
    
    const busMap = new Map(buses.map(bus => [bus.id, bus.busNumber]));

    const headers = [
      'First Name', 'Last Name', 'Email', 'Role', 'Bus Allotment'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => {
        const busAllotment = user.busId ? busMap.get(user.busId) || 'Unassigned' : 'N/A';
        return [
            `"${user.firstName || ''}"`,
            `"${user.lastName || ''}"`,
            `"${user.email || ''}"`,
            `"${user.userType || ''}"`,
            `"${busAllotment}"`,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'users.csv');
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
              title="User Management"
              description="Add, edit, and manage registered students, faculty, and drivers."
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} disabled={!filteredUsers || filteredUsers.length === 0}>
                <Download className="mr-2 h-4 w-4"/>
                Export as CSV
              </Button>
              <AddUserDialog />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-10 w-full md:w-1/2 lg:w-1/3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="students">
            <TabsList>
              <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
              <TabsTrigger value="faculty">Faculty ({faculty.length})</TabsTrigger>
              <TabsTrigger value="drivers">Drivers ({drivers.length})</TabsTrigger>
              <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="students">
              <UserTable columns={columns(buses || [])} data={students} emptyMessage="No students match your search." />
            </TabsContent>
            <TabsContent value="faculty">
              <UserTable columns={columns(buses || [])} data={faculty} emptyMessage="No faculty members match your search." />
            </TabsContent>
            <TabsContent value="drivers">
              <UserTable columns={columns(buses || [])} data={drivers} emptyMessage="No drivers match your search." />
            </TabsContent>
            <TabsContent value="admins">
              <UserTable columns={adminColumns} data={admins} emptyMessage="No admins match your search." />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarInset>
  );
}
