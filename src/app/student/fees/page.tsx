'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Loader2 } from 'lucide-react';
import { Fee, UserProfile, WithId } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createRazorpayOrder } from '@/ai/flows/create-razorpay-order';


declare global {
    interface Window {
        Razorpay: any;
    }
}


const getStatusVariant = (status: 'pending' | 'paid' | 'overdue'): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'paid': return 'secondary';
        case 'overdue': return 'destructive';
        case 'pending':
        default: return 'outline';
    }
}

const isOverdue = (fee: WithId<Fee>) => {
    return fee.status === 'pending' && fee.dueDate.toDate() < new Date();
}

export default function StudentFeePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [processingFeeId, setProcessingFeeId] = useState<string | null>(null);
  
  const { data: userProfile } = useDoc<UserProfile>(
    useMemoFirebase(() => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null), [user, firestore, isUserLoading])
  );

  const { data: fees, isLoading: feesLoading } = useCollection<WithId<Fee>>(
    useMemoFirebase(() => (
        firestore && user && !isUserLoading ? 
        query(collection(firestore, 'fees'), where('studentId', '==', user.uid)) 
        : null
    ), [firestore, user, isUserLoading])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/student');
    }
  }, [isUserLoading, user, router]);


  const sortedFees = useMemo(() => {
    if (!fees) return [];
    
    const processedFees = fees.map(fee => {
        if (isOverdue(fee)) {
            return { ...fee, status: 'overdue' as const };
        }
        return fee;
    });

    // Perform client-side sorting here
    return processedFees.sort((a, b) => {
        const statusOrder = { 'pending': 1, 'overdue': 1, 'paid': 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
    });
  }, [fees]);
  
  const handlePayment = async (fee: WithId<Fee>) => {
      if (!user || !userProfile || !firestore) {
          toast({ variant: 'destructive', title: 'Error', description: 'User not logged in.' });
          return;
      }

      setProcessingFeeId(fee.id);

      try {
          if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
              throw new Error("Razorpay integration is not configured by the administrator.");
          }

          const order = await createRazorpayOrder({ amount: fee.amount });
          
          const options = {
              key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
              amount: order.amount,
              currency: order.currency,
              name: "MIT Art, Design & Technology",
              description: fee.description,
              order_id: order.orderId,
              handler: async function (response: any) {
                  const feeDocRef = doc(firestore, 'fees', fee.id);
                  await updateDoc(feeDocRef, {
                      status: 'paid',
                      paidAt: Timestamp.now(),
                      transactionId: response.razorpay_payment_id,
                  });
                  toast({ title: 'Payment Successful', description: 'Your fee has been paid.' });
              },
              prefill: {
                  name: `${userProfile.firstName} ${userProfile.lastName}`,
                  email: userProfile.email,
                  contact: userProfile.phoneNumber,
              },
              theme: {
                  color: '#3F51B5'
              }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
              toast({ variant: 'destructive', title: 'Payment Failed', description: response.error.description });
          });
          rzp.open();

      } catch (error) {
          console.error("Payment initiation failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Could not initiate payment.';
          toast({ variant: 'destructive', title: 'Error', description: errorMessage });
      } finally {
          setProcessingFeeId(null);
      }
  };


  const isLoading = feesLoading || isUserLoading;

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
        <div className="max-w-4xl mx-auto">
            <DashboardHeader
              title="Fees & Payments"
              description="View and pay your outstanding fees."
            />
            
            {isLoading ? (
                 <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : sortedFees && sortedFees.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                    {sortedFees.map(fee => (
                        <Card key={fee.id} className={cn(fee.status === 'overdue' && 'border-destructive')}>
                            <CardHeader className='flex-row justify-between items-start'>
                                <div>
                                    <CardTitle>{fee.description}</CardTitle>
                                    <CardDescription>Due by {fee.dueDate ? format(fee.dueDate.toDate(), 'PPP') : 'N/A'}</CardDescription>
                                </div>
                                <Badge variant={getStatusVariant(fee.status)} className="capitalize">
                                    {fee.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">Rs. {fee.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </CardContent>
                            {fee.status !== 'paid' && (
                                <CardFooter>
                                    <Button className='w-full' onClick={() => handlePayment(fee)} disabled={processingFeeId === fee.id}>
                                        {processingFeeId === fee.id && <Loader2 className='mr-2 animate-spin'/>}
                                        Pay Now
                                    </Button>
                                </CardFooter>
                            )}
                             {fee.status === 'paid' && fee.paidAt && (
                                <CardFooter className='text-sm text-muted-foreground'>
                                    Paid on {format(fee.paidAt.toDate(), 'PPP')}
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-16">
                    <h3 className="text-xl font-semibold">No Fees Found</h3>
                    <p>You have no pending or past fees.</p>
                </div>
            )}
        </div>
      </main>
    </SidebarInset>
  );
}
