import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
}

interface NavItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeFilter: FilterType;
  onFilterChange: (id: string) => void;
  onCloseMobile: () => void;
  taskCount: number;
  isFocusItem?: boolean;
  isFocusActive?: boolean;
  focusTimeLeft?: number;
  canDelete?: boolean;
  onDeleteProject?: (id: string) => void;
  isCollapsed: boolean;
}

const formatTimeMini = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const NavItem: React.FC<NavItemProps> = ({
  id,
  label,
  icon,
  activeFilter,
  onFilterChange,
  onCloseMobile,
  taskCount,
  isFocusItem,
  isFocusActive,
  focusTimeLeft,
  canDelete,
  onDeleteProject,
  isCollapsed,
}) => {
  const isActive = activeFilter === id;

  return (
    <div className={`relative group ${isCollapsed ? 'px-0 flex justify-center' : 'px-1.5'}`}>
      <button
        type="button"
        title={isCollapsed ? label : undefined}
        onClick={() => {
          onFilterChange(id);
          onCloseMobile();
        }}
        className={`
          flex items-center outline-none select-none transition-all duration-200
          ${isCollapsed ? 'w-11 h-11 justify-center rounded-xl' : 'w-full h-10 rounded-xl px-2.5'}
          ${
            isActive
              ? 'bg-white/72 dark:bg-zinc-800/78 border border-white/90 dark:border-zinc-700 text-gray-900 dark:text-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
              : 'bg-transparent border border-transparent text-gray-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/45 hover:text-gray-900 dark:hover:text-zinc-200'
          }
        `}
      >
        <span className={`shrink-0 flex items-center justify-center ${isCollapsed ? 'w-9 h-9' : 'w-8 h-8'}`}>
          <span
            className={`
              flex items-center justify-center transition-colors duration-200
              ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-500'}
            `}
          >
            {icon}
          </span>
        </span>

        <div
          className={`
            flex items-center flex-1 min-w-0 overflow-hidden
            ${isCollapsed ? 'md:hidden' : 'md:flex'}
          `}
        >
          <span className="truncate text-[13px] font-medium">{label}</span>
          <div className="ml-auto flex items-center gap-2 pr-1">
            {!isFocusItem && taskCount > 0 && (
              <span
                className={`
                  text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                  ${
                    isActive
                      ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-gray-200/85 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300'
                  }
                `}
              >
                {taskCount}
              </span>
            )}
            {isFocusItem && isFocusActive && focusTimeLeft !== undefined && (
              <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-300">
                {formatTimeMini(focusTimeLeft)}
              </span>
            )}
          </div>
        </div>
      </button>

      {!isFocusItem && taskCount > 0 && isCollapsed && (
        <span className="hidden md:block absolute top-2.5 left-1/2 translate-x-[8px] w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-zinc-100 pointer-events-none" />
      )}

      {canDelete && onDeleteProject && !isCollapsed && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteProject(id);
          }}
          aria-label={`Delete project ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete project"
        >
          <Icons.Trash />
        </button>
      )}
    </div>
  );
};

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
}) => {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const renderCollapsed = isCollapsed && !isOpen;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (isAddingProject) {
      inputRef.current?.focus();
    }
  }, [isAddingProject]);

  const handleCreateProject = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onAddProject(trimmed);
    setNewProjectName('');
    setIsAddingProject(false);
  };

  const startAddProject = () => {
    if (renderCollapsed) {
      toggleCollapse();
    }
    setIsAddingProject(true);
  };

  const getProjectIcon = (name: string) => {
    switch (name) {
      case 'Work':
        return <Icons.Briefcase />;
      case 'Study':
        return <Icons.Book />;
      case 'Travel':
        return <Icons.Plane />;
      case 'Life':
        return <Icons.Coffee />;
      default:
        return <Icons.Folder />;
    }
  };

  const matchesSearch = useCallback(
    (label: string) => (normalizedSearch.length === 0 ? true : label.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch],
  );

  const overviewItems = useMemo(
    () => [
      { id: 'next7days', label: 'Dashboard', icon: <Icons.Dashboard />, taskCount: taskCounts.next7days || 0 },
      { id: 'inbox', label: 'Inbox', icon: <Icons.Inbox />, taskCount: taskCounts.inbox || 0 },
      { id: 'today', label: 'Today', icon: <Icons.Calendar />, taskCount: taskCounts.today || 0 },
      { id: 'focus', label: 'Focus Mode', icon: <Icons.Clock />, taskCount: 0, isFocusItem: true },
    ],
    [taskCounts.inbox, taskCounts.next7days, taskCounts.today],
  );

  const filteredOverviewItems = overviewItems.filter((item) => matchesSearch(item.label));
  const filteredProjects = projects.filter((project) => matchesSearch(project));
  const showHistory = matchesSearch('Repository');

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-[60] flex flex-col border-r
    bg-[#e9edf2]/95 dark:bg-zinc-950/92 backdrop-blur-2xl
    border-white/55 dark:border-zinc-800/80

    w-[288px] transform-gpu will-change-transform
    transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
    ${isOpen ? 'translate-x-0 shadow-[28px_0_40px_-20px_rgba(15,23,42,0.28)]' : '-translate-x-full'}

    md:translate-x-0 md:shadow-none md:relative md:z-30
    md:transition-all md:duration-300 md:ease-[cubic-bezier(0.2,0,0,1)]
    ${renderCollapsed ? 'md:w-[86px]' : 'md:w-[294px]'}
  `;

  return (
    <>
      <div
        className={`
          fixed inset-0 bg-black/24 dark:bg-black/60 z-50 md:hidden backdrop-blur-[2px]
          transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={sidebarClasses}>
        <div className={`flex flex-col h-full overflow-hidden w-full pt-safe md:pt-0 ${isDesktopMac ? 'pt-5 md:pt-5' : ''}`}>
          <div className="shrink-0 px-3 md:px-4 pt-2 md:pt-3 pb-3 border-b border-white/55 dark:border-zinc-800/70">
            <div className="md:hidden h-11 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <Icons.GitickLogo />
                <span className="text-sm font-semibold tracking-tight">Gitick</span>
              </div>
              <button
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60"
              >
                <Icons.X />
              </button>
            </div>

            <div className={`${renderCollapsed ? 'hidden' : 'hidden md:flex'} h-10 items-center justify-between px-2`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  className="w-8 h-8 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-white/65 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  title="Collapse sidebar"
                >
                  <Icons.SidebarLeft />
                </button>
                <button
                  onClick={startAddProject}
                  aria-label="New project"
                  className="w-8 h-8 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-white/65 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  title="New project"
                >
                  <Icons.Plus />
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <Icons.GitickLogo />
                <span className="text-sm font-semibold tracking-tight">Gitick</span>
              </div>
            </div>

            <div className={`${renderCollapsed ? 'hidden md:flex' : 'hidden'} h-10 items-center justify-center`}>
              <button
                onClick={toggleCollapse}
                aria-label="Expand sidebar"
                className="group w-10 h-10 rounded-xl text-gray-700 dark:text-zinc-200 hover:bg-white/65 dark:hover:bg-zinc-800/60 transition-colors"
                title="Expand sidebar"
              >
                <span className="inline-flex group-hover:hidden">
                  <Icons.GitickLogo />
                </span>
                <span className="hidden group-hover:inline-flex">
                  <Icons.SidebarRight />
                </span>
              </button>
            </div>

            {!renderCollapsed && (
              <div className="hidden md:flex mt-3 px-1">
                <label className="w-full h-9 rounded-xl bg-white/62 dark:bg-zinc-900/66 border border-white/80 dark:border-zinc-700/80 flex items-center gap-2 px-3 text-gray-500 dark:text-zinc-400">
                  <Icons.Search />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-[13px] text-gray-700 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-6 px-2 md:px-3">
            {filteredOverviewItems.length > 0 && (
              <section>
                {!renderCollapsed && (
                  <h3 className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 tracking-[0.14em] uppercase">Overview</h3>
                )}
                <nav className="space-y-0.5">
                  {filteredOverviewItems.map((item) => (
                    <NavItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      icon={item.icon}
                      activeFilter={activeFilter}
                      onFilterChange={onFilterChange}
                      onCloseMobile={onCloseMobile}
                      taskCount={item.taskCount}
                      isFocusItem={item.isFocusItem}
                      isFocusActive={isFocusActive}
                      focusTimeLeft={focusTimeLeft}
                      isCollapsed={renderCollapsed}
                    />
                  ))}
                </nav>
              </section>
            )}

            <section>
              {!renderCollapsed && (
                <div className="px-3 mb-2 flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 tracking-[0.14em] uppercase">Projects</h3>
                  <button
                    onClick={startAddProject}
                    aria-label="Add project"
                    className="w-6 h-6 rounded-md text-gray-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-white/65 dark:hover:bg-zinc-800/60 transition-colors"
                    title="Add project"
                  >
                    <Icons.Plus />
                  </button>
                </div>
              )}

              <nav className="space-y-0.5">
                {filteredProjects.map((project) => (
                  <NavItem
                    key={project}
                    id={project}
                    label={project}
                    icon={getProjectIcon(project)}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    onCloseMobile={onCloseMobile}
                    taskCount={taskCounts[project] || 0}
                    canDelete={!DEFAULT_PROJECTS.includes(project)}
                    onDeleteProject={onDeleteProject}
                    isCollapsed={renderCollapsed}
                  />
                ))}

                {isAddingProject && !renderCollapsed && (
                  <form onSubmit={handleCreateProject} className="px-2 pt-1">
                    <div className="h-10 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-white/90 dark:border-zinc-700 px-3 flex items-center gap-2">
                      <Icons.Folder />
                      <input
                        ref={inputRef}
                        type="text"
                        value={newProjectName}
                        onChange={(event) => setNewProjectName(event.target.value)}
                        onBlur={() => {
                          if (!newProjectName.trim()) setIsAddingProject(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setIsAddingProject(false);
                        }}
                        className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
                        placeholder="Project name"
                      />
                    </div>
                  </form>
                )}
              </nav>
            </section>

            {showHistory && (
              <section>
                {!renderCollapsed && (
                  <h3 className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 tracking-[0.14em] uppercase">History</h3>
                )}
                <nav className="space-y-0.5">
                  <NavItem
                    id="completed"
                    label="Repository"
                    icon={<Icons.CheckCircle />}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                    onCloseMobile={onCloseMobile}
                    taskCount={0}
                    isCollapsed={renderCollapsed}
                  />
                </nav>
              </section>
            )}
          </div>

          <div className="mt-auto px-2 md:px-3 pb-safe md:pb-3 pt-2 shrink-0 border-t border-white/55 dark:border-zinc-800/70">
            <button
              onClick={onOpenSettings}
              className={`
                w-full h-11 rounded-xl transition-colors outline-none
                bg-transparent hover:bg-white/65 dark:hover:bg-zinc-800/55
                ${renderCollapsed ? 'flex items-center justify-center' : 'flex items-center px-2.5'}
              `}
              title="Settings & profile"
            >
              <span className={`flex items-center justify-center ${renderCollapsed ? 'w-9 h-9' : 'w-8 h-8'}`}>
                <span className={`w-6 h-6 rounded-full overflow-hidden text-[10px] font-semibold text-white flex items-center justify-center ${userProfile.avatarColor}`}>
                  {userProfile.avatarImage ? (
                    <img src={userProfile.avatarImage} alt="User avatar" className="w-full h-full object-cover" />
                  ) : (
                    userProfile.name.charAt(0).toUpperCase()
                  )}
                </span>
              </span>

              {!renderCollapsed && (
                <span className="flex-1 min-w-0 text-left pl-2">
                  <span className="block text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">{userProfile.name}</span>
                  <span className="block text-[11px] text-gray-500 dark:text-zinc-500">Settings</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
