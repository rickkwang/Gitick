import React, { useMemo } from 'react';
import { Task, UserProfile } from '../types';
import { Icons } from '../constants';

interface GitGraphProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  userProfile?: UserProfile;
}

export const GitGraph: React.FC<GitGraphProps> = ({ tasks, onDelete, userProfile }) => {
  // Sort by completedAt descending (newest commits at top)
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [tasks],
  );

  // MONOCHROME LOGIC: Use shades of gray/zinc to distinguish branches
  const getBranchStyles = (list?: string) => {
    switch (list) {
      case 'Work': return { border: 'border-primary-900 dark:border-primary-200', line: '#18181b', darkLine: '#f4f4f5' }; // Darkest/Lightest (High Contrast)
      case 'Study': return { border: 'border-primary-600 dark:border-primary-400', line: '#52525b', darkLine: '#a1a1aa' }; // Mid Gray
      case 'Travel': return { border: 'border-primary-400 dark:border-primary-600', line: '#a1a1aa', darkLine: '#52525b' }; // Light Gray
      case 'Life': return { border: 'border-primary-300 dark:border-primary-700', line: '#d4d4d8', darkLine: '#3f3f46' }; // Very Light Gray
      default: return { border: 'border-gray-400', line: '#9ca3af', darkLine: '#9ca3af' }; // Inbox
    }
  };

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-primary-400 dark:text-dark-muted">
        <Icons.GitBranch />
        <p className="mt-4 text-sm font-mono">No commits found in repository.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      <div className="relative pl-4 md:pl-0">
        {sortedTasks.map((task, index) => {
          const isLast = index === sortedTasks.length - 1;
          const styles = getBranchStyles(task.list);
          
          // Generate a pseudo-hash
          const hash = task.id.substring(0, 7);
          const date = task.completedAt ? new Date(task.completedAt) : new Date();
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div key={task.id} className="flex gap-4 group">
              {/* Graph Rail */}
              <div className="flex flex-col items-center w-12 shrink-0 relative">
                {/* Vertical Line - Main Trunk */}
                {!isLast && (
                  <div 
                    className="absolute top-8 bottom-0 w-px bg-primary-200 dark:bg-dark-border" 
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                  />
                )}
                
                {/* Branch Connector */}
                <div 
                  className="h-8 w-px absolute top-0 bg-primary-200 dark:bg-dark-border" 
                  style={{ display: index === 0 ? 'none' : 'block' }}
                />

                {/* Node */}
                <div className={`relative z-10 w-8 h-8 rounded-full bg-primary-50 dark:bg-dark-surface border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${styles.border} text-primary-700 dark:text-dark-text`}>
                  <div className="w-4 h-4 rounded-full overflow-hidden">
                     {/* Avatar / Icon placeholder */}
                     <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                  </div>
                </div>
              </div>

              {/* Commit Content */}
              <div className="pb-8 pt-1 flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                   {/* Branch Label - Monochrome */}
                   <div className={`px-2 py-0.5 rounded text-[10px] font-mono border bg-transparent flex items-center gap-1 w-fit transition-colors group-hover:bg-primary-200/50 dark:group-hover:bg-dark-border ${styles.border} text-primary-600 dark:text-dark-muted`}>
                      <Icons.GitBranch />
                      {task.list || 'main'}
                   </div>
                   {/* Hash */}
                   <span className="font-mono text-xs text-primary-400 hover:text-primary-800 dark:hover:text-dark-text cursor-pointer underline decoration-transparent hover:decoration-current transition-all">
                     {hash}
                   </span>
                </div>

                {/* Message */}
                <div className="text-sm font-medium text-primary-900 dark:text-dark-text truncate group-hover:text-primary-900 dark:group-hover:text-dark-text transition-colors cursor-pointer">
                  {task.title}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between gap-4 mt-1 text-xs text-primary-400 dark:text-dark-muted">
                  <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <div className={`w-4 h-4 rounded-full overflow-hidden ${userProfile?.avatarImage ? '' : (userProfile?.avatarColor || 'bg-primary-200 dark:bg-dark-border')} flex items-center justify-center`}>
                        {userProfile?.avatarImage ? (
                          <img src={userProfile.avatarImage} alt="" className="w-full h-full object-cover" />
                        ) : userProfile?.name ? (
                          <span className="text-[10px] font-bold text-white">{userProfile.name.charAt(0).toUpperCase()}</span>
                        ) : null}
                      </div>
                      <span className="font-medium">{userProfile?.name || 'Gitick User'}</span>
                   </div>
                   <span>committed on {dateStr} at {timeStr}</span>
                  </div>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md border border-primary-200 dark:border-dark-border text-primary-500 hover:text-[var(--status-danger-text)] hover:border-[var(--status-danger-border)]"
                    title="Delete committed todo"
                    aria-label="Delete committed todo"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Initial Commit Node at bottom */}
        {sortedTasks.length > 0 && (
          <div className="flex gap-4 opacity-30">
             <div className="flex flex-col items-center w-12 shrink-0 relative">
               <div className="h-4 w-px bg-primary-300 dark:bg-primary-700 absolute top-0"></div>
               <div className="relative z-10 w-4 h-4 rounded-full border border-primary-400 dark:border-dark-muted bg-primary-50 dark:bg-dark-bg mt-4"></div>
             </div>
             <div className="pt-4 text-xs font-mono text-primary-500">
                Initial commit
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
