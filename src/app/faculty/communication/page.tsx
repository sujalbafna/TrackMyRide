
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  writeBatch,
  doc,
  Timestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarInset } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Loader2 } from 'lucide-react';
import { Notification as NotificationType, UserProfile, WithId } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const notificationSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  type: z.enum(['general', 'delay_alert']),
});

export default function CommunicationPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: facultyProfile, isLoading: facultyLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null), [user, firestore, isUserLoading])
  );
  
  const assignedBusId = facultyProfile?.busId;

  const { data: passengers, isLoading: passengersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (
        assignedBusId && firestore ? 
        query(collection(firestore, 'users'), where('busId', '==', assignedBusId)) 
        : null
    ), [assignedBusId, firestore])
  );

  const { data: sentNotifications, isLoading: notificationsLoading } = useCollection<WithId<NotificationType>>(
    useMemoFirebase(() => (
        firestore && user && !isUserLoading ? 
        query(collection(firestore, 'notifications'), where('sentBy', '==', user.uid), orderBy('sentAt', 'desc')) 
        : null
    ), [firestore, user, isUserLoading])
  );

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      message: '',
      type: 'general',
    },
  });

  const {
    formState: { isSubmitting },
  } = form;
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/faculty');
    }
  }, [isUserLoading, user, router]);


  async function onSubmit(values: z.infer<typeof notificationSchema>) {
    if (!firestore || !user || !passengers || passengers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: 'Cannot send notification. No passengers found or services unavailable.',
      });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      passengers.forEach((passenger) => {
        // Don't send notification to self
        if(passenger.id === user.uid) return;

        const notificationRef = doc(collection(firestore, 'notifications'));
        const newNotification: Omit<NotificationType, 'id' | 'sentAt'> = {
          userId: passenger.id,
          message: values.message,
          type: values.type as 'general' | 'delay_alert', // Cast to expected type
          isRead: false,
          sentBy: user.uid,
        };
        batch.set(notificationRef, { ...newNotification, sentAt: Timestamp.now() });
      });
      
      // Also save one for the faculty themselves to see in history
       const selfNotificationRef = doc(collection(firestore, 'notifications'));
        const selfNotification: Omit<NotificationType, 'id' | 'sentAt'> = {
          userId: user.uid,
          message: values.message,
          type: values.type as 'general' | 'delay_alert',
          isRead: true, // faculty already read it
          sentBy: user.uid,
        };
        batch.set(selfNotificationRef, { ...selfNotification, sentAt: Timestamp.now() });


      await batch.commit();

      toast({
        title: 'Notification Sent!',
        description: `Your message has been sent to ${passengers.length - 1} passengers.`,
      });
      form.reset();
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: 'Could not send notifications. Please try again.',
      });
    }
  }
  
  const isLoading = facultyLoading || passengersLoading || notificationsLoading || isUserLoading;

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
        <DashboardHeader
          title="Passenger Communication"
          description="Send announcements and alerts to all passengers on your bus."
        />
        {!assignedBusId ? (
            <div className="text-center text-muted-foreground py-16">
                You have not been assigned a bus. Please contact an administrator.
            </div>
        ) : (
            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                    <CardDescription>
                    Write and send a broadcast message to all passengers on your bus.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Notification Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a notification type" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="delay_alert">Delay Alert</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., The bus is running 15 minutes late..."
                                rows={6}
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" disabled={isSubmitting || isLoading || !passengers || passengers.length <= 1}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Bell className="mr-2 h-4 w-4" />
                        )}
                        Send to Passengers ({(passengers?.length || 1) - 1})
                        </Button>
                    </form>
                    </Form>
                </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sent Announcements</CardTitle>
                        <CardDescription>A history of messages you have sent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {notificationsLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sentNotifications && sentNotifications.length > 0 ? (
                                        sentNotifications.map((n) => (
                                            <TableRow key={n.id}>
                                                <TableCell>{n.sentAt ? format(n.sentAt.toDate(), 'PPP p') : 'No date'}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">{n.message}</TableCell>
                                                <TableCell>
                                                    <Badge variant='secondary'>{n.type}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                You haven't sent any announcements yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}
      </main>
    </SidebarInset>
  );
}
