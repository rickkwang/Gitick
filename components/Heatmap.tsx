import React, { useMemo } from 'react';
import { Task } from '../types';

interface HeatmapProps {
  tasks: Task[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ tasks }) => {
  // Helper to get local date string YYYY-MM-DD
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Data Processing & Stats ---
  const { completionMap, totalContributions, maxStreak, currentStreak } = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    
    // 1. Build Map & Total
    tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const date = new Date(t.completedAt);
        const dateKey = getLocalDateStr(date);
        if (!map[dateKey]) map[dateKey] = 0;
        map[dateKey]++;
        total++;
      }
    });

    // 2. Calculate Streaks
    const activeDates = Object.keys(map).sort();
    
    let max = 0;
    let current = 0;
    let tempCurrent = 0;
    
    const isNextDay = (d1Str: string, d2Str: string) => {
       const d1 = new Date(d1Str);
       const d2 = new Date(d2Str);
       const diffTime = Math.abs(d2.getTime() - d1.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       return diffDays === 1;
    };

    if (activeDates.length > 0) {
        tempCurrent = 1;
        max = 1;
        for (let i = 0; i < activeDates.length - 1; i++) {
            if (isNextDay(activeDates[i], activeDates[i+1])) {
                tempCurrent++;
            } else {
                tempCurrent = 1;
            }
            if (tempCurrent > max) max = tempCurrent;
        }

        const todayStr = getLocalDateStr(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);

        if (map[todayStr]) {
            current = 1;
            let checkDate = new Date();
            while (true) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkStr = getLocalDateStr(checkDate);
                if (map[checkStr]) {
                    current++;
                } else {
                    break;
                }
            }
        } else if (map[yesterdayStr]) {
            current = 0; 
            let checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - 1); 
            while (true) {
                if (map[getLocalDateStr(checkDate)]) {
                    current++;
                } else {
                    break;
                }
                checkDate.setDate(checkDate.getDate() - 1);
            }
        } else {
            current = 0;
        }
    }

    return { completionMap: map, totalContributions: total, maxStreak: max, currentStreak: current };
  }, [tasks]);


  // --- Grid Generation ---
  // Adjusted to 28 weeks for the medium size
  const weeksToShow = 28; 
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const grid: Date[][] = [];
    
    // Start from the end of this week (Saturday)
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());

    const startDate = new Date(currentWeekSunday);
    startDate.setDate(currentWeekSunday.getDate() - ((weeksToShow - 1) * 7));

    let currentDate = new Date(startDate);

    for (let col = 0; col < weeksToShow; col++) {
        const weekData: Date[] = [];
        for (let row = 0; row < 7; row++) {
            weekData.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        grid.push(weekData);
    }
    return grid;
  }, []);

  // GitHub Green Theme Logic (Sharper squares)
  const getColor = (count: number) => {
    if (!count) return 'bg-gray-50 dark:bg-zinc-900/50 border-gray-100 dark:border-zinc-800/50'; 
    if (count === 1) return 'bg-green-200 dark:bg-green-900 border-transparent';
    if (count === 2) return 'bg-green-400 dark:bg-green-700 border-transparent';
    if (count === 3) return 'bg-green-600 dark:bg-green-500 border-transparent';
    return 'bg-green-800 dark:bg-green-400 border-transparent';
  };

  // Dimensions - Medium Size
  const CELL_SIZE = 'w-3 h-3'; // 12px
  const GAP = 'gap-1'; // 4px
  const COL_WIDTH = 16; // 12 + 4

  // Month Labels Logic
  const monthLabels = useMemo(() => {
      const candidates: { label: string, index: number }[] = [];
      
      weeks.forEach((week, index) => {
          const firstDay = week[0];
          const monthName = firstDay.toLocaleString('default', { month: 'short' });
          
          let isNewMonth = false;
          if (index === 0) {
              isNewMonth = true;
          } else {
              const prevWeekFirstDay = new Date(firstDay);
              prevWeekFirstDay.setDate(firstDay.getDate() - 7);
              const prevMonthName = prevWeekFirstDay.toLocaleString('default', { month: 'short' });
              if (monthName !== prevMonthName) {
                  isNewMonth = true;
              }
          }

          if (isNewMonth) {
              candidates.push({ label: monthName, index });
          }
      });

      const finalLabels: { label: string, index: number }[] = [];
      
      candidates.forEach((item) => {
          if (finalLabels.length === 0) {
              finalLabels.push(item);
          } else {
              const prev = finalLabels[finalLabels.length - 1];
              // Ensure reasonable spacing (approx 2 columns)
              if (item.index - prev.index < 2) {
                  if (prev.index === 0) {
                      finalLabels.pop();
                      finalLabels.push(item);
                  }
              } else {
                  finalLabels.push(item);
              }
          }
      });
      
      return finalLabels;
  }, [weeks]);


  return (
    <div className="w-full overflow-hidden flex flex-col gap-8">
      
      {/* 1. Stats Overview Bar */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800 border-b border-gray-100 dark:border-zinc-800 pb-5">
          <div className="px-4 first:pl-0">
             <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Total</div>
             <div className="text-2xl font-mono font-medium text-black dark:text-white">{totalContributions}</div>
          </div>
          <div className="px-4">
             <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Max Streak</div>
             <div className="text-2xl font-mono font-medium text-black dark:text-white">{maxStreak} <span className="text-sm text-gray-400">days</span></div>
          </div>
          <div className="px-4">
             <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Current</div>
             <div className="text-2xl font-mono font-medium text-black dark:text-white">{currentStreak} <span className="text-sm text-gray-400">days</span></div>
          </div>
      </div>

      {/* 2. Graph Area */}
      <div className="flex gap-4 w-full">
        {/* Y-Axis Labels (Days) */}
        {/* pt-[1.25rem] matches the month label row height (h-3 + mb-2 = 12px + 8px = 20px) */}
        <div className={`flex flex-col ${GAP} pt-[1.25rem] text-[10px] font-mono text-gray-300 dark:text-zinc-600`}>
           <div className="h-3 flex items-center opacity-0">Sun</div>
           <div className="h-3 flex items-center">Mon</div>
           <div className="h-3 flex items-center opacity-0">Tue</div>
           <div className="h-3 flex items-center">Wed</div>
           <div className="h-3 flex items-center opacity-0">Thu</div>
           <div className="h-3 flex items-center">Fri</div>
           <div className="h-3 flex items-center opacity-0">Sat</div>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-x-auto no-scrollbar">
            <div className="min-w-max pb-2">
                {/* X-Axis Labels (Months) */}
                <div className="flex mb-2 text-[10px] font-mono text-gray-400 dark:text-zinc-500 relative h-3">
                   {monthLabels.map((m, i) => (
                       <div 
                         key={i} 
                         className="absolute"
                         style={{ left: `${m.index * COL_WIDTH}px` }} 
                       >
                         {m.label}
                       </div>
                   ))}
                </div>

                {/* The Grid */}
                <div className={`flex ${GAP}`}>
                    {weeks.map((week, wIdx) => (
                    <div key={wIdx} className={`flex flex-col ${GAP} shrink-0`}>
                        {week.map((date, dIdx) => {
                            const dateStr = getLocalDateStr(date);
                            const count = completionMap[dateStr] || 0;
                            const isFuture = date > new Date();
                            
                            // Invisible placeholder for future days
                            if (isFuture) {
                                return <div key={dateStr} className={`${CELL_SIZE} opacity-0`} />
                            }

                            return (
                                <div 
                                key={dateStr}
                                title={`${count} tasks on ${dateStr}`}
                                className={`${CELL_SIZE} transition-colors border rounded-[1px] ${getColor(count)}`}
                                />
                            );
                        })}
                    </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* 3. Legend */}
      <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 dark:text-zinc-600 italic">
            {currentStreak > 0 ? "Keep the streak alive!" : "Make a commit today."}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            <span>Less</span>
            <div className={`${CELL_SIZE} rounded-[1px] bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800`}></div>
            <div className={`${CELL_SIZE} rounded-[1px] bg-green-200 dark:bg-green-900`}></div>
            <div className={`${CELL_SIZE} rounded-[1px] bg-green-400 dark:bg-green-700`}></div>
            <div className={`${CELL_SIZE} rounded-[1px] bg-green-600 dark:bg-green-500`}></div>
            <div className={`${CELL_SIZE} rounded-[1px] bg-green-800 dark:bg-green-400`}></div>
            <span>More</span>
          </div>
      </div>
    </div>
  );
};