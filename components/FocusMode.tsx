import React from 'react';
import { Icons } from '../constants';

interface FocusModeProps {
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  mode: 'focus' | 'break';
  setMode: React.Dispatch<React.SetStateAction<'focus' | 'break'>>;
}

export const FocusMode: React.FC<FocusModeProps> = ({ 
  timeLeft, 
  setTimeLeft, 
  isActive, 
  setIsActive, 
  mode, 
  setMode 
}) => {
  
  const toggleTimer = () => setIsActive(!isActive);
  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const adjustTime = (minutes: number) => {
    if (isActive) return;
    setTimeLeft(prev => {
       const newVal = prev + (minutes * 60);
       return Math.max(60, Math.min(180 * 60, newVal)); // Clamp between 1m and 180m
    });
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const setPreset = (minutes: number) => {
    if (isActive) return;
    setTimeLeft(minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Preset options in minutes
  const presets = [15, 25, 45, 60];

  const visualMax = Math.max(60 * 60, timeLeft); 
  const progress = ((visualMax - timeLeft) / visualMax) * 100;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-surface relative overflow-hidden">
      
      {/* Top Section: Timer Visualization */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
             {/* Background Circle */}
             <circle 
               cx="50%" cy="50%" r="48%" 
               fill="none" 
               stroke="currentColor" 
               className="text-gray-100 dark:text-zinc-800/50 transition-colors duration-500" 
               strokeWidth="2" 
             />
             {/* Progress Circle */}
             <circle
               cx="50%" cy="50%" r="48%" fill="none"
               stroke="currentColor"
               strokeWidth="3"
               strokeDasharray="301%"
               strokeDashoffset={`${301 - (301 * (100 - progress)) / 100}%`} 
               strokeLinecap="round"
               className={`transition-all duration-1000 ease-in-out ${mode === 'focus' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}
             />
          </svg>

          {/* Centered Time Display (No buttons inside to prevent overlap) */}
          <div className="absolute flex flex-col items-center justify-center w-full z-10">
            <span className="text-[4rem] md:text-[5rem] leading-none font-light text-black dark:text-white tabular-nums tracking-tighter select-none font-sans">
                {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em] mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {isActive ? (mode === 'focus' ? 'Focusing' : 'Break Time') : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Controls */}
      <div className="shrink-0 p-8 pb-safe md:pb-12 flex flex-col items-center gap-8 bg-white dark:bg-dark-surface z-20">
          
          {/* Main Action Button */}
          <div className="flex items-center gap-4 w-full max-w-sm justify-center">
             <button
              onClick={toggleTimer}
              className={`
              h-16 px-12 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 transform hover:scale-105 active:scale-95
              ${isActive 
                  ? 'bg-white dark:bg-zinc-900 text-black dark:text-white border-2 border-black dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800' 
                  : 'bg-black dark:bg-white text-white dark:text-black shadow-2xl shadow-black/20 dark:shadow-white/10 border-2 border-transparent'}
              `}
            >
              {isActive ? 'Pause' : 'Start Focus'}
            </button>

            {isActive && (
               <button
                 onClick={resetTimer}
                 className="h-16 w-16 flex items-center justify-center rounded-full border border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/30 transition-all bg-white dark:bg-black hover:bg-red-50 dark:hover:bg-red-900/10"
                 title="Reset"
               >
                  <Icons.Refresh />
               </button>
            )}
          </div>

          {/* Time Adjustment Controls (Hidden when active to reduce clutter) */}
          <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${isActive ? 'opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden' : 'opacity-100 translate-y-0 h-auto'}`}>
             
             {/* Presets Row with Flanking +/- */}
             <div className="flex items-center gap-2 md:gap-3 p-1.5 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <button 
                   onClick={() => adjustTime(-5)}
                   className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                >
                   <Icons.Minus />
                </button>

                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 mx-1"></div>

                <div className="flex gap-1">
                   {presets.map(min => (
                      <button 
                          key={min}
                          onClick={() => setPreset(min)}
                          className={`
                            px-2 md:px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all
                            ${timeLeft === min * 60 
                               ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm font-bold' 
                               : 'text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400'}
                          `}
                      >
                          {min}m
                      </button>
                   ))}
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 mx-1"></div>

                <button 
                   onClick={() => adjustTime(5)}
                   className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                >
                   <Icons.Plus />
                </button>
             </div>

             {/* Mode Switcher */}
             <div className="flex gap-6 text-xs font-medium tracking-wide">
                <button 
                  onClick={() => switchMode('focus')} 
                  className={`transition-colors pb-1 border-b-2 ${mode === 'focus' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-300 dark:text-zinc-700 border-transparent hover:text-gray-500'}`}
                >
                  Focus
                </button>
                <button 
                  onClick={() => switchMode('break')} 
                  className={`transition-colors pb-1 border-b-2 ${mode === 'break' ? 'text-black dark:text-white border-black dark:border-white' : 'text-gray-300 dark:text-zinc-700 border-transparent hover:text-gray-500'}`}
                >
                  Break
                </button>
             </div>
          </div>
      </div>
    </div>
  );
};