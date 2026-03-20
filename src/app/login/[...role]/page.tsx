
'use client';

import { useParams, useRouter } from 'next/navigation';
import { LoginPageForm } from '../login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Bus, User, UserCog, UserCheck, CircleUserRound, ChevronLeft, BusFront } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const roleDetails: { [key: string]: { icon: React.ReactNode; dashboard: string } } = {
  admin: { icon: <UserCog className="w-12 h-12" />, dashboard: '/admin' },
  student: { icon: <User className="w-12 h-12" />, dashboard: '/student' },
  faculty: { icon: <UserCheck className="w-12 h-12" />, dashboard: '/faculty' },
  driver: { icon: <CircleUserRound className="w-12 h-12" />, dashboard: '/driver' },
  buses: { icon: <BusFront className="w-12 h-12" />, dashboard: '/buses' },
};

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const role = Array.isArray(params.role) ? params.role[0] : 'student';

  const userProfileRef = useMemoFirebase(
    () => (user && !isAuthLoading ? doc(firestore, 'users', user.uid) : null),
    [user, firestore, isAuthLoading]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isLoading = isAuthLoading || (user && isProfileLoading);

  useEffect(() => {
    const targetDashboard = roleDetails[role]?.dashboard;

    if (!role || !targetDashboard) {
      router.replace('/login');
      return;
    }
    
    if (!isLoading) {
        if (user && userProfile?.userType) {
            if (userProfile.userType === role) {
                router.replace(targetDashboard);
            }
        }
    }
  }, [isLoading, user, userProfile, role, router]);
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!role || !roleDetails[role]) {
     return (
         <div className="flex min-h-screen items-center justify-center">
            <p>Invalid role selected.</p>
        </div>
    );
  }

  const { icon, dashboard } = roleDetails[role];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">
       <div className="absolute inset-0 -z-10">
        <Image
          src="https://plus.unsplash.com/premium_photo-1661962842425-9a9097759880?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwZGFya3xlbnwwfHx8fDE3NTg4NzM1NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="University Campus"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20"
          data-ai-hint="university campus dark"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"></div>
      </div>
      
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Image src="https://i.postimg.cc/9QsnrBdS/cropped-circle-image.png" alt="Logo" width={32} height={32} />
        <span>MIT Art, Design & Technology </span>
      </Link>

      <Button asChild variant="outline" className="absolute top-8 right-8">
        <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
        </Link>
      </Button>

      <Card className="w-full max-w-sm bg-background/80 backdrop-blur-lg">
        <CardHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full text-primary mb-2">
                {icon}
            </div>
          <CardTitle className="text-2xl capitalize">{`${role} Login`}</CardTitle>
          <CardDescription>
            {`Enter your credentials to access the ${role} dashboard.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginPageForm role={role} dashboardPath={dashboard} />
        </CardContent>
      </Card>
    </main>
  );
}
