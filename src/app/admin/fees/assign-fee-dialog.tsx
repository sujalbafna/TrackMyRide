
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { FeeForm, feeSchema, FeeFormValues } from './fee-form';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { format } from 'date-fns';

interface AssignFeeDialogProps {
  students: UserProfile[];
}

export function AssignFeeDialog({ students }: AssignFeeDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      studentIds: [],
      amount: 0,
      description: '',
      dueDate: undefined,
    },
  });

  const onSubmit = async (values: FeeFormValues) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available' });
      return;
    }
    try {
      const batch = writeBatch(firestore);

      values.studentIds.forEach(studentId => {
          const feeRef = doc(collection(firestore, 'fees'));
          batch.set(feeRef, {
            studentId: studentId,
            amount: values.amount,
            description: values.description,
            status: 'pending',
            createdAt: Timestamp.now(),
            dueDate: Timestamp.fromDate(values.dueDate),
          });
      });

      await batch.commit();

      toast({
        title: 'Success',
        description: `Fee has been assigned to ${values.studentIds.length} student(s).`,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error assigning fee:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign fee. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Assign New Fee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a New Fee</DialogTitle>
          <DialogDescription>
            Select one or more students and enter the fee details below.
          </DialogDescription>
        </DialogHeader>
        <FeeForm form={form} onSubmit={onSubmit} students={students} buttonText="Assign Fee" />
      </DialogContent>
    </Dialog>
  );
}
