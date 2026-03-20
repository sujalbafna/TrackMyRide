
'use client';

import { Stop, WithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, MapPin, User, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

interface RouteTimelineProps {
  stops: WithId<Stop>[];
  currentStopId?: string;
  userStopId?: string;
}

export function RouteTimeline({ stops, currentStopId, userStopId }: RouteTimelineProps) {
  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  }, [stops]);

  const currentStopIndex = useMemo(() => {
    if (!currentStopId) return -1;
    return sortedStops.findIndex(s => s.id === currentStopId);
  }, [sortedStops, currentStopId]);

  if (sortedStops.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        No stops defined for this route.
      </div>
    );
  }

  return (
    <div className="relative space-y-0 py-2">
      {/* Vertical line connecting stops */}
      <div className="absolute left-[19px] top-4 bottom-10 w-0.5 bg-border z-0" />

      {sortedStops.map((stop, index) => {
        const isLast = index === sortedStops.length - 1;
        const isCurrent = stop.id === currentStopId;
        const isPassed = currentStopIndex > index;
        const isUserStop = stop.id === userStopId;

        return (
          <div key={stop.id} className="relative flex items-start gap-4 pb-8 group">
            {/* Step Node */}
            <div className={cn(
              "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background transition-all duration-300",
              isCurrent ? "border-primary scale-110 shadow-md ring-4 ring-primary/20" : 
              isPassed ? "border-green-500 bg-green-50" : "border-muted-foreground/30",
              isUserStop && !isCurrent && !isPassed && "border-accent ring-2 ring-accent/20"
            )}>
              {isCurrent ? (
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              ) : isPassed ? (
                <CheckCircle2 className='w-5 h-5 text-green-500'/>
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className={cn(
              "flex-grow pt-1 transition-opacity",
              isPassed && "opacity-60"
            )}>
              <div className="flex items-center justify-between">
                <div className='flex flex-col'>
                  <h4 className={cn(
                    "font-bold text-sm md:text-base",
                    isCurrent ? "text-primary" : isPassed ? "text-green-600" : "text-foreground"
                  )}>
                    {stop.name}
                  </h4>
                  {isCurrent && (
                    <span className='text-[10px] font-bold text-primary animate-pulse flex items-center gap-1 mt-0.5'>
                      <ArrowRight className='w-3 h-3'/> BUS IS HERE / बस यहाँ है
                    </span>
                  )}
                </div>
                {isUserStop && (
                  <span className="bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-accent/20">
                    <User className="w-2.5 h-2.5" /> MY STOP
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {stop.address || 'Pickup Point'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
