import React, { useEffect, useMemo, useState } from 'react';
import { Task } from '../types';
import { toLocalIsoDate } from '../utils/date';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_MONTH_LABEL_GAP = 3;

interface HeatmapProps {
  tasks: Task[];
}

interface DayCell {
  date: Date;
  key: string;
}

const isoDateToDayNumber = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};

const dayNumberToIsoDate = (dayNumber: number): string => {
  const utcDate = new Date(dayNumber * MS_PER_DAY);
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const Heatmap: React.FC<HeatmapProps> = ({ tasks }) => {
  const [weeksToShow, setWeeksToShow] = useState(24);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 640) setWeeksToShow(21);
      else if (window.innerWidth < 1024) setWeeksToShow(28);
      else setWeeksToShow(36);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const weeks = useMemo<DayCell[][]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());

    return Array.from({ length: weeksToShow }, (_, weekOffset) => {
      const weekStart = new Date(currentWeekSunday);
      weekStart.setDate(currentWeekSunday.getDate() - (weeksToShow - 1 - weekOffset) * DAYS_PER_WEEK);

      return Array.from({ length: DAYS_PER_WEEK }, (_, dayOffset) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayOffset);
        return { date, key: toLocalIsoDate(date) };
      });
    });
  }, [weeksToShow]);

  const { completionMap, visibleContributions, allTimeContributions, maxStreak, currentStreak, intensityCeiling } =
    useMemo(() => {
      const map: Record<string, number> = {};
      tasks.forEach((task) => {
        if (!task.completed || typeof task.completedAt !== 'number' || !Number.isFinite(task.completedAt)) return;
        const dayKey = toLocalIsoDate(new Date(task.completedAt));
        map[dayKey] = (map[dayKey] ?? 0) + 1;
      });

      const todayKey = toLocalIsoDate(new Date());
      const rangeStartKey = weeks[0]?.[0]?.key;
      const allTime = Object.values(map).reduce((sum, count) => sum + count, 0);

      const visible = rangeStartKey
        ? Object.entries(map).reduce((sum, [key, count]) => {
            if (key < rangeStartKey || key > todayKey) return sum;
            return sum + count;
          }, 0)
        : 0;

      const activeDayNumbers = Object.keys(map)
        .map(isoDateToDayNumber)
        .sort((a, b) => a - b);

      let best = 0;
      if (activeDayNumbers.length > 0) {
        let streak = 1;
        best = 1;
        for (let i = 1; i < activeDayNumbers.length; i += 1) {
          if (activeDayNumbers[i] - activeDayNumbers[i - 1] === 1) streak += 1;
          else streak = 1;
          if (streak > best) best = streak;
        }
      }

      const todayDayNumber = isoDateToDayNumber(todayKey);
      let cursor = todayDayNumber;
      if (!map[todayKey]) cursor -= 1;
      let current = 0;
      while (map[dayNumberToIsoDate(cursor)]) {
        current += 1;
        cursor -= 1;
      }

      const visibleMax = rangeStartKey
        ? Object.entries(map).reduce((maxCount, [key, count]) => {
            if (key < rangeStartKey || key > todayKey) return maxCount;
            return Math.max(maxCount, count);
          }, 0)
        : 0;

      return {
        completionMap: map,
        visibleContributions: visible,
        allTimeContributions: allTime,
        maxStreak: best,
        currentStreak: current,
        intensityCeiling: Math.max(1, visibleMax),
      };
    }, [tasks, weeks]);

  const monthLabels = useMemo(() => {
    if (weeks.length === 0) return [];

    const labels: Array<{ label: string; index: number }> = [];

    const tryPush = (index: number, date: Date) => {
      const lastLabel = labels[labels.length - 1];
      if (lastLabel && index - lastLabel.index < MIN_MONTH_LABEL_GAP) return;
      labels.push({
        label: date.toLocaleString('default', { month: 'short' }),
        index,
      });
    };

    tryPush(0, weeks[0][0].date);

    weeks.forEach((week, index) => {
      if (index === 0) return;
      const firstOfMonth = week.find((cell) => cell.date.getDate() === 1);
      if (firstOfMonth) {
        tryPush(index, firstOfMonth.date);
      }
    });

    return labels;
  }, [weeks]);

  const getColor = (count: number) => {
    if (count <= 0) return 'bg-gray-100 dark:bg-zinc-900 border-transparent';

    if (intensityCeiling <= 4) {
      if (count === 1) return 'bg-green-200 dark:bg-green-900 border-transparent';
      if (count === 2) return 'bg-green-400 dark:bg-green-700 border-transparent';
      if (count === 3) return 'bg-green-600 dark:bg-green-500 border-transparent';
      return 'bg-green-800 dark:bg-green-400 border-transparent';
    }

    const ratio = count / intensityCeiling;
    if (ratio <= 0.25) return 'bg-green-200 dark:bg-green-900 border-transparent';
    if (ratio <= 0.5) return 'bg-green-400 dark:bg-green-700 border-transparent';
    if (ratio <= 0.75) return 'bg-green-600 dark:bg-green-500 border-transparent';
    return 'bg-green-800 dark:bg-green-400 border-transparent';
  };

  const CELL_SIZE = 'w-3 h-3';
  const GAP = 'gap-[3px]';
  const COL_WIDTH = 15;
  const todayKey = toLocalIsoDate(new Date());

  return (
    <div className="w-full overflow-hidden flex flex-col gap-6">
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-zinc-800 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div className="px-2 md:px-6 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">
            Total
          </div>
          <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{visibleContributions}</div>
          <div className="text-[9px] text-gray-400 dark:text-zinc-600 mt-1">{allTimeContributions} all-time</div>
        </div>
        <div className="px-2 md:px-6 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">
            Streak
          </div>
          <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{maxStreak}</div>
        </div>
        <div className="px-2 md:px-6 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold mb-1">
            Current
          </div>
          <div className="text-xl md:text-2xl font-mono font-medium text-black dark:text-white">{currentStreak}</div>
        </div>
      </div>

      <div className="w-full pb-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 md:gap-4 px-2 w-max md:w-fit md:mx-auto">
          <div className={`flex flex-col ${GAP} pt-[20px] text-[10px] font-mono text-gray-300 dark:text-zinc-600`}>
            <div className="h-3 flex items-center opacity-0">Sun</div>
            <div className="h-3 flex items-center">Mon</div>
            <div className="h-3 flex items-center opacity-0">Tue</div>
            <div className="h-3 flex items-center">Wed</div>
            <div className="h-3 flex items-center opacity-0">Thu</div>
            <div className="h-3 flex items-center">Fri</div>
            <div className="h-3 flex items-center opacity-0">Sat</div>
          </div>

          <div className="shrink-0">
            <div className="relative h-5 mb-0 text-[10px] font-mono text-gray-400 dark:text-zinc-500">
              {monthLabels.map((month) => (
                <div
                  key={`${month.label}-${month.index}`}
                  className="absolute top-0 transition-all duration-300"
                  style={{ left: `${month.index * COL_WIDTH}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            <div className={`flex ${GAP}`}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className={`flex flex-col ${GAP} shrink-0`}>
                  {week.map((cell) => {
                    const count = completionMap[cell.key] ?? 0;
                    const isFuture = cell.key > todayKey;

                    if (isFuture) {
                      return <div key={cell.key} className={`${CELL_SIZE} opacity-0`} />;
                    }

                    return (
                      <div
                        key={cell.key}
                        title={`${count} ${count === 1 ? 'task' : 'tasks'} on ${cell.date.toLocaleDateString()}`}
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

      <div className="flex items-center justify-between pt-2 px-4 border-t border-transparent dark:border-zinc-800/50">
        <div className="text-[10px] text-gray-400 dark:text-zinc-600 italic">{currentStreak > 0 ? 'On fire! 🔥' : 'Just start.'}</div>

        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-mono">
          <span>Less</span>
          <div className={`${CELL_SIZE} rounded-sm bg-gray-100 dark:bg-zinc-900`} />
          <div className={`${CELL_SIZE} rounded-sm bg-green-200 dark:bg-green-900`} />
          <div className={`${CELL_SIZE} rounded-sm bg-green-400 dark:bg-green-700`} />
          <div className={`${CELL_SIZE} rounded-sm bg-green-600 dark:bg-green-500`} />
          <div className={`${CELL_SIZE} rounded-sm bg-green-800 dark:bg-green-400`} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
