
'use client';

import { Navigation, MoreVertical, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationOverlayProps {
  instruction?: string;
  distance?: string;
  isVisible: boolean;
}

export function NavigationOverlay({ instruction, distance, isVisible }: NavigationOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-20 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-[#00695C] text-white rounded-xl shadow-2xl overflow-hidden flex items-center p-4 min-h-[80px] border border-white/10">
        {/* Navigation Icon */}
        <div className="bg-white/20 p-2.5 rounded-xl mr-4">
          <Navigation className="w-6 h-6 fill-current rotate-45" />
        </div>

        {/* Text Content */}
        <div className="flex-grow">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
            Current Step
          </p>
          <h3 className="text-lg md:text-xl font-bold leading-tight line-clamp-1">
            {instruction || 'Calculating Route...'}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-sm font-medium opacity-90">
            <span>Next Turn: {distance || '-- km'}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Actions */}
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2">
          <MoreVertical className="w-5 h-5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
