
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, limit, orderBy, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { UserProfile, Bus, Stop, Route, Notification as NotificationType, WithId, Attendance } from '@/lib/types';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { MapPin, Bus as BusIcon, Siren, Loader2, Bell, Milestone, UserCircle, Phone, Check, X, Edit, Sun, Moon, Hash, Route as RouteIcon, Info } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapView } from '@/components/map-view';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn, generateDailyCode } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RouteTimeline } from '@/components/route-timeline';

const TripCheckin = ({ tripType, userProfile, attendance }: { tripType: 'morning' | 'evening', userProfile: UserProfile | null, attendance: Attendance | null }) => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSetIntention = async (intention: 'riding' | 'not_riding') => {
        if (!user || !firestore || !userProfile?.busId || !userProfile?.routeId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot update status. You are not assigned to a bus or route.' });
            return;
        }
        setIsUpdating(true);
        try {
            const checkinId = `checkin-${today}-${tripType}-${user.uid}`;
            const attendanceDocRef = doc(firestore, 'attendance', checkinId);

            const attendanceData: Partial<Attendance> = {
                id: checkinId,
                userId: user.uid,
                busId: userProfile.busId,
                routeId: userProfile.routeId,
                attendanceDate: today,
                tripType: tripType,
                intention: intention,
                markedAt: Timestamp.now(),
            };
            
            await setDoc(attendanceDocRef, attendanceData, { merge: true });

            toast({ title: 'Status Updated', description: `Your ${tripType} status has been updated.` });

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update your status.' });
        } finally {
            setIsUpdating(false);
        }
    }

    const isRiding = attendance?.intention === 'riding';
    const isNotRiding = attendance?.intention === 'not_riding';

    return (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 font-semibold">
                {tripType === 'morning' ? <Sun className="text-orange-500 w-5 h-5"/> : <Moon className="text-blue-500 w-5 h-5"/>}
                <span className="capitalize">{tripType} Trip {tripType === 'morning' ? '(To College)' : '(To Home)'}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                    className="flex-1 h-12" 
                    variant={isRiding ? 'default' : 'outline'} 
                    onClick={() => handleSetIntention('riding')} 
                    disabled={isUpdating}
                >
                    <Check className={cn('mr-2 w-4 h-4', isRiding ? 'opacity-100' : 'opacity-0')}/> Riding
                </Button>
                <Button 
                    className="flex-1 h-12" 
                    variant={isNotRiding ? 'destructive' : 'outline'} 
                    onClick={() => handleSetIntention('not_riding')} 
                    disabled={isUpdating}
                >
                    <X className={cn('mr-2 w-4 h-4', isNotRiding ? 'opacity-100' : 'opacity-0')}/> Not Riding
                </Button>
            </div>
            {attendance?.intention && (
                <p className={cn("text-xs text-center font-medium", isRiding ? "text-green-600" : "text-red-600")}>
                    Status: {isRiding ? "Confirmed" : "Opted Out"}
                </p>
            )}
        </div>
    )
}

const DailyCheckinCard = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const today = format(new Date(), 'yyyy-MM-dd');

    const attendanceQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'attendance'),
            where('userId', '==', user.uid),
            where('attendanceDate', '==', today)
        );
    }, [user, firestore, today]);

    const { data: attendanceDocs, isLoading } = useCollection<Attendance>(attendanceQuery);

    const morningAttendance = attendanceDocs?.find(a => a.tripType === 'morning') || null;
    const eveningAttendance = attendanceDocs?.find(a => a.tripType === 'evening') || null;
    
    const dailyCode = useMemo(() => user?.uid ? generateDailyCode(user.uid) : '----', [user?.uid]);

    if(isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Daily Check-in</CardTitle></CardHeader>
                <CardContent className='flex justify-center items-center h-24'>
                    <Loader2 className='animate-spin'/>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Daily Check-in</CardTitle>
                    <CardDescription>Let us know if you're taking the bus today, {format(new Date(), 'PPP')}.</CardDescription>
                </div>
                <div className="flex flex-col items-center bg-primary/10 p-3 rounded-lg border-2 border-primary/20">
                    <span className="text-[10px] uppercase font-bold text-primary/70 mb-1 flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5"/> Daily Code
                    </span>
                    <span className="text-3xl font-black tracking-widest text-primary font-mono">{dailyCode}</span>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TripCheckin tripType="morning" userProfile={userProfile} attendance={morningAttendance} />
                <TripCheckin tripType="evening" userProfile={userProfile} attendance={eveningAttendance} />
            </CardContent>
        </Card>
    );
};

