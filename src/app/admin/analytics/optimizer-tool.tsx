
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2 } from 'lucide-react';
import {
  optimizeBusRoutes,
  type OptimizeBusRoutesOutput,
} from '@/ai/flows/optimize-bus-routes';
import { Input } from '@/components/ui/input';

const optimizerSchema = z.object({
  trafficPatterns: z.string().min(10, 'Please provide more detail on traffic patterns.'),
  studentLocations: z.string().min(10, 'Please provide more detail on student locations.'),
  currentRoutes: z.string().min(10, 'Please provide more detail on current routes.'),
  optimizationPreferences: z.string().optional(),
});

export function OptimizerTool() {
  const [result, setResult] = useState<OptimizeBusRoutesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof optimizerSchema>>({
    resolver: zodResolver(optimizerSchema),
    defaultValues: {
      trafficPatterns: '',
      studentLocations: '',
      currentRoutes: '',
      optimizationPreferences: 'Minimize travel time and fuel consumption',
    },
  });

  async function onSubmit(values: z.infer<typeof optimizerSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await optimizeBusRoutes(values);
      setResult(response);
    } catch (e: any) {
      setError('An error occurred while optimizing routes. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Route Data Input</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="trafficPatterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traffic Patterns</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Heavy traffic on Main St from 8-9 AM. Light traffic on 1st Ave after 10 AM..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentLocations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Locations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 10 students at Park Apartments, 5 at Sunnyside Heights, 15 near downtown station..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentRoutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Bus Routes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Route A: Central > Main St > Park Apts > School. Route B: Downtown > 1st Ave > Sunnyside > School..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optimizationPreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optimization Preferences (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Prioritize safety, avoid highways..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Optimize Routes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">AI is analyzing the data...</p>
            </div>
        )}

        {error && (
             <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                </CardContent>
             </Card>
        )}

        {result ? (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{result.suggestedRoutes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reasoning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{result.reasoning}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
           !isLoading && !error && (
             <div className="flex items-center justify-center h-full min-h-[400px] rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground text-center">AI-generated suggestions will appear here.</p>
             </div>
           )
        )}
      </div>
    </div>
  );
}

    