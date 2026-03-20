'use client';

import { useState } from 'react';
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Siren, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

export default function Page() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendSOS = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send SOS. User not logged in.' });
            return;
        }

        setIsSending(true);
        try {
            await addDoc(collection(firestore, 'sosAlerts'), {
                userId: user.uid,
                timestamp: Timestamp.now(),
                status: 'active',
                message: message,
                // In a real app, you'd get the user's location here
                // location: { latitude: ..., longitude: ... }
            });
            toast({ title: 'SOS Sent!', description: 'Your emergency alert has been sent to the administrators.' });
            router.push('/student');
        } catch (error) {
            console.error("Error sending SOS:", error);
            toast({ variant: 'destructive', title: 'Failed to Send SOS', description: 'Please try again.' });
        } finally {
            setIsSending(false);
        }
    };

    if (isUserLoading) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }

  return (
    <SidebarInset>
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-xl mx-auto">
          <DashboardHeader
            title="Emergency SOS"
            description="Send an emergency alert to the admin and driver."
          />
          <Card className="border-destructive border-2">
            <CardHeader className='text-center'>
                <CardTitle className="text-3xl text-destructive">Send Emergency Alert</CardTitle>
                <CardDescription>Pressing this button will immediately notify administrators of an emergency.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                <Textarea 
                    placeholder="Optional: Briefly describe the emergency..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                />

                <Button 
                    variant="destructive" 
                    size="lg" 
                    className="w-full h-24 text-2xl"
                    onClick={handleSendSOS}
                    disabled={isSending}
                >
                    {isSending ? (
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    ) : (
                        <Siren className="mr-4 h-10 w-10" />
                    )}
                   SEND SOS ALERT
                </Button>
                <p className='text-sm text-muted-foreground text-center'>Only use this feature in a genuine emergency.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarInset>
  );
}