const BusRouteSelectionDialog = ({ userProfile, routes, buses, stops }: { userProfile: UserProfile, routes: WithId<Route>[], buses: WithId<Bus>[], stops: WithId<Stop>[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(userProfile.routeId);
    const [selectedStopId, setSelectedStopId] = useState<string | undefined>(userProfile.stopId);
    const [isSaving, setIsSaving] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const availableStops = useMemo(() => {
        if (!selectedRouteId) return [];
        return stops.filter(s => s.routeId === selectedRouteId).sort((a,b) => (a.stopOrder || 0) - (b.stopOrder || 0));
    }, [selectedRouteId, stops]);

    useEffect(() => {
        setSelectedRouteId(userProfile.routeId);
        setSelectedStopId(userProfile.stopId);
    }, [userProfile]);
    
    useEffect(() => {
        if (availableStops.length > 0 && selectedStopId && !availableStops.find(s => s.id === selectedStopId)) {
            setSelectedStopId(undefined);
        }
    }, [selectedRouteId, availableStops, selectedStopId]);

    const handleSave = async () => {
        if (!firestore || !userProfile || !selectedRouteId || !selectedStopId) {
            toast({ variant: 'destructive', title: 'Please select a route and a stop.' });
            return;
        }

        setIsSaving(true);
        try {
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (!selectedRoute) throw new Error("Selected route not found");

            const userDocRef = doc(firestore, 'users', userProfile.id);
            await updateDoc(userDocRef, {
                routeId: selectedRouteId,
                busId: selectedRoute.busId || '',
                stopId: selectedStopId,
            });

            toast({ title: 'Success', description: 'Your bus and route have been updated.' });
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating bus/route:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update your selection.' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className='flex items-center gap-1'>
                    <Edit className="w-3 h-3"/> Change
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Choose Your Route & Stop</DialogTitle>
                    <DialogDescription>Select your desired route and pickup/drop-off stop from the lists below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Route</label>
                        <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a route" />
                            </SelectTrigger>
                            <SelectContent>
                                {routes.map(route => {
                                    const bus = buses.find(b => b.id === route.busId);
                                    return (
                                        <SelectItem key={route.id} value={route.id}>
                                            {route.name} ({bus?.busNumber || 'No Bus'})
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedRouteId && (
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Stop</label>
                            <Select value={selectedStopId} onValueChange={setSelectedStopId} disabled={availableStops.length === 0}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a stop" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStops.length > 0 ? availableStops.map(stop => (
                                        <SelectItem key={stop.id} value={stop.id}>
                                            {stop.name}
                                        </SelectItem>
                                    )) : (
                                        <div className='p-4 text-center text-sm text-muted-foreground'>No stops available for this route.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !selectedRouteId || !selectedStopId}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function StudentDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [user?.uid, isUserLoading, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { data: bus, isLoading: busLoading } = useDoc<WithId<Bus>>(
    useMemoFirebase(
      () => (userProfile?.busId && firestore ? doc(firestore, 'buses', userProfile.busId) : null),
      [userProfile?.busId, firestore]
    )
  );

  const { data: userStop, isLoading: userStopLoading } = useDoc<Stop>(
    useMemoFirebase(
      () => (userProfile?.stopId && firestore ? doc(firestore, 'stops', userProfile.stopId) : null),
      [userProfile?.stopId, firestore]
    )
  );
  
  const { data: route, isLoading: routeLoading } = useDoc<Route>(
    useMemoFirebase(
      () => (userProfile?.routeId && firestore ? doc(firestore, 'routes', userProfile.routeId) : null),
      [userProfile?.routeId, firestore]
    )
  );
  
  const { data: driver, isLoading: driverLoading } = useDoc<UserProfile>(
    useMemoFirebase(
      () => (route?.driverId && firestore ? doc(firestore, 'users', route.driverId) : null),
      [route?.driverId, firestore]
    )
  );
  
  const { data: routeStops, isLoading: routeStopsLoading } = useCollection<WithId<Stop>>(
    useMemoFirebase(
      () => (route?.id && firestore ? query(collection(firestore, 'stops'), where('routeId', '==', route.id)) : null),
      [route?.id, firestore]
    )
  );

  const notificationsQuery = useMemoFirebase(() => (user?.uid && !isUserLoading ? query(collection(firestore, 'notifications'), where('userId', '==', user.uid), orderBy('sentAt', 'desc'), limit(5)) : null), [user?.uid, isUserLoading, firestore]);

  const { data: notifications, isLoading: notificationsLoading } = useCollection<WithId<NotificationType>>(notificationsQuery);
  
  const { data: allRoutes, isLoading: allRoutesLoading } = useCollection<WithId<Route>>(useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]));
  const { data: allBuses, isLoading: allBusesLoading } = useCollection<WithId<Bus>>(useMemoFirebase(() => firestore ? collection(firestore, 'buses') : null, [firestore]));
  const { data: allStops, isLoading: allStopsLoading } = useCollection<WithId<Stop>>(useMemoFirebase(() => firestore ? collection(firestore, 'stops') : null, [firestore]));


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/student');
    }
    if (!isProfileLoading && userProfile && userProfile.userType !== 'student') {
        if(userProfile.userType === 'admin') {
            router.push('/admin');
        } else {
            router.push(`/login/${userProfile.userType}`);
        }
    }
  }, [isUserLoading, user, isProfileLoading, userProfile, router]);
  
  const isLoading = isUserLoading || isProfileLoading || busLoading || userStopLoading || routeLoading || driverLoading || notificationsLoading || routeStopsLoading || allRoutesLoading || allBusesLoading || allStopsLoading;
  
  const sortedNotifications = useMemo(() => {
    if (!notifications) return [];
    return [...notifications].sort((a, b) => b.sentAt.toDate() - a.sentAt.toDate());
  }, [notifications]);
  
  if (isLoading || !user || !userProfile || userProfile.userType !== 'student') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const recentAlert = sortedNotifications?.find(n => n.type === 'emergency' || n.type === 'delay_alert');
  const isTripActive = bus?.status === 'on_trip';

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader
            title={`Welcome, ${userProfile.firstName}!`}
            description="Here's the latest on your ride."
          />

          {recentAlert && (
            <Alert variant={recentAlert.type === 'emergency' ? 'destructive': 'default'} className='mb-6'>
                <Bell className="h-4 w-4" />
                <AlertTitle className='capitalize'>{recentAlert.type.replace('_', ' ')}</AlertTitle>
                <AlertDescription>{recentAlert.message}</AlertDescription>
            </Alert>
          )}

          {!isTripActive && bus && (
            <Alert className='mb-6 bg-blue-50 border-blue-200'>
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className='text-blue-800 font-bold'>Trip Not Started</AlertTitle>
              <AlertDescription className='text-blue-700'>The bus is currently at the base. Tracking will begin once the driver starts the journey.</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            <DailyCheckinCard userProfile={userProfile} />
            
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className={cn(isTripActive && 'border-primary ring-1 ring-primary/20')}>
                  <CardHeader className='flex-row items-center justify-between'>
                    <div>
                      <CardTitle className='flex items-center gap-2'>
                        Live Bus Location
                        {isTripActive && <Badge className='bg-green-500 animate-pulse'>LIVE NOW</Badge>}
                      </CardTitle>
                      <CardDescription>
                        Real-time road tracking and directions between stops.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[450px] bg-muted rounded-lg flex items-center justify-center border shadow-inner">
                      <MapView stops={routeStops || []} bus={bus || undefined} userStop={userStop || undefined} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                        <RouteIcon className="text-primary w-5 h-5"/>
                        <CardTitle>Route Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RouteTimeline stops={routeStops || []} userStopId={userProfile.stopId} currentStopId={bus?.currentStopId} />
                    </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className='flex justify-between items-center'>
                      <CardTitle>Route Information</CardTitle>
                      <BusRouteSelectionDialog userProfile={userProfile} routes={allRoutes || []} buses={allBuses || []} stops={allStops || []} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Milestone className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Route Name</p>
                        <p className="text-lg font-bold">{route?.name || 'Not Assigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <BusIcon className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bus Number</p>
                        <p className="text-lg font-bold">{bus?.busNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <UserCircle className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Driver</p>
                        <p className="text-lg font-bold">{driver ? `${driver.firstName} ${driver.lastName}` : 'N/A'}</p>
                        {driver?.phoneNumber && (
                          <a href={`tel:${driver.phoneNumber}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                            <Phone className='w-3 h-3'/>
                            {driver.phoneNumber}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <MapPin className="w-6 h-6 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Your Stop</p>
                        <p className="text-lg font-bold">{userStop?.name || 'Not Assigned'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>My Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                      <p><span className='font-semibold'>Department:</span> {userProfile.department || 'N/A'}</p>
                      <p><span className='font-semibold'>Roll Number:</span> {userProfile.rollNumber || 'N/A'}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
