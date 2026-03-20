'use client';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Attendance, Bus, UserProfile, WithId } from '@/lib/types';
import { DashboardHeader } from '@/components/dashboard-header';
import { SidebarInset } from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type StudentAttendanceRecord = {
    [date: string]: 'P' | 'A';
};

type PivotedStudent = WithId<UserProfile> & {
    attendance: StudentAttendanceRecord;
};

type BusWithPivotedData = WithId<Bus> & {
    students: PivotedStudent[];
    displayColumns: string[]; // Can be a date 'yyyy-MM-dd' or a summary 'summary-yyyy-MM'
};

// A simple CSV downloader function
function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(fieldName => 
                JSON.stringify(row[fieldName] ?? '', (key, value) => value ?? '')
            ).join(',')
        )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


export default function ReportsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [busNameSearch, setBusNameSearch] = useState('');

  const { data: attendance, isLoading: attendanceLoading } = useCollection<Attendance>(
      useMemoFirebase(() => (firestore ? collection(firestore, 'attendance') : null), [firestore])
  );
  
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore])
  );

  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'buses') : null), [firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);


  const busData = useMemo<BusWithPivotedData[]>(() => {
    if (!buses || !users || !attendance) return [];

    let filteredBuses = buses;
    if (busNameSearch) {
        filteredBuses = buses.filter(b => b.busNumber.toLowerCase().includes(busNameSearch.toLowerCase()));
    }

    return filteredBuses.map(bus => {
        const studentsOnBus = users.filter(u => u.userType === 'student' && u.busId === bus.id);
        const studentIdsOnBus = studentsOnBus.map(s => s.id);
        const attendanceForBus = attendance.filter(a => studentIdsOnBus.includes(a.userId));
        
        const uniqueDates = [...new Set(attendanceForBus.map(a => a.attendanceDate))].sort((a,b) => parseISO(a).getTime() - parseISO(b).getTime());

        const pivotedStudents: PivotedStudent[] = studentsOnBus.map(student => {
            const studentAttendance = attendanceForBus.filter(a => a.userId === student.id);
            const attendanceRecord: StudentAttendanceRecord = {};
            
            studentAttendance.forEach(att => {
                attendanceRecord[att.attendanceDate] = att.status === 'Present' ? 'P' : 'A';
            });

            return {
                ...student,
                attendance: attendanceRecord,
            };
        });
        
        // --- Logic to inject monthly summary columns ---
        const displayColumns: string[] = [];
        let lastMonth: number | null = null;
        let lastYear: number | null = null;
        
        uniqueDates.forEach(dateStr => {
            const dateObj = parseISO(dateStr);
            const currentMonth = getMonth(dateObj);
            const currentYear = getYear(dateObj);

            if (lastMonth !== null && lastYear !== null && (currentMonth !== lastMonth || currentYear !== lastYear)) {
                 displayColumns.push(`summary-${lastYear}-${lastMonth}`);
            }
            displayColumns.push(dateStr);
            lastMonth = currentMonth;
            lastYear = currentYear;
        });

        // Add the final month's summary if there are any dates
        if (lastMonth !== null && lastYear !== null) {
            displayColumns.push(`summary-${lastYear}-${lastMonth}`);
        }
        // --- End of injection logic ---

        return {
            ...bus,
            students: pivotedStudents,
            displayColumns,
        };
    });

  }, [buses, users, attendance, busNameSearch]);

  const handleExportAttendance = () => {
    const dataToExport = busData.flatMap(bus => {
        return bus.students.map(student => {
            const row: {[key: string]: string | number} = {
                'bus_number': bus.busNumber,
                'student_name': `${student.firstName} ${student.lastName}`,
                'student_email': student.email || '',
            };
            bus.displayColumns.forEach(col => {
                if(col.startsWith('summary-')) {
                    const [, year, month] = col.split('-').map(Number);
                    const monthDates = Object.keys(student.attendance).filter(dateStr => {
                        const d = parseISO(dateStr);
                        return getYear(d) === year && getMonth(d) === month;
                    });
                    const presentCount = monthDates.filter(date => student.attendance[date] === 'P').length;
                    row[`${format(new Date(year, month), 'MMM yyyy')} Total`] = presentCount;
                } else {
                    row[col] = student.attendance[col] || '';
                }
            });
            return row;
        });
    });
    downloadCSV(dataToExport, 'overall_attendance_report');
  }


  const isLoading = attendanceLoading || usersLoading || busesLoading || isUserLoading;

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
        <DashboardHeader
          title="Overall Attendance Report"
          description="View attendance records in a matrix, grouped by bus and student."
        />
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Attendance Matrix</CardTitle>
                        <CardDescription>A pivot-table view of all student attendance records with monthly totals.</CardDescription>
                    </div>
                    <Button onClick={handleExportAttendance} disabled={busData.length === 0}>Export Report</Button>
                </div>
                <div className="mt-4 relative max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by Bus Number..."
                        value={busNameSearch}
                        onChange={(e) => setBusNameSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : busData.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {busData.map(bus => (
                            <AccordionItem key={bus.id} value={bus.id}>
                                <AccordionTrigger className="hover:bg-muted/50 px-4">
                                    <div className="flex justify-between w-full pr-4">
                                        <h3 className="font-semibold text-lg">{bus.busNumber}</h3>
                                        <Badge variant="secondary">{bus.students.length} Students</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-2">
                                    {bus.students.length > 0 && bus.displayColumns.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table className="min-w-full">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="sticky left-0 bg-card z-10">Student Name</TableHead>
                                                        {bus.displayColumns.map(col => {
                                                            if (col.startsWith('summary-')) {
                                                                const [, year, month] = col.split('-').map(Number);
                                                                return <TableHead key={col} className="text-center font-bold bg-muted">{format(new Date(year, month), 'MMM')} Total</TableHead>;
                                                            }
                                                            return <TableHead key={col} className="text-center">{format(parseISO(col), 'MMM d')}</TableHead>;
                                                        })}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bus.students.map(student => (
                                                        <TableRow key={student.id}>
                                                            <TableCell className="sticky left-0 bg-card z-10 font-medium whitespace-nowrap">
                                                                {student.firstName} {student.lastName}
                                                            </TableCell>
                                                            {bus.displayColumns.map(col => {
                                                                if (col.startsWith('summary-')) {
                                                                    const [, year, month] = col.split('-').map(Number);
                                                                    const monthDates = Object.keys(student.attendance).filter(dateStr => {
                                                                        const d = parseISO(dateStr);
                                                                        return getYear(d) === year && getMonth(d) === month;
                                                                    });
                                                                    const presentCount = monthDates.filter(date => student.attendance[date] === 'P').length;
                                                                    return <TableCell key={col} className="text-center font-bold bg-muted">{presentCount}</TableCell>;
                                                                }
                                                                return (
                                                                    <TableCell key={col} className="text-center">
                                                                        {student.attendance[col] ? (
                                                                            <Badge variant={student.attendance[col] === 'P' ? 'secondary' : 'outline'}>
                                                                                {student.attendance[col]}
                                                                            </Badge>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground p-4">No attendance records or students found for this bus.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                        <p>No attendance records found matching your search.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </SidebarInset>
  );
}
