
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const validRoles = ['student', 'faculty', 'driver', 'admin', 'buses'];

export default function RegisterRedirectPage() {
  const router = useRouter();
  const params = useParams();
  
  const role = Array.isArray(params.role) ? params.role[0] : undefined;

  useEffect(() => {
    if (role && validRoles.includes(role)) {
      // Handled by dynamic routes or specific role pages
    } else {
      router.replace('/login');
    }
  }, [role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
