'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { UserProfile, WithId } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
import { deleteUser } from '@/ai/flows/delete-user';

const AccountActions = ({ row }: { row: any }) => {
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
              Delete Account
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

export const columns: ColumnDef<UserProfile>[] = [
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
      return <Badge variant="secondary" className="capitalize">{user.userType}</Badge>;
    }
  },
  {
    id: 'actions',
    cell: AccountActions,
  },
];
