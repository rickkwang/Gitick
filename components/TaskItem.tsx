import React from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';
import { formatIsoDateForDisplay, todayLocalIsoDate } from '../utils/date';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  selected: boolean;
  onSelect: (task: Task) => void;
}

const TaskItemComponent: React.FC<TaskItemProps> = ({
  task, 
  onToggle, 
  selected,
  onSelect
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
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  // Determine late status (String comparison works for ISO YYYY-MM-DD)
  const isLate = task.dueDate && !task.completed && task.dueDate < todayLocalIsoDate();

  const priorityColor = {
      [Priority.HIGH]: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
      [Priority.MEDIUM]: 'bg-orange-400',
      [Priority.LOW]: 'bg-green-400',
  };

  return (
    <div 
      onClick={() => onSelect(task)}
      className={`
        group relative flex items-start gap-4 p-4 px-5 md:py-5 md:px-6 rounded-lg md:rounded-xl cursor-pointer transition-all duration-200 border active:scale-[0.995]
        ${selected
          ? 'bg-primary-50 dark:bg-dark-surface border-transparent shadow-md dark:shadow-none z-10'
          : 'bg-primary-50 dark:bg-dark-surface border-primary-200/75 dark:border-dark-border/85 hover:bg-primary-50 dark:hover:bg-dark-surface'}
        ${task.completed ? 'opacity-70' : 'opacity-100'}
      `}
    >
      {/* Priority Indicator Dot (Left Edge) - HIGH always visible, others on hover */}
      {!task.completed && (
          <div className={`absolute left-2 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full ${priorityColor[task.priority]} ${task.priority === Priority.HIGH ? 'opacity-40 group-hover:opacity-90' : 'opacity-0 group-hover:opacity-90'} transition-opacity duration-300`} />
      )}

      {/* Custom Checkbox */}
      <div className="shrink-0 mt-0.5 ml-0.5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task);
            }}
            aria-label={task.completed ? 'Mark task as active' : 'Mark task as completed'}
            className={`
              relative w-6 h-6 rounded-full border-[1.5px] transition-all duration-300 flex items-center justify-center overflow-hidden
              ${task.completed 
                 ? 'bg-primary-900 dark:bg-primary-200 border-primary-900 dark:border-primary-200 scale-100'
                 : `border-primary-300 dark:border-dark-muted hover:border-primary-400 dark:hover:border-dark-muted bg-transparent`}
            `}
          >
             {/* Check Icon with Draw Animation */}
             <svg 
               className={`w-3.5 h-3.5 text-white dark:text-primary-900 transition-all duration-300 ${task.completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} 
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
             >
                <polyline points="20 6 9 17 4 12"></polyline>
             </svg>
          </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-4">
            <span className={`text-[15px] md:text-base font-medium transition-all duration-300 break-words leading-6 md:leading-7 ${task.completed ? 'text-primary-400 dark:text-dark-muted line-through decoration-primary-300 dark:decoration-dark-border' : 'text-primary-900 dark:text-dark-text'}`}>
              {task.title}
            </span>
            
            {/* Right side compact meta for Desktop */}
            <div className="hidden md:flex shrink-0 items-center gap-2">
                 {task.priority === Priority.HIGH && !task.completed && (
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">High</span>
                 )}
                 {task.list && task.list !== 'Inbox' && (
                     <span className="text-[9px] font-bold text-primary-400 dark:text-dark-muted uppercase tracking-wider">{task.list}</span>
                 )}
            </div>
        </div>
        
        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-3">
           
           {/* Date Badge - Softer look */}
           {dateDisplay && !task.completed && (
             <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors border ${isLate ? 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'text-primary-500 dark:text-dark-muted bg-primary-200/50 dark:bg-dark-border border-primary-200/70 dark:border-dark-border/80'}`}>
               <Icons.Calendar /> {dateDisplay}
             </span>
           )}

           {/* Tags - Redesigned as Chips */}
           {task.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-[9px] font-mono font-medium text-primary-500 dark:text-dark-muted">
                <Icons.Tag />
                {tag}
              </span>
            ))}

           {/* Subtasks Progress */}
           {totalSubtasks > 0 && (
             <div className="flex items-center gap-2 pl-1" title={`${completedSubtasks}/${totalSubtasks} subtasks`}>
                <div className="w-10 h-1 bg-primary-200/50 dark:bg-dark-border rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary-400 dark:bg-dark-muted rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
             </div>
           )}

           {/* Commit Time */}
           {task.completed && task.completedAt && (
             <span className="flex items-center gap-1 text-primary-400 dark:text-dark-muted font-mono text-[9px]">
               <Icons.GitCommit /> {getTimeAgo(task.completedAt)}
             </span>
           )}
        </div>
      </div>
    </div>
  );
};

export const TaskItem = React.memo(
  TaskItemComponent,
  (prev, next) =>
    prev.task === next.task &&
    prev.selected === next.selected &&
    prev.onToggle === next.onToggle &&
    prev.onSelect === next.onSelect,
);
