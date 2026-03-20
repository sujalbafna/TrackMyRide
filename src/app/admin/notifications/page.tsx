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
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
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
  type: z.enum(['general', 'announcement', 'delay_alert', 'emergency']),
});

export default function NotificationPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore && user?.uid && !isUserLoading ? collection(firestore, 'users') : null), [firestore, user?.uid, isUserLoading])
  );
  
  const { data: notifications, isLoading: notificationsLoading } = useCollection<WithId<NotificationType>>(
    useMemoFirebase(() => (firestore && user?.uid && !isUserLoading ? query(collection(firestore, 'notifications'), orderBy('sentAt', 'desc')) : null), [firestore, user?.uid, isUserLoading])
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
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);


  async function onSubmit(values: z.infer<typeof notificationSchema>) {
    if (!firestore || !user || !allUsers || allUsers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: 'Cannot send notification. No users found or services unavailable.',
      });
      return;
    }

    try {
      const batch = writeBatch(firestore);

      allUsers.forEach((targetUser) => {
        const notificationRef = doc(collection(firestore, 'notifications'));
        const newNotification: Omit<NotificationType, 'id' | 'sentAt'> = {
          userId: targetUser.id,
          message: values.message,
          type: values.type,
          isRead: false,
          sentBy: user.uid,
        };
        batch.set(notificationRef, { ...newNotification, sentAt: Timestamp.now() });
      });
      
      // also save one for the admin themselves to see in history
       const adminNotificationRef = doc(collection(firestore, 'notifications'));
        const adminNotification: Omit<NotificationType, 'id' | 'sentAt'> = {
          userId: 'all', // special id for broadcast message record
          message: values.message,
          type: values.type,
          isRead: true, // admin already read it
          sentBy: user.uid,
        };
        batch.set(adminNotificationRef, { ...adminNotification, sentAt: Timestamp.now() });


      await batch.commit();

      toast({
        title: 'Notification Sent!',
        description: `Your message has been broadcast to ${allUsers.length} users.`,
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
  
  const sentNotifications = notifications?.filter(n => n.userId === 'all');
  const isLoading = usersLoading || notificationsLoading || isUserLoading;

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
          title="Notification Management"
          description="Send announcements and alerts to all users in the system."
        />
        <div className="grid gap-8 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>
                Write and send a broadcast message to all students, faculty, and drivers.
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
                                <SelectItem value="announcement">Announcement</SelectItem>
                                <SelectItem value="delay_alert">Delay Alert</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
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
                            placeholder="e.g., The university will be closed tomorrow due to heavy rain..."
                            rows={6}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" disabled={isSubmitting || isLoading}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Bell className="mr-2 h-4 w-4" />
                    )}
                    Send to All ({allUsers?.length || 0}) Users
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Sent Notifications</CardTitle>
                    <CardDescription>A history of all broadcast messages.</CardDescription>
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
                                                <Badge variant={n.type === 'emergency' ? 'destructive' : 'secondary'}>{n.type}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                 ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No notifications have been sent yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
             </Card>
        </div>
      </main>
    </SidebarInset>
  );
}
