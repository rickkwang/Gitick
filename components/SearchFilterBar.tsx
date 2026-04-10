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
        <div className="inline-flex items-center h-9 rounded-full border border-primary-200/80 dark:border-dark-border/70 bg-primary-50 dark:bg-dark-surface/80 overflow-hidden shadow-sm">

          {/* Search */}
          <div className="flex items-center gap-1.5 pl-3 pr-2">
            <span className="text-primary-400 dark:text-dark-muted shrink-0 flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">
              <Icons.Search />
            </span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
              className="w-32 bg-transparent outline-none text-xs font-medium text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted"
            />
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-primary-200/70 dark:bg-dark-border/50 shrink-0" />

          {/* Priority */}
          <div className="flex items-center gap-1 px-3">
            <span className="text-primary-400 dark:text-dark-muted shrink-0 flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">
              <Icons.Flag />
            </span>
            <select
              value={searchPriority}
              onChange={(event) => onPriorityChange(event.target.value as 'all' | 'high' | 'medium' | 'low')}
              className="bg-transparent text-[11px] font-semibold text-primary-700 dark:text-dark-text outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-primary-200/70 dark:bg-dark-border/50 shrink-0" />

          {/* Project */}
          <div className="flex items-center gap-1 pl-3 pr-3">
            <span className="text-primary-400 dark:text-dark-muted shrink-0 flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">
              <Icons.Folder />
            </span>
            <select
              value={searchProject}
              onChange={(event) => onProjectChange(event.target.value as 'all' | string)}
              className="bg-transparent text-[11px] font-semibold text-primary-700 dark:text-dark-text outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="Inbox">Inbox</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </div>
  );
};
