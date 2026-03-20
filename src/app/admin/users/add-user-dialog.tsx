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
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { UserForm, userSchema } from './user-form';
import { useFirestore, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';


export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      userType: 'student',
      password: '',
      phoneNumber: '',
      address: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      rollNumber: '',
      department: '',
      year: undefined,
      busId: '',
      stopId: '',
      employeeCode: '',
      designation: '',
      licenseNumber: '',
      yearsOfExperience: undefined,
      routeId: '',
    },
  });

 const handleAuthError = (error: FirebaseError) => {
    let title = 'An error occurred';
    let description = 'Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        title = 'Email Already Exists';
        description = 'An account with this email address already exists.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'The password must be at least 6 characters long.';
        break;
      default:
        description = error.message;
        break;
    }
    toast({ variant: 'destructive', title, description });
  };


  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    try {
       if (!auth || !firestore || !values.password) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Firebase not initialized or password missing.',
        });
        return;
      }

      // Create user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Prepare data for Firestore (excluding password)
      const { password, ...userData } = values;
      
      // Save private user data to 'users' collection
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        ...userData,
        id: user.uid,
      });

      toast({
        title: 'Success',
        description: 'User has been added successfully.',
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding user:', error);
       if (error instanceof FirebaseError) {
        handleAuthError(error);
      } else {
         toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to add user. Please try again.',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and add their details to the system.
          </DialogDescription>
        </DialogHeader>
        <UserForm form={form} onSubmit={onSubmit} buttonText="Add User" />
      </DialogContent>
    </Dialog>
  );
}
