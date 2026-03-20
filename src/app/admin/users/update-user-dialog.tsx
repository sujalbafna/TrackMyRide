'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { UserForm, userSchema } from './user-form';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { Pencil } from 'lucide-react';

interface UpdateUserDialogProps {
  user: UserProfile;
}

// Create a schema for updates that makes password optional
const updateUserSchema = userSchema.omit({ password: true });

export function UpdateUserDialog({ user }: UpdateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof updateUserSchema>>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: user,
  });

  const onSubmit = async (values: z.infer<typeof updateUserSchema>) => {
    try {
      if (!firestore) {
        throw new Error('Firestore not available');
      }
      
      const userDocRef = doc(firestore, 'users', user.id);
      await setDoc(userDocRef, values, { merge: true });

      toast({
        title: 'Success',
        description: 'User has been updated successfully.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to this user's profile. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <UserForm form={form as any} onSubmit={onSubmit} buttonText="Save Changes" />
      </DialogContent>
    </Dialog>
  );
}
