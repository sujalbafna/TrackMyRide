
'use server';

/**
 * @fileOverview A Genkit flow for creating a Razorpay order.
 *
 * - createRazorpayOrder - Creates a payment order using Razorpay API.
 * - CreateRazorpayOrderInput - Input type for the flow.
 * - CreateRazorpayOrderOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Razorpay from 'razorpay';

const CreateRazorpayOrderInputSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0.'),
  currency: z.string().default('INR'),
});
export type CreateRazorpayOrderInput = z.infer<typeof CreateRazorpayOrderInputSchema>;

const CreateRazorpayOrderOutputSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
});
export type CreateRazorpayOrderOutput = z.infer<typeof CreateRazorpayOrderOutputSchema>;

export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput
): Promise<CreateRazorpayOrderOutput> {
  return createRazorpayOrderFlow(input);
}

const createRazorpayOrderFlow = ai.defineFlow(
  {
    name: 'createRazorpayOrderFlow',
    inputSchema: CreateRazorpayOrderInputSchema,
    outputSchema: CreateRazorpayOrderOutputSchema,
  },
  async (input) => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keySecret.includes('<')) {
      throw new Error('Razorpay credentials are not configured correctly in environment variables. Please check your .env file.');
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: input.amount * 100, // amount in the smallest currency unit
      currency: input.currency,
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    try {
      const order = await razorpay.orders.create(options);
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error: any) {
      console.error('Razorpay order creation failed:', error.error ? JSON.stringify(error.error, null, 2) : error);
      throw new Error(`Failed to create Razorpay order: ${error.error?.description || 'Please check server logs for details. This is often due to an incorrect Key Secret.'}`);
    }
  }
);
