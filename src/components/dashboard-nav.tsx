
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  Bell,
  Bus,
  CircleUserRound,
  ClipboardCheck,
  Gauge,
  LineChart,
  LogOut,
  Map,
  MapPin,
  MessageSquare,
  Milestone,
  PlayCircle,
  Siren,
  User,
  Users,
  UserX,
  UserPlus,
  BusFront,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";

const navItems = {
  admin: [
    { href: "/admin", icon: Gauge, label: "Dashboard" },
    { href: "/admin/requests", icon: UserPlus, label: "User Requests" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/accounts", icon: UserX, label: "Accounts" },
    { href: "/admin/buses", icon: Bus, label: "Buses" },
    { href: "/admin/routes", icon: Milestone, label: "Routes" },
    { href: "/admin/drivers", icon: CircleUserRound, label: "Drivers" },
    { href: "/admin/reports", icon: ClipboardCheck, label: "Reports" },
    { href: "/admin/notifications", icon: Bell, label: "Notifications" },
    { href: "/admin/safety", icon: Siren, label: "Safety Alerts" },
    { href: "/admin/analytics", icon: LineChart, label: "Analytics" },
  ],
  student: [
    { href: "/student", icon: Map, label: "Live Tracking" },
    { href: "/student/stops", icon: MapPin, label: "My Stop" },
    { href: "/student/profile", icon: User, label: "Profile" },
    { href: "/student/sos", icon: Siren, label: "Emergency SOS" },
  ],
  faculty: [
    { href: "/faculty", icon: Map, label: "Live Tracking" },
    { href: "/faculty/attendance", icon: ClipboardCheck, label: "Attendance" },
    { href: "/faculty/communication", icon: MessageSquare, label: "Announcements" },
    { href: "/faculty/profile", icon: User, label: "Profile" },
  ],
  driver: [
    { href: "/driver", icon: Gauge, label: "Dashboard" },
    { href: "/driver/chat", icon: MessageSquare, label: "Driver Chat" },
    { href: "/driver/status", icon: PlayCircle, label: "Route Status" },
    { href: "/driver/profile", icon: User, label: "Profile" },
    { href: "/driver/sos", icon: Siren, label: "Emergency SOS" },
  ],
  buses: [
    { href: "/buses", icon: BusFront, label: "Attendance Terminal" },
  ],
};

const UserMenu = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const pathname = usePathname();
    const auth = useAuth();
    const { toast } = useToast();
    
    const currentRole = pathname.split('/')[1];

    const { data: userProfile } = useDoc<UserProfile>(
        useMemoFirebase(() => (user && !isUserLoading ? doc(firestore, 'users', user.uid) : null), [user, firestore, isUserLoading])
    );

    const handleLogout = async () => {
        try {
            if (auth) {
                await auth.signOut();
                toast({ title: "Logged Out", description: "You have been successfully logged out." });
                window.location.assign('/');
            }
        } catch (error) {
            console.error("Logout error:", error);
            toast({ variant: 'destructive', title: "Logout Failed", description: "Could not log you out. Please try again." });
        }
    };
    
    const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : currentRole;
    const fallback = userProfile ? `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}` : currentRole?.charAt(0).toUpperCase();

    return (
        <div className="flex w-full items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
                <Avatar className="size-8">
                    <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium capitalize truncate">{displayName}</span>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={handleLogout}>
                <LogOut />
                <span className="sr-only">Log Out</span>
            </Button>
        </div>
    );
}

const NavItems = () => {
    const pathname = usePathname();
    const [currentPath, setCurrentPath] = useState('');
    
    useEffect(() => {
        setCurrentPath(pathname);
    }, [pathname]);

    const currentRole = currentPath.split('/')[1] as keyof typeof navItems;
    const items = navItems[currentRole] || [];

    return (
        <SidebarMenu>
            {items.map((item) => (
            <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref>
                <SidebarMenuButton
                    isActive={currentPath.startsWith(item.href) && (item.href.length > currentPath.length-1 || item.href.length === currentPath.length) }
                    tooltip={{ children: item.label, side: "right" }}
                >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
};


export function DashboardNav() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Image src="https://i.postimg.cc/zBM9Pvy2/cropped-circle-image.png" alt="Logo" width={28} height={28} />
            <h1 className="text-sm font-semibold font-headline text-foreground group-data-[collapsible=icon]:hidden">MIT Art, Design & Technology</h1>
        </div>
        <SidebarTrigger className="group-data-[collapsible=icon]:hidden"/>
      </SidebarHeader>
      <SidebarContent>
        <NavItems />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
