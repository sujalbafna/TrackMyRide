'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { RegisterForm } from '../register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { User, ChevronLeft, Loader2, MapPinOff } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { userSchema } from '@/app/admin/users/user-form';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const libraries: ("places")[] = ["places"];

const studentRegisterSchema = userSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    password: true,
    rollNumber: true,
    phoneNumber: true,
    department: true,
    stopName: true,
}).required({
    password: true,
    rollNumber: true,
    phoneNumber: true,
    department: true,
    stopName: true,
});

function StudentFields() {
  const { control, setValue } = useFormContext();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || '';
      setValue('stopName', address, { shouldValidate: true });
    }
  };

  return (
    <>
      <FormField
        control={control}
        name="rollNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>College ID</FormLabel>
            <FormControl>
              <Input placeholder="Enrollment No." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="department"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Computer Science" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="stopName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Requested Bus Stop (Address)</FormLabel>
            <FormControl>
              {isLoaded ? (
                <Autocomplete 
                  onLoad={(instance) => setAutocomplete(instance)} 
                  onPlaceChanged={onPlaceChanged}
                >
                  <Input 
                    placeholder="Search for your pickup point..." 
                    {...field} 
                    autoComplete="off"
                  />
                </Autocomplete>
              ) : (
                <div className="space-y-2">
                  <Input 
                    placeholder="Enter your pickup point manually..." 
                    {...field} 
                  />
                  {!apiKey && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <MapPinOff className="h-3 w-3" />
                      Location search unavailable. Please type manually.
                    </div>
                  )}
                  {apiKey && !loadError && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading address suggestions...
                    </div>
                  )}
                </div>
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export default function StudentRegisterPage() {
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
            <User className="w-12 h-12" />
          </div>
          <CardTitle className="text-2xl capitalize">Register as Student</CardTitle>
          <CardDescription>Fill out the form to request access to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm
            role="student"
            schema={studentRegisterSchema}
            defaultValues={{
              firstName: '',
              lastName: '',
              email: '',
              password: '',
              phoneNumber: '',
              rollNumber: '',
              department: '',
              stopName: '',
            }}
          >
            <StudentFields />
          </RegisterForm>
        </CardContent>
      </Card>
    </main>
  );
}