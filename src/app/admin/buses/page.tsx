'use client';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { BusTable } from './bus-table';
import { columns } from './columns';
import { Loader2, Trash2, Download } from 'lucide-react';
import { AddBusDialog } from './add-bus-dialog';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserProfile, Route, WithId, Bus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RowSelectionState } from '@tanstack/react-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Page() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const usersQuery = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'users') : null),
    [firestore, user, isUserLoading]
  );
  const { data: users, isLoading: usersLoading } = useCollection<WithId<UserProfile>>(usersQuery);

  const busesRef = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'buses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(busesRef);
  
  const routesRef = useMemoFirebase(
    () => (firestore && user && !isUserLoading ? collection(firestore, 'routes') : null),
    [firestore, user, isUserLoading]
  );
  const { data: routes, isLoading: routesLoading } = useCollection<WithId<Route>>(routesRef);
  
  const drivers = useMemo(() => users?.filter(u => u.userType === 'driver') || [], [users]);
  const students = useMemo(() => users?.filter(u => u.userType === 'student') || [], [users]);
  const faculty = useMemo(() => users?.filter(u => u.userType === 'faculty') || [], [users]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);

  const isLoading = busesLoading || usersLoading || routesLoading || isUserLoading;

  const handleDeleteSelected = async () => {
    if (!firestore || !buses) return;

    const selectedBusIds = Object.keys(rowSelection).map(Number);
    const busIdsToDelete = buses.filter((bus, index) => selectedBusIds.includes(index)).map(bus => bus.id);

    try {
      const batch = writeBatch(firestore);
      
      busIdsToDelete.forEach(busId => {
        const busRef = doc(firestore, 'buses', busId);
        batch.delete(busRef);
        // In a real-world scenario, you'd also want to find all users assigned to this bus and unassign them.
      });

      await batch.commit();
      
      toast({
        title: 'Buses Deleted',
        description: `${busIdsToDelete.length} bus(es) have been successfully deleted.`,
      });
      setRowSelection({}); // Reset selection
    } catch (error) {
        console.error("Error deleting buses: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete buses. Please try again."
        });
    }
  }

  const handleExport = () => {
    if (!buses || !drivers || !students || !faculty) return;
    
    const allPassengers = [...students, ...faculty];
    const driverMap = new Map(drivers.map(d => [d.id, `${d.firstName} ${d.lastName}`]));

    const headers = [
      'Bus Number', 'Capacity', 'Passengers', 'Assigned Driver'
    ];
    
    const csvContent = [
      headers.join(','),
      ...buses.map(bus => {
        const passengerCount = allPassengers.filter(p => p.busId === bus.id).length;
        const driverName = bus.driverId ? driverMap.get(bus.driverId) || 'Unassigned' : 'Unassigned';
        return [
            `"${bus.busNumber}"`,
            `"${bus.capacity}"`,
            `"${passengerCount}"`,
            `"${driverName}"`,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `buses_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const numSelected = Object.keys(rowSelection).length;

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
            title="Bus Management"
            description="Add, edit, remove buses, and assign them to drivers. Passengers will choose their own bus."
          />
          <div className="flex justify-end mb-4 gap-2">
             <Button variant="outline" onClick={handleExport} disabled={!buses || buses.length === 0}>
                <Download className="mr-2 h-4 w-4"/>
                Export as Excel
            </Button>
            {numSelected > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({numSelected})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete {numSelected} bus(es). This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <AddBusDialog drivers={drivers} routes={routes || []} />
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <BusTable 
                columns={columns(drivers, students, faculty, routes || [])} 
                data={buses || []} 
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
            />
          )}
        </div>
      </main>
    </SidebarInset>
  );
}
