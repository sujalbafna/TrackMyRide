
'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Attendance, Bus, WithId } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BusOccupancyChartProps {
  buses: WithId<Bus>[];
  attendance: WithId<Attendance>[];
}

const chartConfig = {
    occupancy: {
        label: 'Confirmed Riders',
        color: 'hsl(var(--primary))', // Blue
    },
    available: {
        label: 'Available Seats',
        color: 'hsl(var(--chart-4))', // Yellow
    }
};

export function BusOccupancyChart({ buses, attendance }: BusOccupancyChartProps) {
  const [tripFilter, setTripType] = useState<'morning' | 'evening'>('morning');
  const today = format(new Date(), 'yyyy-MM-dd');

  const chartData = useMemo(() => {
    return buses.map(bus => {
      const confirmedRiders = attendance.filter(
        a => a.busId === bus.id && a.attendanceDate === today && a.intention === 'riding' && (a.tripType === tripFilter || !a.tripType)
      ).length;

      const availableSeats = bus.capacity - confirmedRiders;

      return {
        busNumber: bus.busNumber,
        occupancy: confirmedRiders,
        available: availableSeats > 0 ? availableSeats : 0,
        capacity: bus.capacity,
      };
    }).sort((a,b) => a.busNumber.localeCompare(b.busNumber));
  }, [buses, attendance, today, tripFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <CardTitle>Today's Bus Occupancy</CardTitle>
            <CardDescription>Confirmed riders for {format(new Date(), 'PPP')}.</CardDescription>
        </div>
        <Tabs value={tripFilter} onValueChange={(v: any) => setTripType(v)}>
            <TabsList>
                <TabsTrigger value="morning">Morning</TabsTrigger>
                <TabsTrigger value="evening">Evening</TabsTrigger>
            </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="busNumber"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name, props) => {
                                        if (name === 'occupancy') {
                                            return `${value} riders confirmed`;
                                        }
                                        if (name === 'available') {
                                            return `${value} seats available`;
                                        }
                                        return `${value}`;
                                    }}
                                />
                            }
                        />
                        <Legend />
                        <Bar dataKey="occupancy" stackId="a" fill="var(--color-occupancy)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="available" stackId="a" fill="var(--color-available)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        ) : (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for today's bus occupancy.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
