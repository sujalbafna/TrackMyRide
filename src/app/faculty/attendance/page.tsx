
'use client';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import {
  collection,
  query,
  where,
  Timestamp,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  Attendance,
  Route,
  UserProfile,
  WithId,
} from '@/lib/types';
import { format } from 'date-fns';
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
import { CalendarIcon, Loader2, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/dashboard-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { useMemo, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type MergedStudent = WithId<UserProfile> & {
  attendance?: WithId<Attendance>;
};

export default function AttendancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  
  const [markedAttendance, setMarkedAttendance] = useState<{[key: string]: WithId<Attendance>}>({});

  // 1. Get faculty's profile to find their assigned route and bus
  const { data: facultyProfile, isLoading: facultyLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user?.uid && !isUserLoading ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore, isUserLoading])
  );
  const assignedRouteId = facultyProfile?.routeId;
  const assignedBusId = facultyProfile?.busId;
  
  // 2. Get the assigned route details
  const { data: route, isLoading: routeLoading } = useDoc<Route>(
      useMemoFirebase(() => (assignedRouteId ? doc(firestore, 'routes', assignedRouteId) : null), [assignedRouteId, firestore])
  );

  // 3. Get all students assigned to this bus
  const { data: students, isLoading: studentsLoading } = useCollection<UserProfile>(
      useMemoFirebase(() => (
          assignedBusId && firestore ? 
          query(collection(firestore, 'users'), where('busId', '==', assignedBusId), where('userType', '==', 'student')) 
          : null
      ), [assignedBusId, firestore])
  );

  // 4. Fetch attendance records for the selected date and trip for students on this bus.
  useEffect(() => {
    if (!firestore || !students || students.length === 0 || !selectedDateStr || !assignedRouteId) {
        setMarkedAttendance({});
        return;
    };
    
    setMarkedAttendance({}); // Clear previous records when parameters change
    const studentIds = students.map(s => s.id);
    if(studentIds.length === 0) return;

    const q = query(
        collection(firestore, 'attendance'),
        where('routeId', '==', assignedRouteId),
        where('attendanceDate', '==', selectedDateStr),
        where('tripType', '==', tripType),
        where('userId', 'in', studentIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const todaysAttendance: {[key: string]: WithId<Attendance>} = {};
        snapshot.forEach(doc => {
            const att = { id: doc.id, ...doc.data() } as WithId<Attendance>;
            todaysAttendance[att.userId] = att;
        });
        setMarkedAttendance(todaysAttendance);
    });

    return () => unsubscribe();

  }, [students, firestore, assignedRouteId, selectedDateStr, tripType]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/faculty');
    }
  }, [isUserLoading, user, router]);

  // 6. Merge student data with their attendance record for the selected date/trip
  const mergedStudents = useMemo<MergedStudent[]>(() => {
    if (!students) return [];
    return students.map((student) => ({
      ...student,
      attendance: markedAttendance[student.id],
    }));
  }, [students, markedAttendance]);

  const handleMarkAttendance = async (
    student: MergedStudent,
    isPresent: boolean
  ) => {
    if (!firestore || !user || !facultyProfile || !assignedBusId || !assignedRouteId || !selectedDate) return;
    
    const attendanceDateStr = format(selectedDate, 'yyyy-MM-dd');
    const newStatus = isPresent ? 'Present' : 'Absent';

    const attendanceRecord: Omit<Attendance, 'id'> = {
      userId: student.id,
      bookingId: `manual-${attendanceDateStr}-${tripType}-${student.id}`, // Create a predictable ID
      busId: assignedBusId,
      routeId: assignedRouteId,
      attendanceDate: attendanceDateStr,
      tripType: tripType,
      status: newStatus,
      markedBy: user.uid,
      markedAt: Timestamp.now(),
    };

    try {
      let attendanceDocRef;
      const existingAttendance = markedAttendance[student.id];

      if (existingAttendance) {
        // Update existing record
        attendanceDocRef = doc(firestore, 'attendance', existingAttendance.id);
        await setDoc(attendanceDocRef, { status: newStatus, markedAt: Timestamp.now() }, { merge: true });
      } else {
        // Create new record
        const checkinId = `checkin-${attendanceDateStr}-${tripType}-${student.id}`;
        attendanceDocRef = doc(firestore, 'attendance', checkinId);
        await setDoc(attendanceDocRef, attendanceRecord);
      }
      
      toast({
        title: 'Success',
        description: `Marked ${
          student?.firstName || 'user'
        } as ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark attendance.',
      });
    }
  };

  const isLoading =
    isUserLoading ||
    facultyLoading ||
    routeLoading ||
    studentsLoading;

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <DashboardHeader
            title="Bus Attendance Management"
            description={`Mark or view attendance for ${route?.name || 'your route'}.`}
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Select value={tripType} onValueChange={(val: any) => setTripType(val)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select Trip" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="morning">
                            <div className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-orange-500" /> Morning Trip
                            </div>
                        </SelectItem>
                        <SelectItem value="evening">
                            <div className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-blue-500" /> Evening Trip
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Passenger List - {tripType.charAt(0).toUpperCase() + tripType.slice(1)} Trip</CardTitle>
            <CardDescription>
              Marking students for {selectedDate ? format(selectedDate, 'PPP') : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!assignedRouteId || !assignedBusId ? (
              <div className="text-center text-muted-foreground py-16">
                You have not been assigned a route or bus. Please contact an administrator.
              </div>
            ) : mergedStudents.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                No students are assigned to your bus route.
              </div>
            ) : (
                <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="whitespace-nowrap">
                        {student ? `${student.firstName} ${student.lastName}`: 'Unknown User'}
                      </TableCell>
                      <TableCell>{student?.rollNumber || 'N/A'}</TableCell>
                      <TableCell>{student?.department || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={student.attendance?.status === 'Present'}
                          onCheckedChange={(checked) =>
                            handleMarkAttendance(student, !!checked)
                          }
                          aria-label={`Mark ${student?.firstName} as present`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </SidebarInset>
  );
}
