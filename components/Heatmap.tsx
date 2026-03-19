import React, { useEffect, useMemo, useState } from 'react';
import { Task } from '../types';
import { toLocalIsoDate } from '../utils/date';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_MONTH_LABEL_GAP = 4;
const CELL_PX = 10;
const CELL_GAP_PX = 2;

interface HeatmapProps {
  tasks: Task[];
}

interface DayCell {
  date: Date;
  key: string;
}

interface PeriodStats {
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
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
      if (window.innerWidth < 640) return 16;
      if (window.innerWidth < 1024) return 20;
      return 26;
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

  const {
    completionMap,
    visibleContributions,
    allTimeContributions,
    maxStreak,
    currentStreak,
    intensityCeiling,
    bestDayCount,
    last7Stats,
    last30Stats,
  } =
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

      const getPeriodStats = (periodDays: number): PeriodStats => {
        let current = 0;
        let previous = 0;
        for (let i = 0; i < periodDays; i += 1) {
          current += map[dayNumberToIsoDate(todayDayNumber - i)] ?? 0;
        }
        for (let i = periodDays; i < periodDays * 2; i += 1) {
          previous += map[dayNumberToIsoDate(todayDayNumber - i)] ?? 0;
        }
        const delta = current - previous;
        const percent = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : null;
        return { current, previous, delta, percent };
      };

      const bestDayCount = Object.values(map).reduce((best, count) => Math.max(best, count), 0);

      return {
        completionMap: map,
        visibleContributions: visible,
        allTimeContributions: allTime,
        maxStreak: best,
        currentStreak: current,
        intensityCeiling: Math.max(1, visibleMax),
        bestDayCount,
        last7Stats: getPeriodStats(7),
        last30Stats: getPeriodStats(30),
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
    if (count <= 0) return 'bg-[var(--heat-0)]';

    if (intensityCeiling <= 4) {
      if (count === 1) return 'bg-[var(--heat-1)]';
      if (count === 2) return 'bg-[var(--heat-2)]';
      if (count === 3) return 'bg-[var(--heat-3)]';
      return 'bg-[var(--heat-4)]';
    }

    const ratio = count / intensityCeiling;
    if (ratio <= 0.25) return 'bg-[var(--heat-1)]';
    if (ratio <= 0.5) return 'bg-[var(--heat-2)]';
    if (ratio <= 0.75) return 'bg-[var(--heat-3)]';
    return 'bg-[var(--heat-4)]';
  };

  const CELL_SIZE = 'w-[11px] h-[11px]';
  const GAP = 'gap-[2px]';
  const COL_WIDTH = CELL_PX + CELL_GAP_PX;
  const todayKey = toLocalIsoDate(new Date());
  const hasAnyActivity = allTimeContributions > 0;

  const renderTrend = (stats: PeriodStats) => {
    if (stats.percent === null) {
      return <span className="text-[10px] text-primary-400 dark:text-dark-muted">No prior data</span>;
    }

    const direction = stats.delta > 0 ? '+' : '';
    const trendClass =
      stats.delta > 0
        ? 'text-[var(--status-success-text)]'
        : stats.delta < 0
          ? 'text-[var(--status-danger-text)]'
          : 'text-primary-400 dark:text-dark-muted';

    return (
      <span className={`text-[10px] font-semibold ${trendClass}`}>
        {direction}
        {Math.round(stats.percent)}%
      </span>
    );
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
        <div className="rounded-lg border border-primary-200/70 dark:border-dark-border/70 bg-primary-50 dark:bg-dark-bg/40 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-primary-400 dark:text-dark-muted">Last 6 months activity</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-display font-semibold text-primary-900 dark:text-dark-text">{visibleContributions}</span>
            <span className="text-[10px] text-primary-400 dark:text-dark-muted">completed</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-primary-500 dark:text-dark-muted">Last 7 days</span>
              <span className="font-semibold text-primary-900 dark:text-dark-text">{last7Stats.current}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-primary-400 dark:text-dark-muted">vs previous 7 days</span>
              {renderTrend(last7Stats)}
            </div>
            <div className="h-px bg-primary-200/70 dark:bg-dark-border/70" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-primary-500 dark:text-dark-muted">Last 30 days</span>
              <span className="font-semibold text-primary-900 dark:text-dark-text">{last30Stats.current}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-primary-400 dark:text-dark-muted">vs previous 30 days</span>
              {renderTrend(last30Stats)}
            </div>
            <div className="h-px bg-primary-200/70 dark:bg-dark-border/70" />
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <p className="text-[10px] text-primary-400 dark:text-dark-muted">Current streak</p>
                <p className="text-sm font-semibold text-primary-900 dark:text-dark-text">{currentStreak}d</p>
              </div>
              <div>
                <p className="text-[10px] text-primary-400 dark:text-dark-muted">Best day</p>
                <p className="text-sm font-semibold text-primary-900 dark:text-dark-text">{bestDayCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-primary-400 dark:text-dark-muted">Best streak</p>
                <p className="text-sm font-semibold text-primary-900 dark:text-dark-text">{maxStreak}d</p>
              </div>
              <div>
                <p className="text-[10px] text-primary-400 dark:text-dark-muted">All-time</p>
                <p className="text-sm font-semibold text-primary-900 dark:text-dark-text">{allTimeContributions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:h-full lg:flex lg:flex-col lg:justify-center">
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="w-max mx-auto">
              <div className="relative mb-1 h-4 text-[10px] text-primary-400 dark:text-dark-muted">
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
                        return <div key={cell.key} className={`${CELL_SIZE}`} />;
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

              <div className="mt-2 flex items-center justify-end">
                <div className="flex items-center gap-1 text-[9px] text-primary-400 dark:text-dark-muted">
                  <span>Less</span>
                  <div className={`${CELL_SIZE} rounded-sm bg-[var(--heat-0)]`} />
                  <div className={`${CELL_SIZE} rounded-sm bg-[var(--heat-1)]`} />
                  <div className={`${CELL_SIZE} rounded-sm bg-[var(--heat-2)]`} />
                  <div className={`${CELL_SIZE} rounded-sm bg-[var(--heat-3)]`} />
                  <div className={`${CELL_SIZE} rounded-sm bg-[var(--heat-4)]`} />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          {!hasAnyActivity && (
            <p className="mt-2 text-[10px] text-primary-400 dark:text-dark-muted text-center lg:text-left">
              Complete one task to start your activity trail and streak.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
