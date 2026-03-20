
'use client';

import { z } from 'zod';
import { RegisterForm } from '../register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { UserCog, ChevronLeft } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { userSchema } from '@/app/admin/users/user-form';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const adminRegisterSchema = userSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    password: true,
    employeeCode: true,
    designation: true,
}).required({
    password: true,
    employeeCode: true,
});

export default function AdminRegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">
       <div className="absolute inset-0 -z-10">
        <Image
          src="https://plus.unsplash.com/premium_photo-1661962842425-9a9097759880?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwZGFya3xlbnwwfHx8fDE3NTg4NzM1NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="University Campus"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20"
          data-ai-hint="university campus dark"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"></div>
      </div>

       <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Image src="https://i.postimg.cc/9QsnrBdS/cropped-circle-image.png" alt="Logo" width={32} height={32} />
        <span>MIT Art, Design & Technology</span>
      </Link>

       <Button asChild variant="outline" className="absolute top-8 right-8">
        <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
        </Link>
      </Button>

      <Card className="w-full max-w-md bg-background/80 backdrop-blur-lg">
        <CardHeader className="items-center text-center">
          <div className="p-3 bg-primary/10 rounded-full text-primary mb-2">
            <UserCog className="w-12 h-12" />
          </div>
          <CardTitle className="text-2xl capitalize">Register as Admin</CardTitle>
          <CardDescription>Create an account to manage the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm
            role="admin"
            schema={adminRegisterSchema}
            defaultValues={{
              firstName: '',
              lastName: '',
              email: '',
              password: '',
              employeeCode: '',
              designation: '',
            }}
          >
            <FormField
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin ID</FormLabel>
                  <FormControl>
                    <Input placeholder="XXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Administrator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </RegisterForm>
        </CardContent>
      </Card>
    </main>
  );
}
