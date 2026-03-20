
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Milestone, UserProfile, Users, WithId, Route, Siren } from "lucide-react";

interface StatsCardsProps {
    students: UserProfile[];
    buses: WithId<Bus>[];
    routes: WithId<Route>[];
    activeAlertsCount: number;
}

export function StatsCards({ students, buses, routes, activeAlertsCount }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{students.length}</div>
                    <p className="text-xs text-muted-foreground">{students.length} registered students</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
                    <Bus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{buses.length}</div>
                    <p className="text-xs text-muted-foreground">{buses.length} buses in the fleet</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                    <Milestone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{routes.length}</div>
                    <p className="text-xs text-muted-foreground">{routes.length} routes configured</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">SOS Alerts</CardTitle>
                    <Siren className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeAlertsCount}</div>
                    <p className="text-xs text-muted-foreground">Active emergency signals</p>
                </CardContent>
            </Card>
        </div>
    );
}
