
'use server';

/**
 * @fileOverview A Genkit flow for handling OTP generation and verification for Email and Mobile.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const RequestOtpInputSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string(),
});

const VerifyOtpInputSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string(),
  emailOtp: z.string().length(6),
  mobileOtp: z.string().length(6),
});

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestOtps(input: z.infer<typeof RequestOtpInputSchema>) {
  return requestOtpsFlow(input);
}

export async function verifyOtps(input: z.infer<typeof VerifyOtpInputSchema>) {
  return verifyOtpsFlow(input);
}

const requestOtpsFlow = ai.defineFlow(
  {
    name: 'requestOtpsFlow',
    inputSchema: RequestOtpInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      debugEmailOtp: z.string().optional(), // ONLY FOR DEV/PROTOTYPE
      debugMobileOtp: z.string().optional(), // ONLY FOR DEV/PROTOTYPE
    }),
  },
  async (input) => {
    const emailOtp = generateOtp();
    const mobileOtp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // Store in a temporary collection indexed by email/phone combo
    const verificationId = `${input.email}_${input.phoneNumber}`;
    await db.collection('temp_otps').doc(verificationId).set({
      emailOtp,
      mobileOtp,
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    // MOCK SENDING: In a real app, integrate Resend/Twilio here.
    console.log(`[OTP DEBUG] Sending Email OTP ${emailOtp} to ${input.email}`);
    console.log(`[OTP DEBUG] Sending Mobile OTP ${mobileOtp} to ${input.phoneNumber}`);

    return {
      success: true,
      message: 'OTPs have been sent to your email and mobile number.',
      // We return these so the user can easily test the prototype without a real SMS gateway
      debugEmailOtp: emailOtp,
      debugMobileOtp: mobileOtp,
    };
  }
);

const verifyOtpsFlow = ai.defineFlow(
  {
    name: 'verifyOtpsFlow',
    inputSchema: VerifyOtpInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    const verificationId = `${input.email}_${input.phoneNumber}`;
    const doc = await db.collection('temp_otps').doc(verificationId).get();

    if (!doc.exists) {
      return { success: false, message: 'OTP session expired or not found. Please request new codes.' };
    }

    const data = doc.data()!;
    const now = Timestamp.now();

    if (now.toMillis() > data.expiresAt.toMillis()) {
      await db.collection('temp_otps').doc(verificationId).delete();
      return { success: false, message: 'OTPs have expired. Please try again.' };
    }

    if (data.emailOtp !== input.emailOtp) {
      return { success: false, message: 'Invalid Email OTP.' };
    }

    if (data.mobileOtp !== input.mobileOtp) {
      return { success: false, message: 'Invalid Mobile OTP.' };
    }

    // Success - clean up
    await db.collection('temp_otps').doc(verificationId).delete();

    return {
      success: true,
      message: 'Verification successful!',
    };
  }
);
