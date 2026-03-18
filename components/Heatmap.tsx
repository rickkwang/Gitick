import React, { useEffect, useMemo, useState } from 'react';
import { Task } from '../types';
import { toLocalIsoDate } from '../utils/date';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_MONTH_LABEL_GAP = 3;
const CELL_PX = 10;
const CELL_GAP_PX = 2;

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

const isoDateToLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const Heatmap: React.FC<HeatmapProps> = ({ tasks }) => {
  const [weeksToShow, setWeeksToShow] = useState(24);

  useEffect(() => {
    let resizeTimer: number | null = null;

    const resolveWeeksToShow = () => {
      if (window.innerWidth < 640) return 21;
      if (window.innerWidth < 1024) return 28;
      return 36;
    };

    const updateWeeksToShow = () => {
      const nextWeeks = resolveWeeksToShow();
      setWeeksToShow((prev) => (prev === nextWeeks ? prev : nextWeeks));
    };

    const handleResize = () => {
      if (resizeTimer !== null) return;
      resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        updateWeeksToShow();
      }, 120);
    };

    updateWeeksToShow();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
    };
  }, []);

  const weeks = useMemo<DayCell[][]>(() => {
    const now = new Date();
    const todayKey = toLocalIsoDate(now);
    const todayDayNumber = isoDateToDayNumber(todayKey);
    const currentWeekSundayDayNumber = todayDayNumber - now.getDay();
    const firstVisibleWeekSundayDayNumber = currentWeekSundayDayNumber - (weeksToShow - 1) * DAYS_PER_WEEK;

    return Array.from({ length: weeksToShow }, (_, weekOffset) =>
      Array.from({ length: DAYS_PER_WEEK }, (_, dayOffset) => {
        const dayNumber = firstVisibleWeekSundayDayNumber + weekOffset * DAYS_PER_WEEK + dayOffset;
        const key = dayNumberToIsoDate(dayNumber);
        return { date: isoDateToLocalDate(key), key };
      }),
    );
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
    if (count <= 0) return 'bg-primary-200/50 dark:bg-dark-border';

    if (intensityCeiling <= 4) {
      if (count === 1) return 'bg-teal-200 dark:bg-teal-700';
      if (count === 2) return 'bg-teal-400 dark:bg-teal-600';
      if (count === 3) return 'bg-teal-500 dark:bg-teal-500';
      return 'bg-teal-700 dark:bg-teal-400';
    }

    const ratio = count / intensityCeiling;
    if (ratio <= 0.25) return 'bg-teal-200 dark:bg-teal-700';
    if (ratio <= 0.5) return 'bg-teal-400 dark:bg-teal-600';
    if (ratio <= 0.75) return 'bg-teal-500 dark:bg-teal-500';
    return 'bg-teal-700 dark:bg-teal-400';
  };

  const CELL_SIZE = 'w-[10px] h-[10px]';
  const GAP = 'gap-[2px]';
  const COL_WIDTH = CELL_PX + CELL_GAP_PX;
  const todayKey = toLocalIsoDate(new Date());

  return (
    <div className="w-full overflow-hidden flex flex-col gap-4">
      <div className="grid grid-cols-3 divide-x divide-primary-200/80 dark:divide-dark-border border-b border-primary-200/80 dark:border-dark-border pb-3">
        <div className="px-2 md:px-5 text-center">
          <div className="text-[10px] uppercase tracking-wider text-primary-400 dark:text-dark-muted font-bold mb-1">
            Total
          </div>
          <div className="text-lg md:text-xl font-mono font-medium text-primary-900 dark:text-dark-text">{visibleContributions}</div>
          <div className="text-[8px] text-primary-400 dark:text-dark-muted mt-1">{allTimeContributions} all-time</div>
        </div>
        <div className="px-2 md:px-5 text-center">
          <div className="text-[10px] uppercase tracking-wider text-primary-400 dark:text-dark-muted font-bold mb-1">
            Streak
          </div>
          <div className="text-lg md:text-xl font-mono font-medium text-primary-900 dark:text-dark-text">{maxStreak}</div>
        </div>
        <div className="px-2 md:px-5 text-center">
          <div className="text-[10px] uppercase tracking-wider text-primary-400 dark:text-dark-muted font-bold mb-1">
            Current
          </div>
          <div className="text-lg md:text-xl font-mono font-medium text-primary-900 dark:text-dark-text">{currentStreak}</div>
        </div>
      </div>

      <div className="w-full pb-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 md:gap-3 px-2 w-max md:w-fit md:mx-auto">
          <div className={`flex flex-col ${GAP} pt-[18px] text-[9px] font-mono text-primary-300 dark:text-dark-muted`}>
            <div className="h-2.5 flex items-center opacity-0">Sun</div>
            <div className="h-2.5 flex items-center">Mon</div>
            <div className="h-2.5 flex items-center opacity-0">Tue</div>
            <div className="h-2.5 flex items-center">Wed</div>
            <div className="h-2.5 flex items-center opacity-0">Thu</div>
            <div className="h-2.5 flex items-center">Fri</div>
            <div className="h-2.5 flex items-center opacity-0">Sat</div>
          </div>

          <div className="shrink-0">
            <div className="relative h-4 mb-0 text-[9px] font-mono text-primary-400 dark:text-dark-muted">
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

      <div className="flex items-center justify-between pt-1.5 px-3 border-t border-transparent dark:border-dark-border">
        <div className="text-[9px] text-primary-400 dark:text-dark-muted italic">{currentStreak > 0 ? 'On fire! 🔥' : 'Just start.'}</div>

        <div className="flex items-center gap-1 text-[8px] text-primary-400 font-mono">
          <span>Less</span>
          <div className={`${CELL_SIZE} rounded-sm bg-primary-200/50 dark:bg-dark-border`} />
          <div className={`${CELL_SIZE} rounded-sm bg-teal-200 dark:bg-teal-700`} />
          <div className={`${CELL_SIZE} rounded-sm bg-teal-400 dark:bg-teal-600`} />
          <div className={`${CELL_SIZE} rounded-sm bg-teal-500 dark:bg-teal-500`} />
          <div className={`${CELL_SIZE} rounded-sm bg-teal-700 dark:bg-teal-400`} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
