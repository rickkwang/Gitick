import React from 'react';
import { Icons } from '../constants';

interface FocusModeProps {
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  mode: 'focus' | 'break';
  setMode: (mode: 'focus' | 'break') => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ 
  timeLeft, 
  setTimeLeft, 
  isActive, 
  onStart,
  onPause,
  onReset,
  mode, 
  setMode 
}) => {
  
  const switchMode = (newMode: 'focus' | 'break') => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  };

  const adjustTime = (minutes: number) => {
    if (isActive) return;
    setTimeLeft(prev => {
       const newVal = prev + (minutes * 60);
       return Math.max(60, Math.min(180 * 60, newVal)); // Clamp between 1m and 180m
    });
  };

  const resetTimer = () => {
    onReset();
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
  const defaultTime = mode === 'focus' ? 25 * 60 : 5 * 60;
  const canReset = isActive || timeLeft !== defaultTime;
  const startLabel = timeLeft === defaultTime
    ? mode === 'focus'
      ? 'Start Focus'
      : 'Start Break'
    : 'Resume';

  const visualMax = Math.max(60 * 60, timeLeft); 
  const progress = ((visualMax - timeLeft) / visualMax) * 100;

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] relative overflow-hidden transition-colors duration-300">
      <div className="max-w-[960px] mx-auto w-full h-full px-6 md:px-10 py-8 md:py-12 flex flex-col">
      {/* Top Section: Timer Visualization */}
      <div className="flex-[1.15] flex flex-col items-center justify-center p-6 md:p-8 min-h-[360px]">
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
      <div className="shrink-0 mt-2 md:mt-4 p-4 md:p-6 pb-safe md:pb-10 flex flex-col items-center gap-6 md:gap-7 z-20">
          
          {/* Main Action Buttons */}
          <div className="w-full max-w-md grid grid-cols-3 gap-2 md:gap-3">
             <button
              onClick={onStart}
              disabled={isActive}
              className={`
                h-12 rounded-2xl text-xs md:text-sm font-semibold uppercase tracking-wide border transition-all duration-200
                ${isActive
                  ? 'bg-gray-100 dark:bg-zinc-900 text-gray-300 dark:text-zinc-700 border-gray-200 dark:border-zinc-800 cursor-not-allowed'
                  : 'bg-black dark:bg-white text-white dark:text-black border-transparent hover:shadow-lg hover:shadow-black/15 dark:hover:shadow-white/10'}
              `}
            >
              {startLabel}
            </button>

            <button
              onClick={onPause}
              disabled={!isActive}
              className={`
                h-12 rounded-2xl text-xs md:text-sm font-semibold uppercase tracking-wide border transition-colors duration-200
                ${isActive
                  ? 'bg-white dark:bg-zinc-900 text-black dark:text-white border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
                  : 'bg-gray-100 dark:bg-zinc-900 text-gray-300 dark:text-zinc-700 border-gray-200 dark:border-zinc-800 cursor-not-allowed'}
              `}
            >
              Stop
            </button>

            <button
              onClick={resetTimer}
              disabled={!canReset}
              className={`
                h-12 rounded-2xl text-xs md:text-sm font-semibold uppercase tracking-wide border transition-colors duration-200 flex items-center justify-center gap-1.5
                ${canReset
                  ? 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:text-red-500 hover:border-red-300 dark:hover:text-red-400 dark:hover:border-red-800'
                  : 'bg-gray-100 dark:bg-zinc-900 text-gray-300 dark:text-zinc-700 border-gray-200 dark:border-zinc-800 cursor-not-allowed'}
              `}
            >
              <Icons.Refresh />
              Reset
            </button>
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
    </div>
  );
};
