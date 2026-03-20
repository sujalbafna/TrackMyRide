'use server';

/**
 * @fileOverview An AI agent for optimizing bus routes.
 *
 * - optimizeBusRoutes - A function that handles the bus route optimization process.
 * - OptimizeBusRoutesInput - The input type for the optimizeBusRoutes function.
 * - OptimizeBusRoutesOutput - The return type for the optimizeBusRoutes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeBusRoutesInputSchema = z.object({
  trafficPatterns: z
    .string()
    .describe('Historical and real-time traffic patterns data.'),
  studentLocations: z
    .string()
    .describe('Data on student locations and pickup/drop-off points.'),
  currentRoutes: z.string().describe('The current bus routes.'),
  optimizationPreferences: z
    .string()
    .optional()
    .describe(
      'Optional preferences such as minimizing travel time or fuel consumption.'
    ),
});
export type OptimizeBusRoutesInput = z.infer<typeof OptimizeBusRoutesInputSchema>;

const OptimizeBusRoutesOutputSchema = z.object({
  suggestedRoutes: z
    .string()
    .describe('Suggested optimized bus routes based on the input data.'),
  reasoning: z
    .string()
    .describe(
      'Explanation of why the suggested routes are more efficient, according to the optimization preferences.'
    ),
});
export type OptimizeBusRoutesOutput = z.infer<typeof OptimizeBusRoutesOutputSchema>;

export async function optimizeBusRoutes(
  input: OptimizeBusRoutesInput
): Promise<OptimizeBusRoutesOutput> {
  return optimizeBusRoutesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeBusRoutesPrompt',
  input: {schema: OptimizeBusRoutesInputSchema},
  output: {schema: OptimizeBusRoutesOutputSchema},
  prompt: `You are an AI assistant specialized in optimizing bus routes.

You will receive traffic patterns, student locations, current bus routes, and optional optimization preferences. Based on this information, you will suggest optimized bus routes to minimize travel time and reduce fuel consumption.

Traffic Patterns: {{{trafficPatterns}}}
Student Locations: {{{studentLocations}}}
Current Routes: {{{currentRoutes}}}
Optimization Preferences: {{{optimizationPreferences}}}

Consider all factors and provide clear reasoning for your suggested routes.

Output format: Suggested Routes, Reasoning.`,
});

const optimizeBusRoutesFlow = ai.defineFlow(
  {
    name: 'optimizeBusRoutesFlow',
    inputSchema: OptimizeBusRoutesInputSchema,
    outputSchema: OptimizeBusRoutesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
