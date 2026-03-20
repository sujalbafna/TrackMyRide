'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { UserProfile, Bus, WithId } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Loader2, UserX } from 'lucide-react';
import { UpdateUserDialog } from './update-user-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { deleteUser } from '@/ai/flows/delete-user';


const UserActionsCell = ({ row }: { row: any }) => {
    const user = row.original as WithId<UserProfile>;
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDelete = async () => {
        setIsAlertOpen(false);
        setIsDeleting(true);
        try {
            const result = await deleteUser({ uid: user.id });
            if (result.success) {
                toast({
                    title: 'User Deleted',
                    description: 'The authentication account and all associated database records have been permanently removed.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: result.message,
                });
            }
        } catch (error) {
            console.error("Error calling deleteUser flow: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete user account. Please check the logs.',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the authentication account AND all associated data (attendance, alerts) for{' '}
              <strong>{user.firstName} {user.lastName}</strong>. 
              <br /><br />
              This action cannot be undone and will erase all history for this user from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="text-right">
        {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin ml-auto" />
        ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <UpdateUserDialog user={user} />
            <DropdownMenuItem
              onClick={() => setIsAlertOpen(true)}
              className="text-destructive"
            >
              <UserX className="mr-2 h-4 w-4" />
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </>
  );
};

export const adminColumns: ColumnDef<UserProfile>[] = [
    {
        accessorKey: 'firstName',
        header: 'First Name',
    },
    {
        accessorKey: 'lastName',
        header: 'Last Name',
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'userType',
        header: 'Role',
        cell: ({ row }) => {
        const user = row.original;
        return <span className="capitalize">{user.userType}</span>;
        }
    },
    {
        id: 'actions',
        cell: UserActionsCell,
    },
];

export const columns = (buses: WithId<Bus>[]): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'firstName',
    header: 'First Name',
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'userType',
    header: 'Role',
    cell: ({ row }) => {
      const user = row.original;
      return <span className="capitalize">{user.userType}</span>;
    }
  },
  {
    accessorKey: 'busId',
    header: 'Bus Allotment',
    cell: ({ row }) => {
        const user = row.original;
        if (user.userType === 'admin') return 'N/A';

        let assignedBus: WithId<Bus> | undefined;
        if (user.userType === 'driver') {
          assignedBus = buses.find(bus => bus.driverId === user.id);
        } else {
          assignedBus = buses.find(bus => bus.id === user.busId);
        }
        
        if (assignedBus) {
            return <Badge variant="secondary">{assignedBus.busNumber}</Badge>;
        }
        return <Badge variant="outline">Unassigned</Badge>;
    }
  },
  {
    id: 'actions',
    cell: UserActionsCell,
  },
];
