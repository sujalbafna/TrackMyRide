'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, getDocs, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { UserProfile, Bus, Attendance, WithId } from '@/lib/types';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, BusFront, Hash, Sun, Moon } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn, generateDailyCode } from '@/lib/utils';

export default function BusesDashboard() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
  const [inputCode, setInputCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string; name?: string } | null>(null);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
      useMemoFirebase(() => (user?.uid && !isUserLoading ? doc(firestore, 'users', user.uid) : null), [user?.uid, isUserLoading, firestore])
  );

  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
      useMemoFirebase(() => (firestore ? collection(firestore, 'buses') : null), [firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/buses');
    }
    if (!isProfileLoading && userProfile && userProfile.userType !== 'buses') {
        router.push(`/login/${userProfile.userType}`);
    }
  }, [isUserLoading, user, isProfileLoading, userProfile, router]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusId || inputCode.length !== 4 || !firestore || !user) return;

    setIsVerifying(true);
    setLastScanResult(null);

    try {
        // 1. Find the student or faculty assigned to this bus
        const usersRef = collection(firestore, 'users');
        const q = query(
            usersRef, 
            where('busId', '==', selectedBusId),
            where('userType', 'in', ['student', 'faculty'])
        );
        
        const querySnapshot = await getDocs(q);
        let foundUser: WithId<UserProfile> | null = null;

        querySnapshot.forEach((doc) => {
            const u = { id: doc.id, ...doc.data() } as WithId<UserProfile>;
            if (generateDailyCode(u.id) === inputCode) {
                foundUser = u;
            }
        });

        if (foundUser) {
            // 2. Mark attendance
            const checkinId = `checkin-${todayStr}-${tripType}-${foundUser.id}`;
            const attendanceDocRef = doc(firestore, 'attendance', checkinId);
            
            await setDoc(attendanceDocRef, {
                id: checkinId,
                userId: foundUser.id,
                busId: selectedBusId,
                routeId: foundUser.routeId || '',
                attendanceDate: todayStr,
                tripType: tripType,
                status: 'Present',
                markedBy: user.uid,
                markedAt: Timestamp.now(),
            }, { merge: true });

            setLastScanResult({ 
                success: true, 
                message: 'Attendance Marked!', 
                name: `${foundUser.firstName} ${foundUser.lastName}` 
            });
            setInputCode('');
            toast({ title: 'Success', description: `Marked present for ${foundUser.firstName}` });
        } else {
            setLastScanResult({ success: false, message: 'Invalid Code or User not on this bus.' });
        }
    } catch (error) {
        console.error(error);
        setLastScanResult({ success: false, message: 'Server Error. Try again.' });
    } finally {
        setIsVerifying(false);
    }
  };

  if (isUserLoading || isProfileLoading || busesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <DashboardHeader
            title="Bus Attendance Terminal"
            description="Enter passenger daily codes to mark them as present."
          />

          <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Terminal Setup</CardTitle>
                    <CardDescription>Select the vehicle and trip session.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Bus</label>
                        <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a bus" />
                            </SelectTrigger>
                            <SelectContent>
                                {buses?.map(bus => (
                                    <SelectItem key={bus.id} value={bus.id}>{bus.busNumber}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Trip</label>
                        <Select value={tripType} onValueChange={(v: any) => setTripType(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose trip" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="morning">
                                    <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-orange-500"/> Morning</div>
                                </SelectItem>
                                <SelectItem value="evening">
                                    <div className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-500"/> Evening</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className={cn(
                "border-2",
                !selectedBusId && "opacity-50 grayscale pointer-events-none"
            )}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="text-primary"/> Enter Passenger Code
                    </CardTitle>
                    <CardDescription>Ask the student or faculty for their 4-digit daily code from their dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div className="flex justify-center">
                            <Input 
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                placeholder="XXXX"
                                className="text-5xl h-24 text-center font-mono tracking-[1rem] max-w-[280px]"
                                maxLength={4}
                                disabled={isVerifying}
                                autoFocus
                            />
                        </div>
                        <Button 
                            type="submit" 
                            size="lg" 
                            className="w-full h-16 text-xl" 
                            disabled={isVerifying || inputCode.length !== 4}
                        >
                            {isVerifying ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle2 className="mr-2"/>}
                            Verify & Mark Present
                        </Button>
                    </form>
                </CardContent>
                {lastScanResult && (
                    <CardFooter className={cn(
                        "flex flex-col items-center justify-center p-6 border-t animate-in fade-in slide-in-from-top-4",
                        lastScanResult.success ? "bg-green-50" : "bg-red-50"
                    )}>
                        {lastScanResult.success ? (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-green-600 mb-2"/>
                                <p className="text-xl font-bold text-green-800">{lastScanResult.message}</p>
                                <p className="text-green-700">{lastScanResult.name}</p>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-12 h-12 text-red-600 mb-2"/>
                                <p className="text-xl font-bold text-red-800">{lastScanResult.message}</p>
                            </>
                        )}
                    </CardFooter>
                )}
            </Card>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
