
'use client';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
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
import { CalendarIcon, Loader2, Search } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';


export const feeSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Please select at least one student.'),
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  description: z.string().min(3, 'Description is required.'),
  dueDate: z.date({
    required_error: 'A due date is required.',
  }),
});

export type FeeFormValues = z.infer<typeof feeSchema>;

interface FeeFormProps {
  form: UseFormReturn<FeeFormValues>;
  onSubmit: (values: FeeFormValues) => void;
  students: UserProfile[];
  buttonText?: string;
}

export function FeeForm({
  form,
  onSubmit,
  students,
  buttonText = 'Submit',
}: FeeFormProps) {
  const {
    formState: { isSubmitting },
    control
  } = form;

  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = students.filter(s => 
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
        <Card>
            <CardHeader className='p-4'>
                <CardTitle className='text-base'>Students</CardTitle>
            </CardHeader>
            <CardContent className='p-4 pt-0 space-y-3'>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-8" 
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <FormField
                control={control}
                name="studentIds"
                render={({ field }) => (
                  <FormItem>
                    <ScrollArea className="h-48 rounded-md border p-4">
                      {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                        <FormField
                          key={student.id}
                          control={control}
                          name="studentIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={student.id}
                                className="flex flex-row items-start space-x-3 space-y-0 mb-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), student.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== student.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">
                                  {student.firstName} {student.lastName} ({student.rollNumber || student.email})
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )) : <p className='text-center text-sm text-muted-foreground py-4'>No students found.</p>}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
        </Card>
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (INR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="5000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Bus Fee" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </form>
    </Form>
  );
}
