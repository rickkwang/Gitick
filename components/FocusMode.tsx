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
      <div className="max-w-[960px] mx-auto w-full h-full px-10 py-12 flex flex-col">
      {/* Top Section: Timer Visualization */}
      <div className="flex-[1.15] flex flex-col items-center justify-center p-8 min-h-[360px]">
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
             {/* Background Circle */}
             <circle
               cx="50%" cy="50%" r="48%"
               fill="none"
               stroke="currentColor"
               className="text-primary-200 dark:text-dark-border transition-colors duration-300"
               strokeWidth="3"
             />
             {/* Progress Circle */}
             <circle
               cx="50%" cy="50%" r="48%" fill="none"
               stroke="currentColor"
               strokeWidth="3"
               strokeDasharray="301%"
               strokeDashoffset={`${301 - (301 * (100 - progress)) / 100}%`} 
               strokeLinecap="round"
               className={`transition-all duration-300 ease-in-out ${mode === 'focus' ? 'text-primary-900 dark:text-dark-text' : 'text-primary-400 dark:text-dark-muted'}`}
             />
          </svg>

          {/* Centered Time Display (No buttons inside to prevent overlap) */}
          <div className="absolute flex flex-col items-center justify-center w-full z-10">
            <span className="text-[5rem] leading-none font-light text-primary-900 dark:text-dark-text tabular-nums tracking-tighter select-none font-sans">
                {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-bold text-primary-400 dark:text-dark-muted uppercase tracking-[0.2em] mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {isActive ? (mode === 'focus' ? 'Focusing' : 'Break Time') : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Controls */}
      <div className="shrink-0 mt-4 p-6 pb-10 flex flex-col items-center gap-7 z-20">
          
          {/* Main Action Buttons */}
          <div className="w-full max-w-md grid grid-cols-3 gap-3">
             <button
              onClick={onStart}
              disabled={isActive}
              className={`
                h-12 rounded-lg text-sm font-semibold uppercase tracking-wide border transition-all duration-200
                ${isActive
                  ? 'bg-primary-200/50 dark:bg-dark-bg text-primary-300 dark:text-dark-muted border-primary-200 dark:border-dark-border cursor-not-allowed'
                  : 'bg-[var(--accent)] text-white border-transparent hover:shadow-lg hover:shadow-black/15'}
              `}
            >
              {startLabel}
            </button>

            <button
              onClick={onPause}
              disabled={!isActive}
              className={`
                h-12 rounded-lg text-sm font-semibold uppercase tracking-wide border transition-colors duration-200
                ${isActive
                  ? 'bg-primary-50 dark:bg-dark-bg text-primary-900 dark:text-dark-text border-primary-300 dark:border-dark-border hover:bg-primary-100 dark:hover:bg-dark-border'
                  : 'bg-primary-200/50 dark:bg-dark-bg text-primary-300 dark:text-dark-muted border-primary-200 dark:border-dark-border cursor-not-allowed'}
              `}
            >
              Stop
            </button>

            <button
              onClick={resetTimer}
              disabled={!canReset}
              className={`
                h-12 rounded-lg text-sm font-semibold uppercase tracking-wide border transition-colors duration-200 flex items-center justify-center gap-1.5
                ${canReset
                  ? 'bg-primary-50 dark:bg-dark-bg text-primary-600 dark:text-dark-text border-primary-300 dark:border-dark-border hover:text-[var(--status-danger-text)] hover:border-[var(--status-danger-border)]'
                  : 'bg-primary-200/50 dark:bg-dark-bg text-primary-300 dark:text-dark-muted border-primary-200 dark:border-dark-border cursor-not-allowed'}
              `}
            >
              <Icons.Refresh />
              Reset
            </button>
          </div>

          {/* Time Adjustment Controls (Hidden when active to reduce clutter) */}
          <div className={`flex flex-col items-center gap-6 transition-all duration-300 ${isActive ? 'opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden' : 'opacity-100 translate-y-0 h-auto'}`}>
             
             {/* Presets Row with Flanking +/- */}
             <div className="flex items-center gap-3 p-1.5 bg-primary-100 dark:bg-dark-bg rounded-lg border border-primary-200/80 dark:border-dark-border">
                <button 
                   onClick={() => adjustTime(-5)}
                   className="w-10 h-10 flex items-center justify-center rounded-xl text-primary-400 hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-50 dark:hover:bg-dark-border transition-colors"
                >
                   <Icons.Minus />
                </button>

                <div className="h-4 w-px bg-primary-200 dark:bg-dark-border mx-1"></div>

                <div className="flex gap-1">
                   {presets.map(min => (
                      <button 
                          key={min}
                          onClick={() => setPreset(min)}
                          className={`
                            px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all
                            ${timeLeft === min * 60
                               ? 'bg-primary-50 dark:bg-dark-border text-primary-900 dark:text-dark-text shadow-sm font-bold'
                               : 'text-primary-400 dark:text-dark-muted hover:text-primary-600 dark:hover:text-dark-muted'}
                          `}
                      >
                          {min}m
                      </button>
                   ))}
                </div>

                <div className="h-4 w-px bg-primary-200 dark:bg-dark-border mx-1"></div>

                <button
                   onClick={() => adjustTime(5)}
                   className="w-10 h-10 flex items-center justify-center rounded-xl text-primary-400 hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-50 dark:hover:bg-dark-border transition-colors"
                >
                   <Icons.Plus />
                </button>
             </div>

             {/* Mode Switcher */}
             <div className="flex gap-6 text-xs font-medium tracking-wide">
                <button 
                  onClick={() => switchMode('focus')} 
                  className={`transition-colors pb-1 border-b-2 ${mode === 'focus' ? 'text-primary-900 dark:text-dark-text border-primary-900 dark:border-dark-text' : 'text-primary-300 dark:text-dark-muted border-transparent hover:text-primary-500'}`}
                >
                  Focus
                </button>
                <button
                  onClick={() => switchMode('break')}
                  className={`transition-colors pb-1 border-b-2 ${mode === 'break' ? 'text-primary-900 dark:text-dark-text border-primary-900 dark:border-dark-text' : 'text-primary-300 dark:text-dark-muted border-transparent hover:text-primary-500'}`}
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
