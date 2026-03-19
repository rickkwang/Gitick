import React, { useEffect, useRef, useState } from 'react';
import { FilterType, UserProfile } from '../types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from '../constants';

interface SidebarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  taskCounts: Record<string, number>;
  onOpenSettings: () => void;
  isFocusActive: boolean;
  focusTimeLeft: number;
  projects: string[];
  onAddProject: (name: string) => void;
  onDeleteProject: (name: string) => void;
  userProfile: UserProfile;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isDesktopMac: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPriority: 'all' | 'high' | 'medium' | 'low';
  onSearchPriorityChange: (value: 'all' | 'high' | 'medium' | 'low') => void;
  searchProject: 'all' | string;
  onSearchProjectChange: (value: 'all' | string) => void;
}

type IconComponent = React.ComponentType;

interface NavItemProps {
  id: string;
  label: string;
  icon: IconComponent;
  canDelete?: boolean;
  activeFilter: FilterType;
  onFilterChange: (id: string) => void;
  onCloseMobile: () => void;
  taskCount: number;
  isFocusItem?: boolean;
  isFocusActive?: boolean;
  focusTimeLeft?: number;
  onDeleteProject?: (id: string) => void;
}

const NavItemComponent: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  canDelete,
  activeFilter,
  onFilterChange,
  onCloseMobile,
  taskCount,
  isFocusItem,
  isFocusActive,
  focusTimeLeft,
  onDeleteProject,
}) => {
  const isActive = activeFilter === id;

  const formatTimeMini = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative group px-[8px] md:px-0">
      <button
        type="button"
        onClick={() => {
          onFilterChange(id);
          onCloseMobile();
        }}
        className={`
          relative flex items-center text-sm font-medium rounded-xl outline-none select-none
          transition-colors duration-200 h-[40px] px-0 w-full justify-start
          ${
            isActive
              ? 'bg-primary-200/50 dark:bg-dark-border/60 text-primary-900 dark:text-dark-text font-bold border border-transparent'
              : 'text-primary-900 dark:text-dark-text border border-transparent hover:bg-primary-100 dark:hover:bg-dark-border/50 hover:border-primary-200/80 dark:hover:border-dark-border'
          }
        `}
      >
        <span className="shrink-0 flex items-center justify-center transition-colors duration-200 w-[44px] h-[40px] md:absolute md:top-0 md:left-0">
          <span
            className={`
              flex items-center justify-center transition-colors duration-200 w-[20px] h-[20px]
              ${isActive ? 'text-primary-900 dark:text-dark-text' : 'text-primary-900 dark:text-dark-text group-hover:text-primary-900 dark:group-hover:text-dark-text'}
            `}
          >
            <Icon />
          </span>
        </span>

        <div className="flex items-center flex-1 min-w-0 overflow-hidden whitespace-nowrap pl-1 md:pl-[52px]">
          <span className="truncate pr-2">{label}</span>

          <div className="ml-auto pr-3 pl-1">
            {!isFocusItem && taskCount > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-primary-50 dark:bg-dark-bg text-primary-900 dark:text-dark-text' : 'bg-primary-200 dark:bg-dark-border text-primary-900 dark:text-dark-text'}`}>
                {taskCount}
              </span>
            )}

            {isFocusItem && isFocusActive && focusTimeLeft !== undefined && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-danger-border)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-danger-text)]" />
                </span>
                <span className="text-[10px] font-mono font-bold text-[var(--status-danger-text)]">{formatTimeMini(focusTimeLeft)}</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {canDelete && onDeleteProject && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteProject(id);
          }}
          aria-label={`Delete project ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-primary-400 hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          title="Delete Project"
        >
          <Icons.Trash />
        </button>
      )}
    </div>
  );
};

const navItemPropsEqual = (prev: NavItemProps, next: NavItemProps) => {
  return (
    prev.id === next.id &&
    prev.label === next.label &&
    prev.icon === next.icon &&
    prev.canDelete === next.canDelete &&
    prev.activeFilter === next.activeFilter &&
    prev.taskCount === next.taskCount &&
    prev.isFocusItem === next.isFocusItem &&
    prev.isFocusActive === next.isFocusActive &&
    prev.focusTimeLeft === next.focusTimeLeft
  );
};

const NavItem = React.memo(NavItemComponent, navItemPropsEqual);

export const Sidebar: React.FC<SidebarProps> = ({
  activeFilter,
  onFilterChange,
  isOpen,
  onCloseMobile,
  taskCounts,
  onOpenSettings,
  isFocusActive,
  focusTimeLeft,
  projects,
  onAddProject,
  onDeleteProject,
  userProfile,
  isCollapsed,
  toggleCollapse,
  isDesktopMac,
  searchQuery,
  onSearchQueryChange,
  searchPriority,
  onSearchPriorityChange,
  searchProject,
  onSearchProjectChange,
}) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<'none' | 'search' | 'category'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  const renderCollapsed = isCollapsed && !isOpen;

  useEffect(() => {
    if (isAddingProject) {
      inputRef.current?.focus();
    }
  }, [isAddingProject]);

  useEffect(() => {
    if (renderCollapsed) {
      setActiveUtilityPanel('none');
      setIsAddingProject(false);
    }
  }, [renderCollapsed]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName('');
      setIsAddingProject(false);
    }
  };

  const toggleUtilityPanel = (panel: 'search' | 'category') => {
    setActiveUtilityPanel((prev) => (prev === panel ? 'none' : panel));
  };

  const getProjectIcon = (name: string) => {
    switch (name) {
      case 'Work':
        return Icons.Briefcase;
      case 'Study':
        return Icons.Book;
      case 'Travel':
        return Icons.Plane;
      case 'Life':
        return Icons.Coffee;
      default:
        return Icons.Folder;
    }
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-[60] ${activeFilter === 'focus' ? 'bg-transparent' : 'bg-[var(--app-bg)]'} flex flex-col
    w-[268px] transform-gpu will-change-transform
    transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
    ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.15)]' : '-translate-x-full'}
    md:translate-x-0 md:shadow-none md:relative md:z-30
    md:transition-[width,opacity,transform] md:duration-300 md:ease-[cubic-bezier(0.2,0,0,1)]
    ${renderCollapsed ? 'md:w-0 md:opacity-0 md:-translate-x-2 md:pointer-events-none' : 'md:w-[268px] md:opacity-100 md:translate-x-0'}
  `;

  return (
    <>
      <div
        className={`
          fixed inset-0 bg-primary-900/30 dark:bg-primary-950/60 z-50 md:hidden
          transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full w-full p-2 md:p-2.5 pt-safe md:pt-2.5">
          <div className="relative flex flex-col h-full overflow-hidden rounded-[calc(var(--app-radius)+4px)] border border-primary-200/60 dark:border-dark-border/70 bg-primary-100 dark:bg-dark-surface shadow-[0_4px_20px_rgba(20,20,19,0.12),0_1px_4px_rgba(20,20,19,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_1px_4px_rgba(0,0,0,0.2)]">
            <div className="h-[72px] md:h-[98px] relative shrink-0 select-none w-full">
              <div className="md:hidden absolute inset-0 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6 text-primary-900 dark:text-dark-text">
                    <Icons.GitickLogo />
                  </span>
                  <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap font-display brand-text">Gitick</span>
                </div>
                <button
                  onClick={onCloseMobile}
                  aria-label="Close sidebar"
                  className="flex items-center justify-center p-2 -mr-2 rounded-lg text-primary-400 hover:text-primary-900 dark:hover:text-dark-text transition-colors active:scale-95 transform"
                  title="Close Sidebar"
                >
                  <Icons.SidebarLeft />
                </button>
              </div>

              <div className={`hidden md:flex absolute top-3 items-center gap-2 ${isDesktopMac ? 'left-[88px]' : 'left-4'}`}>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  className="w-8 h-8 rounded-md transition-colors flex items-center justify-center text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-200/35 dark:hover:bg-dark-border/45"
                  title="Collapse Sidebar"
                >
                  <Icons.SidebarLeft />
                </button>

                <button
                  type="button"
                  onClick={() => toggleUtilityPanel('search')}
                  aria-label="Search tasks"
                  className={`w-8 h-8 rounded-md transition-colors flex items-center justify-center ${
                    activeUtilityPanel === 'search'
                      ? 'text-primary-900 dark:text-dark-text bg-primary-200/55 dark:bg-dark-border/55'
                      : 'text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-200/35 dark:hover:bg-dark-border/45'
                  }`}
                  title="Search"
                >
                  <Icons.Search />
                </button>

                <button
                  type="button"
                  onClick={() => toggleUtilityPanel('category')}
                  aria-label="Filter by category"
                  className={`w-8 h-8 rounded-md transition-colors flex items-center justify-center ${
                    activeUtilityPanel === 'category'
                      ? 'text-primary-900 dark:text-dark-text bg-primary-200/55 dark:bg-dark-border/55'
                      : 'text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-200/35 dark:hover:bg-dark-border/45'
                  }`}
                  title="Category"
                >
                  <Icons.Tag />
                </button>
              </div>

              <div className="hidden md:flex absolute left-4 right-4 bottom-3 items-center gap-3 transition-all duration-220">
                <span className="shrink-0 w-9 h-9 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 text-primary-900 dark:text-dark-text">
                  <Icons.GitickLogo />
                </span>
                <span className="text-base leading-none font-semibold tracking-tight whitespace-nowrap font-display brand-text">Gitick</span>
              </div>
            </div>

            <div className="hidden md:block px-2.5 pb-2 transition-all duration-200">
              <div
                className={`rounded-2xl border border-primary-200/80 dark:border-dark-border/80 bg-primary-50/85 dark:bg-dark-bg/80 shadow-sm overflow-hidden transition-all duration-200 ${
                  activeUtilityPanel === 'none' ? 'max-h-0 opacity-0 p-0 border-transparent' : 'max-h-52 opacity-100 p-3'
                }`}
              >
                {activeUtilityPanel === 'search' && (
                  <div className="flex items-center gap-2 rounded-xl border border-primary-200/90 dark:border-dark-border/80 bg-primary-100/70 dark:bg-dark-surface px-3 py-2">
                    <span className="text-primary-400 dark:text-dark-muted">
                      <Icons.Search />
                    </span>
                    <input
                      value={searchQuery}
                      onChange={(event) => onSearchQueryChange(event.target.value)}
                      placeholder="Search title, tag, project..."
                      className="w-full bg-transparent outline-none text-xs text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted"
                    />
                  </div>
                )}

                {activeUtilityPanel === 'category' && (
                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-xl border border-primary-200/90 dark:border-dark-border/80 bg-primary-100/70 dark:bg-dark-surface px-3 py-2">
                      <select
                        value={searchPriority}
                        onChange={(event) => onSearchPriorityChange(event.target.value as 'all' | 'high' | 'medium' | 'low')}
                        className="w-full bg-transparent text-xs text-primary-700 dark:text-dark-text outline-none"
                      >
                        <option value="all">Any Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-primary-200/90 dark:border-dark-border/80 bg-primary-100/70 dark:bg-dark-surface px-3 py-2">
                      <select
                        value={searchProject}
                        onChange={(event) => onSearchProjectChange(event.target.value as 'all' | string)}
                        className="w-full bg-transparent text-xs text-primary-700 dark:text-dark-text outline-none"
                      >
                        <option value="all">Any Project</option>
                        <option value="Inbox">Inbox</option>
                        {projects.map((project) => (
                          <option key={project} value={project}>
                            {project}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col transition-all duration-220">
              <div className="flex-1 overflow-y-auto no-scrollbar py-2.5 space-y-5 px-2.5">
                <div>
                  <div className="overflow-hidden px-2.5 h-5 mb-1.5 flex items-center">
                    <h3 className="text-[10px] font-bold text-primary-900 dark:text-dark-text uppercase tracking-widest whitespace-nowrap pl-1">Overview</h3>
                  </div>
                  <nav className="space-y-0.5">
                    <NavItem id="next7days" label="Dashboard" icon={Icons.Dashboard} activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['next7days']} />
                    <NavItem id="inbox" label="Inbox" icon={Icons.Inbox} activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['inbox']} />
                    <NavItem id="today" label="Today" icon={Icons.Calendar} activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['today']} />
                    <NavItem
                      id="focus"
                      label="Focus Mode"
                      icon={Icons.Clock}
                      activeFilter={activeFilter}
                      onFilterChange={onFilterChange}
                      onCloseMobile={onCloseMobile}
                      taskCount={0}
                      isFocusItem={true}
                      isFocusActive={isFocusActive}
                      focusTimeLeft={focusTimeLeft}
                    />
                  </nav>
                </div>

                <div>
                  <div className="flex items-center justify-between px-2.5 group overflow-hidden whitespace-nowrap h-5 mb-1.5">
                    <h3 className="text-[10px] font-bold text-primary-900 dark:text-dark-text uppercase tracking-widest pl-1">Projects</h3>
                    <button
                      onClick={() => setIsAddingProject(true)}
                      aria-label="Add project"
                      className="text-primary-900 dark:text-dark-text transition-colors p-1 rounded-full hover:bg-primary-200/50 dark:hover:bg-dark-border"
                      title="Add Project"
                    >
                      <Icons.Plus />
                    </button>
                  </div>

                  <nav className="space-y-0.5">
                    {projects.map((project) => (
                      <NavItem
                        key={project}
                        id={project}
                        label={project}
                        icon={getProjectIcon(project)}
                        canDelete={!DEFAULT_PROJECTS.includes(project)}
                        onDeleteProject={onDeleteProject}
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        onCloseMobile={onCloseMobile}
                        taskCount={taskCounts[project] || 0}
                      />
                    ))}

                    {isAddingProject && (
                      <form onSubmit={handleCreateProject} className="px-1 py-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-primary-100 dark:bg-dark-bg rounded-lg border border-primary-200 dark:border-dark-border focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all shadow-sm">
                          <span className="text-primary-900 dark:text-dark-text">
                            <Icons.Folder />
                          </span>
                          <input
                            ref={inputRef}
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-primary-900 dark:text-dark-text placeholder:text-primary-400 min-w-0"
                            placeholder="Name..."
                            onBlur={() => !newProjectName && setIsAddingProject(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setIsAddingProject(false);
                            }}
                          />
                        </div>
                      </form>
                    )}
                  </nav>
                </div>

                <div>
                  <div className="overflow-hidden px-3 h-6 mb-2 flex items-center">
                    <h3 className="text-[10px] font-bold text-primary-900 dark:text-dark-text uppercase tracking-widest whitespace-nowrap pl-1">History</h3>
                  </div>
                  <nav className="space-y-0.5">
                    <NavItem id="completed" label="Repository" icon={Icons.CheckCircle} activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={0} />
                  </nav>
                </div>
              </div>

              <div className="mt-auto px-2.5 pb-safe md:pb-3 pt-1.5 shrink-0">
                <div className="mx-2 mb-1.5 h-px bg-primary-200/80 dark:bg-dark-border/80" />

                <div className="px-1.5">
                  <button
                    onClick={onOpenSettings}
                    className="group flex items-center w-full rounded-xl transition-colors duration-200 outline-none h-10 px-0 hover:bg-primary-200/50 dark:hover:bg-dark-border"
                    title="Settings & Profile"
                  >
                    <div className="shrink-0 flex items-center justify-center transition-colors duration-200 w-11 h-full">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10 dark:ring-black/10 overflow-hidden ${userProfile.avatarColor}`}>
                        {userProfile.avatarImage ? (
                          <img src={userProfile.avatarImage} alt="User avatar" className="w-full h-full object-cover" />
                        ) : (
                          userProfile.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-1 min-w-0 overflow-hidden pr-2.5 pl-1">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-sm font-bold text-primary-900 dark:text-dark-text truncate max-w-[120px]">{userProfile.name}</span>
                        <span className="text-[10px] text-primary-900 dark:text-dark-text font-medium">Settings</span>
                      </div>

                      <span className="text-primary-900 dark:text-dark-text transition-colors">
                        <Icons.Settings />
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
