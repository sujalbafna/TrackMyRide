
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Attendance, WithId } from '@/lib/types';
import { format, subDays } from 'date-fns';

interface AttendanceChartProps {
  attendance: WithId<Attendance>[];
}

const chartConfig = {
    Present: {
        label: 'Present',
        color: 'hsl(var(--primary))',
    },
    Absent: {
        label: 'Absent',
        color: 'hsl(var(--muted))',
    },
};

export function AttendanceChart({ attendance }: AttendanceChartProps) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    
    return last7Days.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const presentCount = attendance.filter(
        a => a.attendanceDate === dateString && a.status === 'Present'
      ).length;
      
      const absentCount = attendance.filter(
        a => a.attendanceDate === dateString && a.status === 'Absent'
      ).length;

      return {
        date: format(date, 'MMM d'),
        Present: presentCount,
        Absent: absentCount,
      };
    });
  }, [attendance]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Daily Attendance</CardTitle>
        <CardDescription>Attendance for the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Present" fill="var(--color-Present)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="var(--color-Absent)" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
