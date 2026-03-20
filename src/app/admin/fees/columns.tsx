'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Fee, WithId } from '@/lib/types';
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
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';

type FeeWithStudent = WithId<Fee> & {
    studentName: string;
    studentEmail: string;
    busName: string;
}

const handleDelete = async (firestore: any, id: string, toast: any, onComplete: () => void) => {
    try {
      const feeDocRef = doc(firestore, 'fees', id);
      await deleteDoc(feeDocRef);
      toast({
        title: 'Fee Deleted',
        description: 'The fee record has been successfully removed.',
      });
    } catch (error) {
      console.error("Error deleting fee: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete fee record. Please try again.',
      });
    } finally {
        onComplete();
    }
};

const getStatusVariant = (status: 'pending' | 'paid' | 'overdue'): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'paid': return 'secondary';
        case 'overdue': return 'destructive';
        case 'pending':
        default: return 'outline';
    }
}

export const columns: ColumnDef<FeeWithStudent>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
  },
  {
    accessorKey: 'busName',
    header: 'Bus Name',
    cell: ({ row }) => {
        const busName = row.original.busName;
        return <Badge variant="outline">{busName}</Badge>;
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'))
        const formatted = amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return <div className="font-medium">Rs. {formatted}</div>
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.getValue('status') as 'pending' | 'paid' | 'overdue';
        return <Badge variant={getStatusVariant(status)} className="capitalize">{status}</Badge>
    }
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => {
        const date = row.original.dueDate?.toDate();
        return date ? format(date, 'PPP') : 'N/A';
    }
  },
  {
    accessorKey: 'paidAt',
    header: 'Paid At',
    cell: ({ row }) => {
        const date = row.original.paidAt?.toDate();
        return date ? format(date, 'PPP p') : 'N/A';
    }
  },
  {
    accessorKey: 'transactionId',
    header: 'Transaction ID',
    cell: ({ row }) => {
        const transactionId = row.original.transactionId;
        return transactionId ? <span className='font-mono text-xs'>{transactionId}</span> : 'N/A';
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const fee = row.original;
      const firestore = useFirestore();
      const { toast } = useToast();
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

      return (
        <>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the fee record
                        for {fee.studentName}.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => handleDelete(firestore, fee.id, toast, () => setIsDeleteDialogOpen(false))}
                    >
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        
            <div className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                {/* TODO: Add Edit Functionality */}
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setIsDeleteDialogOpen(true);
                    }}
                    className="text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </>
      );
    },
  },
];
