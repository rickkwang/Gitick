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

    // 使用基于比例的连续映射，避免离散阈值导致的颜色跳变
    const ratio = count / Math.max(1, intensityCeiling);
    if (ratio <= 0.15) return 'bg-[var(--heat-1)]';
    if (ratio <= 0.35) return 'bg-[var(--heat-2)]';
    if (ratio <= 0.65) return 'bg-[var(--heat-3)]';
    return 'bg-[var(--heat-4)]';
  };

  const CELL_SIZE = 'w-[11px] h-[11px]';
  const GAP = 'gap-[3px]';
  const COL_WIDTH = CELL_PX + CELL_GAP_PX + 1;
  const todayKey = toLocalIsoDate(new Date());
  const hasAnyActivity = allTimeContributions > 0;

  const renderTrend = (stats: PeriodStats) => {
    if (stats.percent === null) {
      return <span className="text-xs text-primary-400 dark:text-dark-muted">→0%</span>;
    }

    const direction = stats.delta > 0 ? '↑' : stats.delta < 0 ? '↓' : '→';
    const trendClass =
      stats.delta > 0
        ? 'text-[var(--status-success-text)]'
        : stats.delta < 0
          ? 'text-[var(--status-danger-text)]'
          : 'text-primary-400 dark:text-dark-muted';

    return (
      <span className={`text-xs font-medium ${trendClass}`}>
        {direction}{Math.abs(Math.round(stats.percent))}%
      </span>
    );
  };

  const MetricItem = ({
    label,
    value,
    trend,
    trendLabel,
  }: {
    label: string;
    value: string | number;
    trend?: PeriodStats;
    trendLabel?: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-primary-500 dark:text-dark-muted font-medium">{label}</span>
      <span className="text-xl leading-none font-semibold text-primary-900 dark:text-dark-text">{value}</span>
      {trend && (
        <span className="text-xs leading-none" title={trendLabel ? `${trendLabel}: ${trend.current} vs ${trend.previous}` : undefined}>
          {renderTrend(trend)}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full overflow-hidden">
      {/* Main Number Section */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-4xl font-semibold text-primary-900 dark:text-dark-text">{visibleContributions}</span>
        <span className="text-sm text-primary-500 dark:text-dark-muted">tasks completed in the last 6 months</span>
      </div>

      {/* Heatmap */}
      <div className="w-full overflow-x-auto no-scrollbar pb-2">
        <div className="w-max mx-auto">
          <div className="relative mb-2 h-4 text-xs text-primary-400 dark:text-dark-muted">
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
            <div className="flex items-center gap-1.5 text-xs text-primary-400 dark:text-dark-muted/90">
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

      {/* Metrics Strip */}
      <div className="mt-4 pt-3 border-t border-primary-200/70 dark:border-dark-border/70">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          <MetricItem label="Last 7d" value={last7Stats.current} trend={last7Stats} trendLabel="vs previous week" />
          <MetricItem label="Last 30d" value={last30Stats.current} trend={last30Stats} trendLabel="vs previous month" />
          <MetricItem label="Current streak" value={`${currentStreak}d`} />
          <MetricItem label="Best streak" value={`${maxStreak}d`} />
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-primary-500 dark:text-dark-muted">
        <span>All-time: <span className="font-semibold text-primary-700 dark:text-dark-text">{allTimeContributions}</span></span>
        <span className="text-primary-200 dark:text-dark-border">·</span>
        <span>Best day: <span className="font-semibold text-primary-700 dark:text-dark-text">{bestDayCount}</span> tasks</span>
      </div>

      {!hasAnyActivity && (
        <p className="mt-4 text-sm text-primary-400 dark:text-dark-muted text-center">
          Complete a task to start building your activity trail.
        </p>
      )}
    </div>
  );
};
