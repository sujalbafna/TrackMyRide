'use client';

import { ColumnDef } from '@tanstack/react-table';
import { UserProfile, Route, WithId } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export const columns = (routes: WithId<Route>[]): ColumnDef<UserProfile>[] => [
  {
    id: 'name',
    header: 'Name',
    accessorFn: row => `${row.firstName} ${row.lastName}`,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone Number',
     cell: ({ row }) => row.original.phoneNumber || 'N/A',
  },
  {
    accessorKey: 'licenseNumber',
    header: 'License No.',
    cell: ({ row }) => row.original.licenseNumber || 'N/A',
  },
    {
    accessorKey: 'yearsOfExperience',
    header: 'Experience',
    cell: ({ row }) => `${row.original.yearsOfExperience || 0} years`,
  },
  {
    accessorKey: 'routeId',
    header: 'Assigned Route',
    cell: ({ row }) => {
        const user = row.original;
        const assignedRoute = routes.find(route => route.id === user.routeId);
        if (assignedRoute) {
            return <Badge variant="secondary">{assignedRoute.name}</Badge>;
        }
        return <Badge variant="outline">Unassigned</Badge>;
    }
  },
];
