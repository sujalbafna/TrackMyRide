'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2, Check, X, Mail, Phone, MapPin, Building2, CreditCard, ShieldCheck, BusFront } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { UserProfile, WithId } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const RequestCard = ({ user, onAction }: { user: WithId<UserProfile>, onAction: (id: string, status: 'approved' | 'rejected') => void }) => {
    const isDriver = user.userType === 'driver';
    const isFaculty = user.userType === 'faculty';
    const isStudent = user.userType === 'student';
    const isBuses = user.userType === 'buses';

    return (
        <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{user.firstName} {user.lastName}</CardTitle>
                        <Badge variant="outline" className="capitalize mt-1">{user.userType}</Badge>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                        {isStudent && <CreditCard className="w-5 h-5" />}
                        {isFaculty && <Building2 className="w-5 h-5" />}
                        {isDriver && <ShieldCheck className="w-5 h-5" />}
                        {isBuses && <BusFront className="w-5 h-5" />}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 pt-4 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{user.phoneNumber || 'Not provided'}</span>
                </div>
                
                {(isStudent || isFaculty) && (
                    <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="w-4 h-4 flex-shrink-0" />
                            <span>ID: {user.rollNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <span>Dept: {user.department || 'N/A'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Requested Bus Stop: {user.stopName || 'N/A'}</span>
                        </div>
                    </>
                )}

                {(isDriver || isBuses) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        <span>ID Code: {user.employeeCode || 'N/A'}</span>
                    </div>
                )}

                {isDriver && (
                    <div className="flex items-center gap-2">
                        <Badge variant={user.hasLicense ? "default" : "destructive"}>
                            {user.hasLicense ? "Valid License" : "No License"}
                        </Badge>
                    </div>
                )}
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-3 pt-4 border-t">
                <Button 
                    variant="outline" 
                    className="text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => onAction(user.id, 'rejected')}
                >
                    <X className="w-4 h-4 mr-2" /> Reject
                </Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onAction(user.id, 'approved')}
                >
                    <Check className="w-4 h-4 mr-2" /> Accept
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function RequestsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const requestsRef = useMemoFirebase(
    () => (firestore && user?.uid && !isUserLoading ? query(collection(firestore, 'users'), where('approvalStatus', '==', 'pending')) : null),
    [firestore, user?.uid, isUserLoading]
  );
  const { data: requests, isLoading: requestsLoading } = useCollection<UserProfile>(requestsRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);

  const handleAction = async (userId: string, status: 'approved' | 'rejected') => {
    if (!firestore) return;

    try {
        const userDocRef = doc(firestore, 'users', userId);
        if (status === 'approved') {
            await updateDoc(userDocRef, { approvalStatus: 'approved' });
            toast({ title: "Request Approved", description: "User has been granted access." });
        } else {
            await updateDoc(userDocRef, { approvalStatus: 'rejected' });
            toast({ title: "Request Rejected", description: "The application was declined." });
        }
    } catch (error) {
        console.error("Error updating request:", error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to process request." });
    }
  }

  const studentRequests = useMemo(() => requests?.filter(r => r.userType === 'student') || [], [requests]);
  const facultyRequests = useMemo(() => requests?.filter(r => r.userType === 'faculty') || [], [requests]);
  const driverRequests = useMemo(() => requests?.filter(r => r.userType === 'driver') || [], [requests]);
  const busesRequests = useMemo(() => requests?.filter(r => r.userType === 'buses') || [], [requests]);

  const isLoading = requestsLoading || isUserLoading;

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
        <div className="max-w-7xl mx-auto">
          <DashboardHeader
            title="Joining Requests"
            description="Review and approve new student, faculty, driver, and terminal accounts."
          />

          <Tabs defaultValue="students" className="mt-6">
            <TabsList className="mb-6">
              <TabsTrigger value="students">Students ({studentRequests.length})</TabsTrigger>
              <TabsTrigger value="faculty">Faculty ({facultyRequests.length})</TabsTrigger>
              <TabsTrigger value="drivers">Drivers ({driverRequests.length})</TabsTrigger>
              <TabsTrigger value="buses">Buses ({busesRequests.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="students">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentRequests.length > 0 ? (
                        studentRequests.map(req => (
                            <RequestCard key={req.id} user={req} onAction={handleAction} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-12 col-span-full">No pending student requests.</p>
                    )}
                </div>
            </TabsContent>
            
            <TabsContent value="faculty">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {facultyRequests.length > 0 ? (
                        facultyRequests.map(req => (
                            <RequestCard key={req.id} user={req} onAction={handleAction} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-12 col-span-full">No pending faculty requests.</p>
                    )}
                </div>
            </TabsContent>
            
            <TabsContent value="drivers">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {driverRequests.length > 0 ? (
                        driverRequests.map(req => (
                            <RequestCard key={req.id} user={req} onAction={handleAction} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-12 col-span-full">No pending driver requests.</p>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="buses">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {busesRequests.length > 0 ? (
                        busesRequests.map(req => (
                            <RequestCard key={req.id} user={req} onAction={handleAction} />
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-12 col-span-full">No pending terminal requests.</p>
                    )}
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarInset>
  );
}
