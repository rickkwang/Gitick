import React from 'react';
import { Icons } from '../constants';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPriority: 'all' | 'high' | 'medium' | 'low';
  onPriorityChange: (priority: 'all' | 'high' | 'medium' | 'low') => void;
  searchProject: 'all' | string;
  onProjectChange: (project: 'all' | string) => void;
  projects: string[];
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPriority,
  onPriorityChange,
  searchProject,
  onProjectChange,
  projects,
}) => {
  return (
    <div className="mb-5">
      <div className="w-full max-w-[1200px] mx-auto py-1">
        <div className="flex items-center justify-between gap-4">
          <div className="w-full max-w-[220px] md:max-w-[260px] lg:max-w-[300px]">
            <div className="h-9 flex items-center gap-2 rounded-lg px-3 bg-primary-50 dark:bg-dark-bg/40 border border-primary-200/70 dark:border-dark-border/70">
              <span className="text-primary-400 dark:text-dark-muted shrink-0 flex items-center justify-center w-4 h-4">
                <Icons.Search />
              </span>
              <input
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search"
                className="w-full bg-transparent outline-none text-xs font-medium text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-9 rounded-lg border border-primary-200/70 dark:border-dark-border/70 bg-primary-50 dark:bg-dark-bg/40 px-2.5">
              <select
                value={searchPriority}
                onChange={(event) => onPriorityChange(event.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="h-full bg-transparent text-[11px] font-semibold text-primary-700 dark:text-dark-text outline-none"
              >
                <option value="all">Priority: All</option>
                <option value="high">Priority: High</option>
                <option value="medium">Priority: Medium</option>
                <option value="low">Priority: Low</option>
              </select>
            </div>

            <div className="h-9 rounded-lg border border-primary-200/70 dark:border-dark-border/70 bg-primary-50 dark:bg-dark-bg/40 px-2.5">
              <select
                value={searchProject}
                onChange={(event) => onProjectChange(event.target.value as 'all' | string)}
                className="h-full bg-transparent text-[11px] font-semibold text-primary-700 dark:text-dark-text outline-none"
              >
                <option value="all">Project: All</option>
                <option value="Inbox">Project: Inbox</option>
                {projects.map((project) => (
                  <option key={project} value={project}>
                    Project: {project}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
