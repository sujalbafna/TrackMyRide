
'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, where, addDoc, getDocs, limit } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2 } from 'lucide-react';
import { UserProfile, WithId } from '@/lib/types';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();


  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'users'), where('userType', '==', 'driver')) : null), [firestore])
  );
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/driver');
    }
  }, [isUserLoading, user, router]);

  const drivers = useMemo(() => users?.filter(u => u.id !== user?.uid) || [], [users, user]);

  const isLoading = usersLoading || isUserLoading;
  
  const handleSelectDriver = async (driver: WithId<UserProfile>) => {
    if (!firestore || !user) return;

    const participantIds = [user.uid, driver.id].sort();
    
    // Check if a chat already exists
    const chatQuery = query(
      collection(firestore, 'chats'),
      where('participantIds', '==', participantIds),
      limit(1)
    );

    const chatSnapshot = await getDocs(chatQuery);
    
    if (!chatSnapshot.empty) {
      // Chat exists, navigate to it
      const chatId = chatSnapshot.docs[0].id;
      router.push(`/driver/chat/${chatId}`);
    } else {
      // Create a new chat
      const newChatRef = await addDoc(collection(firestore, 'chats'), {
        participantIds: participantIds,
        lastMessage: null,
      });
      router.push(`/driver/chat/${newChatRef.id}`);
    }
  };


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
        <div className="max-w-2xl mx-auto">
          <DashboardHeader
            title="Driver Chat / चालक चैट"
            description="Select a driver to start a one-on-one conversation. / एक-एक करके बातचीत शुरू करने के लिए एक ड्राइवर का चयन करें।"
          />
          <Card>
            <CardHeader>
                <CardTitle>Select a Driver / एक ड्राइवर चुनें</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {drivers.length > 0 ? (
                    drivers.map(driver => (
                        <div 
                            key={driver.id} 
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => handleSelectDriver(driver)}
                        >
                            <div>
                                <p className="font-semibold">{driver.firstName} {driver.lastName}</p>
                                <p className="text-sm text-muted-foreground">Driver ID: {driver.employeeCode || 'N/A'}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground p-8">No other drivers found.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarInset>
  );
}
