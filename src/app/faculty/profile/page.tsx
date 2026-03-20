
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Bus, Route, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SidebarInset } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';

// Schema for the profile update form
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [user, isUserLoading, firestore]
  );
  // Fetch user profile
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userProfileRef);
    
  // Fetch the user's route
  const { data: route, isLoading: routeLoading } = useDoc<Route>(useMemoFirebase(() => (userProfile?.routeId ? doc(firestore, 'routes', userProfile.routeId) : null), [userProfile?.routeId, firestore]));
  
  // Fetch the user's bus
  const { data: bus, isLoading: busLoading } = useDoc<Bus>(useMemoFirebase(() => (userProfile?.busId ? doc(firestore, 'buses', userProfile.busId) : null), [userProfile?.busId, firestore]));

  const form = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      address: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
    }
  });
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/faculty');
    }
  }, [isUserLoading, user, router]);

  // When userProfile data loads, reset the form with the current values
  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        phoneNumber: userProfile.phoneNumber || '',
        address: userProfile.address || '',
        emergencyContactName: userProfile.emergencyContactName || '',
        emergencyContactNumber: userProfile.emergencyContactNumber || '',
      });
    }
  }, [userProfile, form]);

  async function onSubmit(values: z.infer<typeof profileUpdateSchema>) {
    if (!firestore || !user) return;

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, values, { merge: true });

      toast({
        title: 'Profile Updated',
        description: 'Your information has been successfully saved.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your profile. Please try again.',
      });
    }
  }
  
  const isLoading = isUserLoading || isProfileLoading || busLoading || routeLoading;

  if(isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <DashboardHeader
          title="Profile Management"
          description="View and edit your profile information."
        />
        {!userProfile ? (
            <div className="text-center text-muted-foreground py-16">
               Could not load your profile. Please try logging in again.
            </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Update Profile</CardTitle>
              <CardDescription>
                Keep your personal information up to date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                  <Input {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                  <Input {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                          <FormLabel>Assigned Bus</FormLabel>
                          <Input value={bus?.busNumber || 'Not Assigned'} disabled />
                      </FormItem>
                      <FormItem>
                          <FormLabel>Assigned Route</FormLabel>                          <Input value={route?.name || 'Not Assigned'} disabled />
                      </FormItem>
                  </div>

                  <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                          <Input {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                          <Input {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="emergencyContactName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Emergency Contact</FormLabel>
                              <FormControl>
                                  <Input placeholder="Jane Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                      <FormField
                          control={form.control}
                          name="emergencyContactNumber"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Emergency Phone</FormLabel>
                              <FormControl>
                                  <Input placeholder="(123) 555-0101" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                  </div>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </SidebarInset>
  );
}

    