'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Bus, UserProfile, WithId, Route } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { UpdateBusDialog } from './update-bus-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const handleDelete = async (firestore: any, bus: WithId<Bus>, toast: any) => {
  if (window.confirm('Are you sure you want to delete this bus? This will unassign all passengers and cannot be undone.')) {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database service is not available.' });
        return;
    }
    try {
      const batch = writeBatch(firestore);

      // Delete the bus document
      const busDocRef = doc(firestore, 'buses', bus.id);
      batch.delete(busDocRef);

      // Unassign all passengers from this bus
      if (bus.passengerIds && bus.passengerIds.length > 0) {
        bus.passengerIds.forEach(passengerId => {
          const userRef = doc(firestore, 'users', passengerId);
          batch.update(userRef, { busId: '', routeId: '' });
        });
      }

      await batch.commit();

      toast({
        title: 'Bus Deleted',
        description: 'The bus and all passenger assignments have been successfully removed.',
      });
    } catch (error) {
      console.error("Error deleting bus: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete bus. Please try again.',
      });
    }
  }
};

export const columns = (
  drivers: WithId<UserProfile>[], 
  students: WithId<UserProfile>[], 
  faculty: WithId<UserProfile>[], 
  routes: WithId<Route>[]
): ColumnDef<WithId<Bus>>[] => {
  
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'busNumber',
      header: 'Bus Number',
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
    },
    {
      accessorKey: 'passengerIds',
      header: 'Passengers',
      cell: ({ row }) => {
          const bus = row.original;
          const allPassengers = [...students, ...faculty];
          const count = allPassengers.filter(p => p.busId === bus.id).length;
          return `${count} / ${bus.capacity}`;
      }
    },
    {
      accessorKey: 'driverId',
      header: 'Assigned Driver',
      cell: ({ row }) => {
          const bus = row.original;
          const driver = drivers.find(d => d.id === bus.driverId);
          return driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned';
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const firestore = useFirestore();
        const { toast } = useToast();
        const bus = row.original;
        
        return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <UpdateBusDialog bus={bus} drivers={drivers} students={students} faculty={faculty} routes={routes} />
                  <DropdownMenuItem
                    onClick={() => handleDelete(firestore, bus, toast)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        );
      },
    },
]};
