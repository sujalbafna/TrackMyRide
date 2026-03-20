'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, CheckCircle2, Phone } from 'lucide-react';
import Link from 'next/link';

interface RegisterFormProps {
  role: 'student' | 'faculty' | 'driver' | 'admin' | 'buses';
  schema: z.AnyZodObject;
  defaultValues: Record<string, any>;
  children?: React.ReactNode;
}

export function RegisterForm({ role, schema, defaultValues, children }: RegisterFormProps) {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Phone OTP States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { formState: { isSubmitting }, watch, setValue } = form;
  const phoneNumber = watch('phoneNumber');

  const handleSendOtp = async () => {
    if (!auth || !phoneNumber || phoneNumber.length < 10) {
      toast({ variant: 'destructive', title: 'Invalid Mobile Number', description: 'Please enter a 10-digit mobile number.' });
      return;
    }

    setIsSendingOtp(true);
    try {
      // Cleanup existing recaptcha
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
        size: 'invisible',
      });
      window.recaptchaVerifier = verifier;

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      toast({ title: 'OTP Sent', description: `A 6-digit code has been sent to ${formattedPhone}` });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({ variant: 'destructive', title: 'Failed to send OTP', description: error.message || 'Please check your connection and try again.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult || otpCode.length !== 6) return;

    setIsVerifyingOtp(true);
    try {
      await confirmationResult.confirm(otpCode);
      setIsOtpVerified(true);
      toast({ title: 'Verified', description: 'Mobile number verified successfully.' });
    } catch (error: any) {
      console.error('OTP Verification error:', error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code you entered is incorrect. Please try again.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleAuthError = (error: FirebaseError) => {
    let title = 'An error occurred';
    let description = 'Please try again.';
    switch (error.code) {
      case 'auth/email-already-in-use':
        title = 'Email Already Exists';
        description = 'An account with this email address already exists.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'The password must be at least 6 characters long.';
        break;
      default:
        description = error.message;
        break;
    }
    toast({ variant: 'destructive', title, description });
  };

  const onSubmit = async (formValues: z.infer<typeof schema>) => {
    if (!auth || !firestore) return;
    if (!isOtpVerified) {
      toast({ variant: 'destructive', title: 'Verification Required', description: 'Please verify your mobile number with the OTP first.' });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formValues.email,
        formValues.password
      );
      const user = userCredential.user;

      const { password, ...userData } = formValues;

      await setDoc(doc(firestore, 'users', user.uid), {
        ...userData,
        id: user.uid,
        userType: role,
        approvalStatus: role === 'admin' ? 'approved' : 'pending',
        createdAt: new Date(),
      });

      toast({ 
        title: role === 'admin' ? "Registration Successful" : "Request Submitted", 
        description: role === 'admin' 
          ? "You can now sign in to your dashboard." 
          : "Your joining request has been sent. You will be able to login once an admin approves your account." 
      });
      
      await auth.signOut(); 
      router.push(`/login/${role}`);

    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof FirebaseError) {
        handleAuthError(error);
      } else {
         toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div ref={recaptchaContainerRef} />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sujal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bafna" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="abc@gmail.com" type="email" {...field} />
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
                    <Input placeholder="••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-y py-4 my-4 bg-muted/10 px-2 rounded-md">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">+91</span>
                        <Input 
                          placeholder="10-digit number" 
                          {...field} 
                          className="pl-11"
                          disabled={isOtpVerified || isSendingOtp}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={handleSendOtp} 
                        disabled={isOtpVerified || isSendingOtp || !field.value || field.value.length < 10}
                      >
                        {isSendingOtp ? <Loader2 className="animate-spin h-4 w-4" /> : isOtpSent ? 'Resend' : 'Send OTP'}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isOtpSent && !isOtpVerified && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormLabel>Verification Code</FormLabel>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter 6-digit OTP" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center tracking-widest font-bold"
                    />
                    <Button 
                      type="button" 
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpCode.length !== 6}
                    >
                      {isVerifyingOtp ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
                    </Button>
                  </div>
                </div>
              )}

              {isOtpVerified && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded border border-green-100 text-sm font-medium animate-in zoom-in-95">
                  <CheckCircle2 className="h-4 w-4" />
                  Mobile number verified successfully
                </div>
              )}
            </div>
            
            {children}

            <Button type="submit" disabled={isLoading || isSubmitting || !isOtpVerified} className="w-full h-12 text-lg mt-4">
              {isLoading || isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-5 w-5" />
              )}
              {role === 'admin' ? 'Create Admin Account' : 'Submit Joining Request'}
            </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/login/${role}`} className="underline text-primary font-semibold hover:text-primary/80">
          Login
        </Link>
      </div>
      <p className="text-[10px] text-center text-muted-foreground opacity-50 px-4">
        This site is protected by reCAPTCHA and the Google{' '}
        <a href="https://policies.google.com/privacy" className="underline">Privacy Policy</a> and{' '}
        <a href="https://policies.google.com/terms" className="underline">Terms of Service</a> apply.
      </p>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}