import { DashboardNav } from '@/components/dashboard-nav';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatNotificationListener } from './chat/chat-notification-listener';

export default function DriverLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <DashboardNav />
      <ChatNotificationListener />
      {children}
    </SidebarProvider>
  );
}
