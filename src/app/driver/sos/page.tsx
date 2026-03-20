
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
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send SOS. User not logged in. / एसओएस नहीं भेज सका। उपयोगकर्ता लॉग इन नहीं है।' });
            return;
        }

        setIsSending(true);
        try {
            await addDoc(collection(firestore, 'sosAlerts'), {
                userId: user.uid,
                timestamp: Timestamp.now(),
                status: 'active',
                message: message,
            });
            toast({ title: 'SOS Sent! / एसओएस भेजा गया!', description: 'Your emergency alert has been sent to the administrators. / आपकी आपातकालीन चेतावनी प्रशासकों को भेज दी गई है।' });
            router.push('/driver');
        } catch (error) {
            console.error("Error sending SOS:", error);
            toast({ variant: 'destructive', title: 'Failed to Send SOS / एसओएस भेजने में विफल', description: 'Please try again. / कृपया पुन: प्रयास करें।' });
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
            title="Emergency SOS / आपातकालीन एसओएस"
            description="Send an emergency alert to the admin. / व्यवस्थापक को एक आपातकालीन चेतावनी भेजें।"
          />
          <Card className="border-destructive border-2">
            <CardHeader className='text-center'>
                <CardTitle className="text-3xl text-destructive">Send Emergency Alert / आपातकालीन चेतावनी भेजें</CardTitle>
                <CardDescription>Pressing this button will immediately notify administrators of an emergency. / इस बटन को दबाने से प्रशासकों को तुरंत एक आपात स्थिति के बारे में सूचित किया जाएगा।</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                <Textarea 
                    placeholder="Optional: Briefly describe the emergency... / वैकल्पिक: आपातकाल का संक्षिप्त विवरण दें..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                />
                <Button 
                    variant="destructive" 
                    size="lg" 
                    className="w-full h-24 text-xl"
                    onClick={handleSendSOS}
                    disabled={isSending}
                >
                    {isSending ? (
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    ) : (
                        <Siren className="mr-4 h-10 w-10" />
                    )}
                   <div className='flex flex-col items-center'>
                    <span>SEND SOS ALERT</span>
                    <span className='text-base font-normal'>एसओएस अलर्ट भेजें</span>
                   </div>
                </Button>
                <p className='text-sm text-muted-foreground text-center'>Only use this feature in a genuine emergency. / इस सुविधा का उपयोग केवल वास्तविक आपात स्थिति में करें।</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarInset>
  );
}
