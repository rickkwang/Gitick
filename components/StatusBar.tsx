import React from 'react';
import { Icons } from '../constants';

interface StatusBarProps {
  message: string | null;
  onUndo?: () => void;
  activeFilter: string;
  taskCount: number;
  isFocusActive: boolean;
  focusTimeLeft: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  message, 
  onUndo, 
  activeFilter, 
  taskCount,
  isFocusActive,
  focusTimeLeft
}) => {
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-8 pb-safe box-content bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-t border-gray-200/80 dark:border-zinc-800/80 flex items-center justify-between px-3 text-[10px] font-mono select-none text-gray-400 dark:text-zinc-500 z-50 shrink-0 transition-colors duration-300">
      
      {/* LEFT: Context / Mode */}
      <div className="flex items-center gap-4">
        {/* Active Mode Indicator */}
        <div className="flex items-center gap-2 font-medium hover:text-black dark:hover:text-white transition-colors cursor-pointer">
          <Icons.GitBranch />
          <span>{activeFilter.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center gap-2">
           <Icons.List />
           <span>{taskCount} Objects</span>
        </div>

        {/* The Notification Message */}
        {message && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200 text-black dark:text-white">
             <span className="w-px h-3 bg-gray-200 dark:bg-zinc-700"></span>
             <span className="font-semibold">{message}</span>
             {onUndo && (
               <button 
                 onClick={onUndo}
                 className="underline decoration-gray-300 dark:decoration-zinc-600 hover:decoration-black dark:hover:decoration-white transition-all"
               >
                 Undo
               </button>
             )}
          </div>
        )}
      </div>

      {/* RIGHT: Status Indicators */}
      <div className="flex items-center gap-4">
        
        {/* Focus Timer Mini Display */}
        {isFocusActive && (
           <div className="flex items-center gap-2 text-red-500 animate-pulse">
              <Icons.Clock />
              <span className="font-bold">{formatTime(focusTimeLeft)}</span>
           </div>
        )}

        <div className="hidden md:flex items-center gap-1 hover:text-black dark:hover:text-zinc-300 transition-colors cursor-pointer">
           <span>UTF-8</span>
        </div>
        
        <div className="hidden md:flex items-center gap-1 hover:text-black dark:hover:text-zinc-300 transition-colors cursor-pointer">
           <Icons.CheckCircle />
           <span>Prettier</span>
        </div>

        {/* Online Status */}
        <div className="flex items-center gap-1 hover:text-black dark:hover:text-zinc-300 transition-colors cursor-pointer">
           <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
           <span>Online</span>
        </div>
      </div>
    </div>
  );
};
