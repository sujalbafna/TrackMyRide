import { DashboardNav } from '@/components/dashboard-nav';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <DashboardNav />
      {children}
    </SidebarProvider>
  );
}
