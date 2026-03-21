import React from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';
import { formatIsoDateForDisplay, todayLocalIsoDate } from '../utils/date';
import { cn } from '../lib/utils';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  selected: boolean;
  onSelect: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onEditTags?: (task: Task) => void;
}

const TaskItemComponent: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  selected,
  onSelect,
  onDelete,
  onEditTags,
}) => {
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const dateDisplay = formatIsoDateForDisplay(task.dueDate);
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isLate = task.dueDate && !task.completed && task.dueDate < todayLocalIsoDate();

  const priorityColor = {
    [Priority.HIGH]: 'bg-[var(--status-danger-text)] shadow-[0_0_8px_rgba(122,83,68,0.18)]',
    [Priority.MEDIUM]: 'bg-[var(--status-warn-text)]',
    [Priority.LOW]: 'bg-[var(--status-success-text)]',
  };

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'group relative flex items-start gap-4 py-4 px-5 rounded-xl cursor-pointer transition-all duration-200 border active:scale-[0.995]',
        selected
          ? 'bg-primary-50 dark:bg-dark-surface border-transparent shadow-md dark:shadow-none z-10'
          : 'bg-primary-50 dark:bg-dark-surface border-primary-200/75 dark:border-dark-border/85 hover:bg-primary-50 dark:hover:bg-dark-surface',
        task.completed ? 'opacity-70' : 'opacity-100',
      )}
    >
      {/* Priority Indicator Dot (Left Edge) - HIGH always visible, others on hover */}
      {!task.completed && (
        <div
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full transition-opacity duration-300',
            priorityColor[task.priority],
            task.priority === Priority.HIGH
              ? 'opacity-60 group-hover:opacity-90'
              : 'opacity-0 group-hover:opacity-90',
          )}
        />
      )}

      {/* Custom Checkbox with enhanced animation */}
      <div className="shrink-0 mt-0.5 ml-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task);
          }}
          aria-label={task.completed ? 'Mark task as active' : 'Mark task as completed'}
          className={cn(
            'relative w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center overflow-hidden',
            'ease-[cubic-bezier(0.34,1.56,0.64,1)]', // Spring-like bezier
            task.completed
              ? 'bg-primary-900 dark:bg-primary-200 border-primary-900 dark:border-primary-200 scale-100'
              : 'border-primary-300 dark:border-dark-muted hover:border-primary-400 dark:hover:border-dark-muted bg-transparent hover:scale-110',
          )}
        >
          {/* Check Icon with Draw Animation */}
          <svg
            className={cn(
              'w-3.5 h-3.5 text-white dark:text-primary-900 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
              task.completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-4">
          <span
            className={cn(
              'text-sm font-medium transition-all duration-300 break-words leading-6',
              task.completed
                ? 'text-primary-400 dark:text-dark-muted line-through decoration-primary-300 dark:decoration-dark-border'
                : 'text-primary-900 dark:text-dark-text',
            )}
          >
            {task.title}
          </span>

          {/* Right side compact meta for Desktop */}
          <div className="flex shrink-0 items-center gap-2">
            {task.priority === Priority.HIGH && !task.completed && (
              <span className="text-[10px] font-bold text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                High
              </span>
            )}
            {task.list && task.list !== 'Inbox' && (
              <span className="text-[10px] font-bold text-primary-400 dark:text-dark-muted uppercase tracking-wider">
                {task.list}
              </span>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
          {/* Date Badge - Enhanced with hover effect */}
          {dateDisplay && !task.completed && (
            <span
              className={cn(
                'flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all duration-200 cursor-default',
                isLate
                  ? 'text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] border-[var(--status-danger-border)] hover:brightness-95'
                  : 'text-primary-500 dark:text-dark-muted bg-primary-200/50 dark:bg-dark-border border-primary-200/70 dark:border-dark-border/80 hover:bg-primary-200 hover:border-primary-300 dark:hover:bg-dark-border/80 dark:hover:border-dark-border',
              )}
            >
              <Icons.Calendar /> {dateDisplay}
            </span>
          )}

          {/* Tags - Redesigned as Chips */}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-[10px] font-mono font-medium text-primary-500 dark:text-dark-muted"
            >
              <Icons.Tag />
              {tag}
            </span>
          ))}

          {/* Subtasks Progress */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-2 pl-1" title={`${completedSubtasks}/${totalSubtasks} subtasks`}>
              <div className="w-10 h-1 bg-primary-200/50 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-400 dark:bg-dark-muted rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Commit Time */}
          {task.completed && task.completedAt && (
            <span className="flex items-center gap-1 text-primary-400 dark:text-dark-muted font-mono text-[10px]">
              <Icons.GitCommit /> {getTimeAgo(task.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Hover Action Buttons */}
      {!task.completed && (onDelete || onEditTags) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          {onEditTags && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTags(task);
              }}
              aria-label="Edit tags"
              className="p-1.5 rounded-lg text-primary-400 hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-100 dark:hover:bg-dark-border transition-colors"
              title="Edit Tags"
            >
              <Icons.Tag />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              aria-label="Delete task"
              className="p-1.5 rounded-lg text-primary-400 hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] transition-colors"
              title="Delete Task"
            >
              <Icons.Trash />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const TaskItem = React.memo(TaskItemComponent, (prev, next) =>
  prev.task === next.task &&
  prev.selected === next.selected,
);
