
'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, query, setDoc, where, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Attendance, Bus, Route, Stop, UserProfile, WithId, Notification as NotificationType } from '@/lib/types';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, getYear, getMonth, parseISO, isWithinInterval } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';


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
    
  // Fetch the user's bus
  const { data: bus, isLoading: busLoading } = useDoc<Bus>(useMemoFirebase(() => (userProfile?.busId ? doc(firestore, 'buses', userProfile.busId) : null), [userProfile?.busId, firestore]));

  // Fetch the user's route
  const { data: route, isLoading: routeLoading } = useDoc<Route>(useMemoFirebase(() => (userProfile?.routeId ? doc(firestore, 'routes', userProfile.routeId) : null), [userProfile?.routeId, firestore]));

  // Fetch user's attendance records
  const { data: attendance, isLoading: attendanceLoading } = useCollection<WithId<Attendance>>(
    useMemoFirebase(() => (user && !isUserLoading && firestore ? query(collection(firestore, 'attendance'), where('userId', '==', user.uid)) : null), [user, firestore, isUserLoading])
  );
  
  // Fetch user's notifications
  const { data: notifications, isLoading: notificationsLoading } = useCollection<WithId<NotificationType>>(
    useMemoFirebase(() => (user && !isUserLoading && firestore ? query(collection(firestore, 'notifications'), where('userId', '==', user.uid), orderBy('sentAt', 'desc')) : null), [user, isUserLoading, firestore])
  );


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
      router.push('/login/student');
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
  
  const dailyAttendanceByMonth = useMemo(() => {
    if (!attendance) return {};
    
    // Create a map for quick lookups
    const attendanceMap = new Map(attendance.map(a => [a.attendanceDate, a.status]));
    
    const dailyRecords: { id: string; date: Date; status: 'Present' | 'Absent'; }[] = [];
    
    // Create records for all days where attendance was marked
    attendance.forEach(att => {
        dailyRecords.push({
            id: att.attendanceDate,
            date: parseISO(att.attendanceDate),
            status: att.status
        });
    });

    // To ensure we show 'Absent' for days that were not marked,
    // we need a range. Let's assume the school year or semester defines this range.
    // For simplicity here, we'll iterate through all unique months present in the attendance data.
    const allDatesPresent = new Set(dailyRecords.map(r => r.id));

    attendance.forEach(att => {
        const recordDate = parseISO(att.attendanceDate);
        const startOfMonth = new Date(recordDate.getFullYear(), recordDate.getMonth(), 1);
        const endOfMonth = new Date(recordDate.getFullYear(), recordDate.getMonth() + 1, 0);

        for (let d = startOfMonth; d <= endOfMonth; d.setDate(d.getDate() + 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            if (!allDatesPresent.has(dateStr)) {
                 dailyRecords.push({
                    id: dateStr,
                    date: new Date(d),
                    status: 'Absent'
                });
                allDatesPresent.add(dateStr);
            }
        }
    });

  
    // Group by month
    return dailyRecords.reduce((acc, record) => {
      const monthKey = format(record.date, 'MMMM yyyy');
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(record);
      // Sort records within the month by date ascending
      acc[monthKey].sort((a,b) => a.date.getTime() - b.date.getTime());
      return acc;
    }, {} as Record<string, typeof dailyRecords>);

  }, [attendance]);
  

  const monthlyAttendance = useMemo(() => {
    if (Object.keys(dailyAttendanceByMonth).length === 0) return [];
  
    return Object.entries(dailyAttendanceByMonth)
      .map(([month, records]) => {
        const presentCount = records.filter(r => r.status === 'Present').length;
        const totalDays = records.length;
        return {
          month,
          present: presentCount,
          total: totalDays,
          percentage: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0,
        };
      })
      .sort((a, b) => parseISO(a.month).getTime() - parseISO(b.month).getTime()).reverse();
  }, [dailyAttendanceByMonth]);


  const isLoading = isUserLoading || isProfileLoading || attendanceLoading || busLoading || routeLoading || notificationsLoading;

  const attendancePercentage = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0;
    const totalDays = Object.values(dailyAttendanceByMonth).reduce((sum, records) => sum + records.length, 0);
    if (totalDays === 0) return 0;
    const presentCount = Object.values(dailyAttendanceByMonth).reduce((sum, records) => sum + records.filter(r => r.status === 'Present').length, 0);
    return Math.round((presentCount / totalDays) * 100);
  }, [attendance, dailyAttendanceByMonth]);


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
          title="Profile & History"
          description="View and edit your profile, and see your booking and attendance history."
        />
        {!userProfile ? (
            <div className="text-center text-muted-foreground py-16">
               Could not load your profile. Please try logging in again.
            </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-1 xl:grid-cols-2">
            <div className='space-y-8'>
                <Card>
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
                                <FormLabel>Assigned Route</FormLabel>
                                <Input value={route?.name || 'Not Assigned'} disabled />
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

                <Card>
                    <CardHeader>
                        <CardTitle>Notifications Inbox</CardTitle>
                        <CardDescription>A history of all messages and alerts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications && notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <TableRow key={n.id}>
                                            <TableCell>{n.sentAt ? format(n.sentAt.toDate(), 'P p') : 'No date'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{n.message}</TableCell>
                                            <TableCell>
                                                <Badge variant={n.type === 'emergency' ? 'destructive' : 'secondary'}>{n.type}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            You have no notifications yet.
                                        </TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Monthly Attendance Summary</CardTitle>
                        <CardDescription>Your attendance summary by month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthlyAttendance.length > 0 ? (
                            <ul className="space-y-4">
                                {monthlyAttendance.map(month => (
                                    <li key={month.month} className="space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-semibold">{month.month}</p>
                                            <p className="text-sm text-muted-foreground">{month.present} / {month.total} days</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={month.percentage} className="w-full" />
                                            <span className="text-sm font-medium">{month.percentage}%</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No monthly attendance data available yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className='flex flex-col sm:flex-row justify-between sm:items-start'>
                            <div>
                                <CardTitle>Daily Attendance History</CardTitle>
                                <CardDescription>Your complete attendance record by month.</CardDescription>
                            </div>
                            <div className="text-right mt-2 sm:mt-0">
                            <p className="text-2xl font-bold">{attendancePercentage}%</p>
                            <p className="text-sm text-muted-foreground">Overall</p>
                            </div>
                        </div>
                        <Progress value={attendancePercentage} className="w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                        {Object.keys(dailyAttendanceByMonth).length > 0 ? (
                            Object.keys(dailyAttendanceByMonth).sort((a,b) => parseISO(b).getTime() - parseISO(a).getTime()).map(month => (
                            <AccordionItem value={month} key={month}>
                                <AccordionTrigger>{month}</AccordionTrigger>
                                <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {dailyAttendanceByMonth[month].map((record) => (
                                        <TableRow key={record.id}>
                                        <TableCell>{format(record.date, 'PPP')}</TableCell>
                                        <TableCell>
                                            <Badge variant={record.status === 'Present' ? 'secondary' : 'outline'}>
                                            {record.status}
                                            </Badge>
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </AccordionContent>
                            </AccordionItem>
                            ))
                        ) : (
                            <div className="h-24 text-center text-muted-foreground flex items-center justify-center">
                            <p>You have no attendance records yet.</p>
                            </div>
                        )}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
          </div>
        )}
      </main>
    </SidebarInset>
  );
}

    