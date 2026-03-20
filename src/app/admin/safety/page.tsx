'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2, Siren, CheckCircle, ShieldAlert, Download } from 'lucide-react';
import { SOSAlert, UserProfile, WithId } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';


const SOSCard = ({ alert, userProfile }: { alert: WithId<SOSAlert>, userProfile?: WithId<UserProfile> }) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleUpdateStatus = async (status: 'acknowledged' | 'resolved') => {
        if (!firestore) return;
        try {
            const alertRef = doc(firestore, 'sosAlerts', alert.id);
            await updateDoc(alertRef, { status });
            toast({
                title: 'Status Updated',
                description: `Alert from ${userProfile?.firstName || 'user'} has been ${status}.`,
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const getVariant = () => {
        switch (alert.status) {
            case 'active': return 'destructive';
            case 'acknowledged': return 'default';
            default: return 'outline';
        }
    }

    return (
        <Card className={cn('flex flex-col justify-between', alert.status === 'active' && 'border-destructive')}>
            <CardHeader>
                <div className='flex items-center justify-between'>
                     <CardTitle className='flex items-center gap-2'>
                        <Siren className={cn(alert.status === 'active' && 'text-destructive animate-pulse')}/>
                        SOS Alert
                    </CardTitle>
                    <Badge variant={getVariant()}>{alert.status.toUpperCase()}</Badge>
                </div>
                <CardDescription>
                     {alert.timestamp ? formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{userProfile?.firstName} {userProfile?.lastName}</p>
                        <p className="text-sm text-muted-foreground capitalize">{userProfile?.userType}</p>
                    </div>
                </div>
                {alert.message && <p className="text-sm border p-3 rounded-md bg-muted/50">{alert.message}</p>}
            </CardContent>
            <CardFooter className="flex gap-2">
                {alert.status === 'active' && (
                    <Button className='w-full' onClick={() => handleUpdateStatus('acknowledged')}>
                        <ShieldAlert className='mr-2'/>
                        Acknowledge
                    </Button>
                )}
                {alert.status === 'acknowledged' && (
                    <Button className='w-full' variant='secondary' onClick={() => handleUpdateStatus('resolved')}>
                        <CheckCircle className='mr-2'/>
                        Mark as Resolved
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}


export default function Page() {
    const firestore = useFirestore();
    const router = useRouter();
    const { user, isUserLoading } = useUser();

    const { data: alerts, isLoading: alertsLoading } = useCollection<WithId<SOSAlert>>(
        useMemoFirebase(() => (firestore ? query(collection(firestore, 'sosAlerts'), orderBy('timestamp', 'desc')) : null), [firestore])
    );
    
    const userIdsWithAlerts = useMemo(() => {
        if (!alerts) return [];
        const ids = alerts.map(a => a.userId).filter(id => !!id);
        return [...new Set(ids)];
    }, [alerts]);

    // Stabilize the dependency list for the users query using a string key.
    // This prevents re-subscribing on every alert list refresh unless IDs change.
    const userIdsKey = useMemo(() => userIdsWithAlerts.join(','), [userIdsWithAlerts]);
    
    const { data: users, isLoading: usersLoading } = useCollection<WithId<UserProfile>>(
        useMemoFirebase(
            () => (firestore && userIdsWithAlerts.length > 0 ? query(collection(firestore, 'users'), where('id', 'in', userIdsWithAlerts)) : null), 
            [firestore, userIdsKey]
        )
    );
    
    useEffect(() => {
        if (!isUserLoading && !user) {
        router.push('/login/admin');
        }
    }, [isUserLoading, user, router]);

    const isLoading = alertsLoading || usersLoading || isUserLoading;
    
    const userMap = useMemo(() => {
        const map = new Map<string, WithId<UserProfile>>();
        if (users) {
            users.forEach(u => map.set(u.id, u));
        }
        return map;
    }, [users]);

    const handleExport = () => {
        if (!alerts) return;

        const headers = [
            'User Name', 'User Email', 'User Role', 'Status', 'Message', 'Timestamp'
        ];

        const csvContent = [
            headers.join(','),
            ...alerts.map(alert => {
                const userProfile = userMap.get(alert.userId);
                return [
                    `"${userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Unknown'}"`,
                    `"${userProfile?.email || 'N/A'}"`,
                    `"${userProfile?.userType || 'N/A'}"`,
                    `"${alert.status}"`,
                    `"${alert.message?.replace(/"/g, '""') || ''}"`,
                    `"${format(alert.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss')}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'sos_alerts.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading || !user) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }
    
    const activeAlerts = alerts?.filter(a => a.status === 'active') || [];
    const acknowledgedAlerts = alerts?.filter(a => a.status === 'acknowledged') || [];
    const resolvedAlerts = alerts?.filter(a => a.status === 'resolved') || [];

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <DashboardHeader
                title="Safety & Security"
                description="Receive and manage SOS alerts from students and drivers."
            />
            <Button variant="outline" onClick={handleExport} disabled={!alerts || alerts.length === 0}>
                <Download className="mr-2 h-4 w-4"/>
                Export as Excel
            </Button>
          </div>
           <Tabs defaultValue="active">
            <TabsList className="mb-4">
                <TabsTrigger value="active">
                    Active <Badge variant={activeAlerts.length > 0 ? 'destructive' : 'secondary'} className='ml-2'>{activeAlerts.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="acknowledged">
                    Acknowledged <Badge variant='secondary' className='ml-2'>{acknowledgedAlerts.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="resolved">
                    Resolved <Badge variant='secondary' className='ml-2'>{resolvedAlerts.length}</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                {activeAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeAlerts.map(alert => (
                            <SOSCard key={alert.id} alert={alert} userProfile={users?.find(u => u.id === alert.userId)} />
                        ))}
                    </div>
                ) : <p className='text-center text-muted-foreground py-16'>No active alerts.</p>}
            </TabsContent>
            <TabsContent value="acknowledged">
                 {acknowledgedAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {acknowledgedAlerts.map(alert => (
                            <SOSCard key={alert.id} alert={alert} userProfile={users?.find(u => u.id === alert.userId)} />
                        ))}
                    </div>
                ) : <p className='text-center text-muted-foreground py-16'>No acknowledged alerts.</p>}
            </TabsContent>
            <TabsContent value="resolved">
                 {resolvedAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {resolvedAlerts.map(alert => (
                            <SOSCard key={alert.id} alert={alert} userProfile={users?.find(u => u.id === alert.userId)} />
                        ))}
                    </div>
                ) : <p className='text-center text-muted-foreground py-16'>No resolved alerts.</p>}
            </TabsContent>
           </Tabs>
        </div>
      </main>
    </SidebarInset>
  );
}
