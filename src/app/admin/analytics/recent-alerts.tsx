
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile, SOSAlert, WithId } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Siren } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RecentAlertsProps {
    alerts: WithId<SOSAlert>[];
    users: WithId<UserProfile>[];
}

export function RecentAlerts({ alerts, users }: RecentAlertsProps) {
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent SOS Alerts</CardTitle>
                <CardDescription>The last 5 active or acknowledged alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {alerts.length > 0 ? (
                    alerts.map(alert => {
                        const userProfile = users.find(u => u.id === alert.userId);
                        return (
                            <div key={alert.id} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold">{userProfile?.firstName} {userProfile?.lastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true })}
                                    </p>
                                </div>
                                <Siren className="text-destructive h-5 w-5" />
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>No recent alerts.</p>
                    </div>
                )}
                 <Button variant="outline" className="w-full as-child">
                    <Link href="/admin/safety">View All Alerts</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

    