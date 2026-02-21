import React, { useMemo, useState, useEffect } from 'react';
import { Task } from '../types';
import { toLocalIsoDate } from '../utils/date';

interface HeatmapProps {
  tasks: Task[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ tasks }) => {
  // Responsive weeks count
  const [weeksToShow, setWeeksToShow] = useState(24);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        // Mobile: 21 weeks (~5 months).
        if (window.innerWidth < 640) setWeeksToShow(21); 
        else if (window.innerWidth < 1024) setWeeksToShow(28); // Tablet
        else setWeeksToShow(36); // Desktop
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Data Processing & Stats ---
  const { completionMap, totalContributions, maxStreak, currentStreak } = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    
    // 1. Build Map & Total
    tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const date = new Date(t.completedAt);
        const dateKey = toLocalIsoDate(date);
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
    
    // Robust date diff
    const getDiffDays = (d1Str: string, d2Str: string) => {
       const d1 = new Date(d1Str);
       const d2 = new Date(d2Str);
       // Normalize to UTC midnight to avoid DST issues
       const u1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
       const u2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
       return Math.round((u2 - u1) / (1000 * 60 * 60 * 24));
    };

    if (activeDates.length > 0) {
        tempCurrent = 1;
        max = 1;
        for (let i = 0; i < activeDates.length - 1; i++) {
            if (getDiffDays(activeDates[i], activeDates[i+1]) === 1) {
                tempCurrent++;
            } else {
                tempCurrent = 1;
            }
            if (tempCurrent > max) max = tempCurrent;
        }

        const todayStr = toLocalIsoDate(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalIsoDate(yesterday);

        if (map[todayStr]) {
            current = 1;
            let checkDate = new Date();
            while (true) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkStr = toLocalIsoDate(checkDate);
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
                if (map[toLocalIsoDate(checkDate)]) {
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
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const grid: Date[][] = [];
    
    // Start from the end of this week (Saturday)
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());

    // Calculate start date based on weeksToShow
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
  }, [weeksToShow]);

  // GitHub Green Theme Logic (Sharper squares)
  const getColor = (count: number) => {
    if (!count) return 'bg-gray-100 dark:bg-zinc-900 border-transparent'; 
    if (count === 1) return 'bg-green-200 dark:bg-green-900 border-transparent';
    if (count === 2) return 'bg-green-400 dark:bg-green-700 border-transparent';
    if (count === 3) return 'bg-green-600 dark:bg-green-500 border-transparent';
    return 'bg-green-800 dark:bg-green-400 border-transparent';
  };

  // Dimensions
  const CELL_SIZE = 'w-3 h-3'; // 12px
  const GAP = 'gap-[3px]'; // Slightly tighter gap for consistency
  const COL_WIDTH = 15; // 12px (w-3) + 3px (gap)

  // Improved Month Labels Logic: Start-Aligned with Safe Spacing
  const monthLabels = useMemo(() => {
      if (weeks.length === 0) return [];

      // 1. Identify month for each column
      const columnMonths = weeks.map(week => {
          const counts: Record<string, number> = {};
          week.forEach(d => {
             const key = `${d.getFullYear()}-${d.getMonth()}`;
             counts[key] = (counts[key] || 0) + 1;
          });
          // Find dominant month
          let dom = ""; let max = 0;
          for (const [k, v] of Object.entries(counts)) {
             if (v > max) { max = v; dom = k; }
          }
          return dom;
      });

      // 2. Find start indices of new months
      const labelIndices: number[] = [];
      
      // Always consider the first column (Left Edge)
      labelIndices.push(0);

      for (let i = 1; i < columnMonths.length; i++) {
          // If month changes, this is a start
          if (columnMonths[i] !== columnMonths[i-1]) {
              labelIndices.push(i);
          }
      }

      // 3. Filter for minimum spacing at the start (Smart Edge Filtering)
      // If the second label (the real month start) is too close to the left edge (index 0),
      // we remove index 0. This prioritizes the full month label over the fragment.
      // Threshold: 3 columns (~45px). "Sep" text width is ~20px. 
      // If gap is 1 or 2, it looks crowded.
      if (labelIndices.length > 1 && (labelIndices[1] - labelIndices[0] < 3)) {
          labelIndices.shift(); // Remove the edge fragment label
      }

      // 4. Map to label objects
      return labelIndices.map(index => {
          const key = columnMonths[index];
          const [y, m] = key.split('-').map(Number);
          const date = new Date(y, m, 1);
          return {
              label: date.toLocaleString('default', { month: 'short' }),
              index: index
          };
      });
  }, [weeks]);


  return (
    <div className="w-full overflow-hidden flex flex-col gap-6">
      
      {/* 1. Stats Overview Bar */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800 border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div className="px-2 md:px-6 text-center">
             <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Total</div>
             <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{totalContributions}</div>
          </div>
          <div className="px-2 md:px-6 text-center">
             <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Streak</div>
             <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{maxStreak}</div>
          </div>
          <div className="px-2 md:px-6 text-center">
             <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">Current</div>
             <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{currentStreak}</div>
          </div>
      </div>

      {/* 2. Graph Area - CENTERED & Scrollable on tiny screens */}
      <div className="w-full pb-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 md:gap-4 px-2 w-max md:w-fit md:mx-auto">
            {/* Y-Axis Labels (Days) */}
            <div className={`flex flex-col ${GAP} pt-[20px] text-[10px] font-mono text-gray-300 dark:text-zinc-600`}>
                <div className="h-3 flex items-center opacity-0">Sun</div>
                <div className="h-3 flex items-center">Mon</div>
                <div className="h-3 flex items-center opacity-0">Tue</div>
                <div className="h-3 flex items-center">Wed</div>
                <div className="h-3 flex items-center opacity-0">Thu</div>
                <div className="h-3 flex items-center">Fri</div>
                <div className="h-3 flex items-center opacity-0">Sat</div>
            </div>

            {/* Grid */}
            <div className="shrink-0">
                {/* X-Axis Labels (Months) */}
                <div className="relative h-5 mb-0 text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                {monthLabels.map((m, i) => (
                    <div 
                        key={i} 
                        className="absolute top-0 transition-all duration-300"
                        // Align label to the start of the column (plus slight buffer for visual center of 1st column)
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
                            const dateStr = toLocalIsoDate(date);
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
                                className={`${CELL_SIZE} rounded-sm transition-colors ${getColor(count)}`}
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
      <div className="flex items-center justify-between pt-2 px-4 border-t border-transparent dark:border-zinc-800/50">
          <div className="text-[10px] text-gray-400 dark:text-zinc-600 italic">
            {currentStreak > 0 ? "On fire! 🔥" : "Just start."}
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-mono">
            <div className={`${CELL_SIZE} rounded-sm bg-gray-100 dark:bg-zinc-900`}></div>
            <div className={`${CELL_SIZE} rounded-sm bg-green-200 dark:bg-green-900`}></div>
            <div className={`${CELL_SIZE} rounded-sm bg-green-400 dark:bg-green-700`}></div>
            <div className={`${CELL_SIZE} rounded-sm bg-green-600 dark:bg-green-500`}></div>
            <div className={`${CELL_SIZE} rounded-sm bg-green-800 dark:bg-green-400`}></div>
          </div>
      </div>
    </div>
  );
};
