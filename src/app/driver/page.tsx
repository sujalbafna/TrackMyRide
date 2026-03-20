
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { UserProfile, Bus, Route, WithId, Stop, Attendance } from '@/lib/types';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlayCircle,
  Siren,
  Loader2,
  Bus as BusIcon,
  Navigation,
  Power,
  PowerOff,
  Users,
  Route as RouteIcon,
  CheckCircle2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import Link from 'next/link';
import { MapView } from '@/components/map-view';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn, getDistance } from '@/lib/utils';
import { format } from 'date-fns';
import { RouteTimeline } from '@/components/route-timeline';
import { NavigationOverlay } from '@/components/navigation-overlay';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [navData, setNavData] = useState<{ instruction: string; distance: string } | null>(null);
  const locationWatchId = useRef<number | null>(null);
  const lastUpdatedStopId = useRef<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null),
    [user, isUserLoading, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const routeRef = useMemoFirebase(
    () => (userProfile?.routeId ? doc(firestore, 'routes', userProfile.routeId) : null),
    [userProfile?.routeId, firestore]
  );
  const { data: route, isLoading: routeLoading } = useDoc<WithId<Route>>(routeRef);

  const busRef = useMemoFirebase(
    () => (route?.busId ? doc(firestore, 'buses', route.busId) : null),
    [route?.busId, firestore]
  );
  const { data: bus, isLoading: busLoading } = useDoc<WithId<Bus>>(busRef);

  const { data: routeStops, isLoading: routeStopsLoading } = useCollection<WithId<Stop>>(
    useMemoFirebase(() => (route?.id && firestore ? query(collection(firestore, 'stops'), where('routeId', '==', route.id)) : null), [route?.id, firestore])
  );

  const sortedStops = useMemo(() => {
    if (!routeStops) return [];
    return [...routeStops].sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  }, [routeStops]);

  const nextStop = useMemo(() => {
    if (!bus?.currentStopId || !sortedStops.length) return sortedStops[0];
    const currentIndex = sortedStops.findIndex(s => s.id === bus.currentStopId);
    if (currentIndex === -1 || currentIndex === sortedStops.length - 1) return null;
    return sortedStops[currentIndex + 1];
  }, [bus?.currentStopId, sortedStops]);

  const { data: todaysRiders, isLoading: ridersLoading } = useCollection<Attendance>(
    useMemoFirebase(() => (route?.id && firestore ? query(
        collection(firestore, 'attendance'), 
        where('routeId', '==', route.id),
        where('attendanceDate', '==', todayStr),
        where('intention', '==', 'riding')
    ) : null), [route?.id, firestore, todayStr])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/driver');
    }
  }, [isUserLoading, user, router]);
  
  const stopLocationSharing = () => {
    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    if(isSharingLocation) {
      setIsSharingLocation(false);
      toast({ title: "Location sharing stopped." });
    }
  }

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: "Geolocation not supported" });
      return;
    }
    if (!bus) {
      toast({ variant: 'destructive', title: "Bus not assigned" });
      return;
    }

    setIsSharingLocation(true);
    toast({ title: "Starting live location..." });

    locationWatchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (bus && firestore) {
            const busDocRef = doc(firestore, 'buses', bus.id);
            updateDoc(busDocRef, {
              currentLatitude: latitude,
              currentLongitude: longitude,
            });

            if (sortedStops.length > 0) {
                let closestStop = null;
                let minDistance = Infinity;

                for (const stop of sortedStops) {
                    if (stop.latitude && stop.longitude) {
                        const dist = getDistance(latitude, longitude, stop.latitude, stop.longitude);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestStop = stop;
                        }
                    }
                }

                const PROXIMITY_THRESHOLD = 150; 
                if (closestStop && minDistance < PROXIMITY_THRESHOLD) {
                    if (closestStop.id !== lastUpdatedStopId.current) {
                        updateDoc(busDocRef, { currentStopId: closestStop.id });
                        lastUpdatedStopId.current = closestStop.id;
                    }
                }
            }
        }
      },
      (error) => {
        console.error(error);
        stopLocationSharing();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  const handleToggleLocation = () => {
      if (isSharingLocation) {
          stopLocationSharing();
      } else {
          startLocationSharing();
      }
  };

  const handleStartTrip = async () => {
    if (!bus || !firestore || !sortedStops.length) return;
    try {
      const busDocRef = doc(firestore, 'buses', bus.id);
      await updateDoc(busDocRef, {
        status: 'on_trip',
        currentStopId: sortedStops[0].id,
      });
      lastUpdatedStopId.current = sortedStops[0].id;
      startLocationSharing();
      toast({ title: "Trip Started", description: "Safe driving!" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEndTrip = async () => {
    if (!bus || !firestore) return;
    try {
      const busDocRef = doc(firestore, 'buses', bus.id);
      await updateDoc(busDocRef, {
        status: 'idle',
        currentStopId: '',
      });
      lastUpdatedStopId.current = null;
      stopLocationSharing();
      toast({ title: "Trip Ended" });
    } catch (error) {
      console.error(error);
    }
  };

  const openExternalNavigation = (stop: Stop) => {
    if (!stop.latitude || !stop.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const isLoading = isUserLoading || isProfileLoading || routeLoading || busLoading || routeStopsLoading || ridersLoading;
  
  if (isLoading || !userProfile || userProfile.userType !== 'driver') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isTripActive = bus?.status === 'on_trip';

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader
            title={`Hello, ${userProfile.firstName}`}
            description="Manage your trip and navigation here."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="relative overflow-hidden">
                <CardHeader className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                  <div>
                    <CardTitle>{route?.name || "No Route Assigned"}</CardTitle>
                    <CardDescription>{isTripActive ? 'Live Tracking Enabled' : 'Ready to start'}</CardDescription>
                  </div>
                  {route && (
                    <div className="flex gap-2">
                      {!isTripActive ? (
                        <Button onClick={handleStartTrip} size="lg" className="bg-green-600 hover:bg-green-700">
                          <PlayCircle className="mr-2 h-5 w-5" /> Start Trip
                        </Button>
                      ) : (
                        <Button onClick={handleEndTrip} size="lg" variant="destructive">
                          <CheckCircle2 className="mr-2 h-5 w-5" /> End Trip
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="relative p-0 h-[500px]">
                  {/* Navigation Overlay from reference image */}
                  <NavigationOverlay 
                    isVisible={isTripActive} 
                    instruction={navData?.instruction} 
                    distance={navData?.distance} 
                  />
                  <div className="h-full w-full bg-muted shadow-inner">
                    <MapView 
                      stops={routeStops || []} 
                      bus={bus || undefined} 
                      onNavigationUpdate={setNavData}
                    />
                  </div>
                </CardContent>
              </Card>

              {isTripActive && nextStop && (
                <Card className='border-primary shadow-lg bg-primary/5'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Navigation className='text-primary animate-pulse'/>
                      Next Destination
                    </CardTitle>
                    <CardDescription>Launch turn-by-turn guidance for your next stop.</CardDescription>
                  </CardHeader>
                  <CardContent className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                        <div className='bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg'>
                            { (sortedStops.findIndex(s => s.id === nextStop.id) + 1) }
                        </div>
                        <div>
                            <p className='font-bold text-xl'>{nextStop.name}</p>
                            <p className='text-sm text-muted-foreground'>Driving route via Navigation SDK</p>
                        </div>
                    </div>
                    <Button size="lg" onClick={() => openExternalNavigation(nextStop)} className='w-full sm:w-auto shadow-md'>
                        <ExternalLink className='mr-2 h-5 w-5'/> Start Navigation
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                    <RouteIcon className="text-primary w-5 h-5"/>
                    <CardTitle>Journey Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <RouteTimeline stops={routeStops || []} currentStopId={bus?.currentStopId} />
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Assigned Vehicle</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <BusIcon className="w-10 h-10 text-primary" />
                        <div>
                            <p className='font-bold text-2xl'>{bus?.busNumber || 'N/A'}</p>
                            <p className='text-sm text-muted-foreground'>Capacity: {bus?.capacity || '0'}</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confirmed Riders</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{todaysRiders?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">passengers for today</p>
                  </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                      <CardTitle>Manual GPS Overrides</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Button onClick={handleToggleLocation} variant={isSharingLocation ? 'destructive' : 'outline'} disabled={!bus}>
                          {isSharingLocation ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                          {isSharingLocation ? 'Stop Sharing' : 'Force Location Share'}
                      </Button>
                      <Badge variant={isSharingLocation ? 'secondary' : 'outline'} className='justify-center py-1'>
                          {isSharingLocation ? "Automatic tracking active" : "Tracking standby"}
                      </Badge>
                    </CardContent>
                </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/driver/sos" passHref>
                    <Button variant="destructive" className="w-full h-12">
                      <Siren className="mr-2" /> SEND SOS ALERT
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
