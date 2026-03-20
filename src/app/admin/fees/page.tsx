
'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { CalendarIcon, Loader2, Search, Download } from 'lucide-react';
import { UserProfile, Fee, WithId, Bus } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssignFeeDialog } from './assign-fee-dialog';
import { columns } from './columns';
import { FeeTable } from './fee-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export default function FeeManagementPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState<Date | undefined>();
  const [busFilter, setBusFilter] = useState('all');


  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore])
  );

  const { data: fees, isLoading: feesLoading } = useCollection<WithId<Fee>>(
    useMemoFirebase(() => (firestore ? query(collection(firestore, 'fees'), orderBy('createdAt', 'desc')) : null), [firestore])
  );
  
  const { data: buses, isLoading: busesLoading } = useCollection<WithId<Bus>>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'buses') : null), [firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login/admin');
    }
  }, [isUserLoading, user, router]);

  const students = useMemo(() => users?.filter(u => u.userType === 'student') || [], [users]);
  
  const studentMap = useMemo(() => {
    const map = new Map<string, WithId<UserProfile>>();
    if(users) {
        users.forEach(u => map.set(u.id, u as WithId<UserProfile>));
    }
    return map;
  }, [users]);
  
  const busMap = useMemo(() => {
    const map = new Map<string, string>();
    if (buses) {
      buses.forEach(b => map.set(b.id, b.busNumber));
    }
    return map;
  }, [buses]);


  const filteredFees = useMemo(() => {
    if (!fees || !students) return [];

    let processedFees = fees.map(fee => {
      const student = studentMap.get(fee.studentId);
      const isOverdue = fee.status === 'pending' && fee.dueDate.toDate() < new Date();
      const busId = student?.busId || '';
      const busName = busId ? busMap.get(busId) || 'Unassigned' : 'Unassigned';
      
      return {
        ...fee,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
        studentEmail: student?.email || 'N/A',
        busId: busId,
        busName: busName,
        status: isOverdue ? 'overdue' as const : fee.status,
      }
    });

    // Apply filters
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        processedFees = processedFees.filter(fee => 
            fee.studentName.toLowerCase().includes(lowercasedQuery) ||
            fee.studentEmail.toLowerCase().includes(lowercasedQuery)
        );
    }
    
    if (statusFilter !== 'all') {
        processedFees = processedFees.filter(fee => fee.status === statusFilter);
    }
    
    if (dueDateFilter) {
        const formattedDate = format(dueDateFilter, 'yyyy-MM-dd');
        processedFees = processedFees.filter(fee => format(fee.dueDate.toDate(), 'yyyy-MM-dd') === formattedDate);
    }

    if (busFilter !== 'all') {
        processedFees = processedFees.filter(fee => fee.busId === busFilter);
    }


    return processedFees;
  }, [fees, students, studentMap, busMap, searchQuery, statusFilter, dueDateFilter, busFilter]);

  const isLoading = usersLoading || feesLoading || isUserLoading || busesLoading;

  const handleExport = () => {
    if (!filteredFees) return;
    
    const headers = [
      'Student', 'Bus Name', 'Description', 'Amount', 'Status', 'Due Date', 'Paid At', 'Transaction ID'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredFees.map(fee => {
        return [
            `"${fee.studentName}"`,
            `"${fee.busName}"`,
            `"${fee.description}"`,
            `"${fee.amount}"`,
            `"${fee.status}"`,
            `"${fee.dueDate ? format(fee.dueDate.toDate(), 'PPP') : 'N/A'}"`,
            `"${fee.paidAt ? format(fee.paidAt.toDate(), 'PPP p') : 'N/A'}"`,
            `"${fee.transactionId || 'N/A'}"`,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fee_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <DashboardHeader
              title="Fee Management"
              description="Assign and track student fees and payments."
            />
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport} disabled={!filteredFees || filteredFees.length === 0}>
                    <Download className="mr-2 h-4 w-4"/>
                    Export as Excel
                </Button>
                <AssignFeeDialog students={students || []} />
            </div>
          </div>

           <Card className="mb-6">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by student name or email..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 md:flex-shrink-0'>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full sm:w-[240px] justify-start text-left font-normal",
                                        !dueDateFilter && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDateFilter ? format(dueDateFilter, "PPP") : <span>Filter by due date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={dueDateFilter}
                                    onSelect={setDueDateFilter}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        
                        <Select value={busFilter} onValueChange={setBusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by Bus" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Buses</SelectItem>
                                {buses?.map(bus => (
                                    <SelectItem key={bus.id} value={bus.id}>{bus.busNumber}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <FeeTable columns={columns} data={filteredFees || []} />
          )}
        </div>
      </main>
    </SidebarInset>
  );
}
