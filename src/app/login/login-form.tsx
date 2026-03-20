'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { UserProfile } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

interface LoginPageFormProps {
  role: string;
  dashboardPath: string;
}

export function LoginPageForm({ role, dashboardPath }: LoginPageFormProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthError = (error: FirebaseError) => {
    let title = 'An error occurred';
    let description = 'Please try again.';
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        title = 'Invalid Credentials';
        description = 'The email or password you entered is incorrect.';
        break;
      case 'auth/too-many-requests':
        title = 'Too many attempts';
        description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
        break;
      default:
        description = error.message;
        break;
    }
    toast({ variant: 'destructive', title, description });
  };

  const handleSignIn = async (values: z.infer<typeof loginSchema>) => {
    setIsSigningIn(true);
    try {
      if (!auth || !firestore) {
        throw new Error('Firebase not initialized');
      }
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        if (userData.userType !== role) {
            await auth.signOut();
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: `You do not have permission to access the ${role} dashboard.`,
            });
            return;
        }

        if (role !== 'admin' && userData.approvalStatus !== 'approved') {
            const status = userData.approvalStatus || 'pending';
            await auth.signOut();
            toast({
                variant: status === 'pending' ? 'default' : 'destructive',
                title: status === 'pending' ? 'Approval Pending' : 'Account Rejected',
                description: status === 'pending' 
                    ? "Your registration request is still pending administrator approval. Please wait for confirmation." 
                    : "Your joining request was rejected. Please contact support if you believe this is an error.",
            });
            return;
        }

        router.push(dashboardPath);
      } else {
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Account Not Found',
          description: "We couldn't find your profile in our records.",
        });
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        handleAuthError(error);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email || !z.string().email().safeParse(email).success) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter a valid email address above to reset your password.',
      });
      return;
    }

    setIsResetting(true);
    try {
      if (!auth) throw new Error('Auth not initialized');
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset Email Sent',
        description: `A reset link has been sent to ${email}. Please check your Inbox and Spam/Promotions folders. If it doesn't arrive, ensure you have already registered this email.`,
      });
    } catch (error) {
      console.error('Password reset error:', error);
      if (error instanceof FirebaseError) {
        handleAuthError(error);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to send reset email. Please try again later.',
        });
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
       <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="abc@gmail.com" {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="******" {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSigningIn} className="w-full">
            {isSigningIn && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      
      <div className="flex flex-col items-center space-y-2 text-sm text-muted-foreground">
        <div>
          Don&apos;t have an account?{' '}
          <Link href={`/register/${role}`} className="underline text-primary font-medium hover:text-primary/80">
            Register
          </Link>
        </div>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isResetting}
          className="text-primary hover:underline font-medium disabled:opacity-50 flex items-center"
        >
          {isResetting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Forgot Password?
        </button>
      </div>
    </div>
  );
}
