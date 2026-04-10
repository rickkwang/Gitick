import React, { useState, useRef, useEffect } from 'react';
import { FilterType, UserProfile } from '../types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from '../constants';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
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

type IconComponent = React.ComponentType;

interface NavItemProps {
  id: string;
  label: string;
  icon: IconComponent;
  canDelete?: boolean;
  activeFilter: FilterType;
  onFilterChange: (id: string) => void;
  taskCount: number;
  isFocusItem?: boolean;
  isFocusActive?: boolean;
  focusTimeLeft?: number;
  onDeleteProject?: (id: string) => void;
  isCollapsed: boolean;
}

const NavItemComponent: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  canDelete,
  activeFilter,
  onFilterChange,
  taskCount,
  isFocusItem,
  isFocusActive,
  focusTimeLeft,
  onDeleteProject,
  isCollapsed
}) => {
  const isActive = activeFilter === id;
  const rootClasses = 'px-0';
  
  const formatTimeMini = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative group ${rootClasses}`}>
        <button
          type="button"
          title={isCollapsed ? label : undefined}
          onClick={() => {
            onFilterChange(id);
          }}
          className={`
            group/btn relative flex items-center text-sm font-medium rounded-xl outline-none select-none
            transition-all duration-200
            h-[40px] px-0
            w-full justify-start
              ${
                isActive
                  ? 'text-primary-900 dark:text-dark-text'
                : isCollapsed
                  ? 'text-primary-900 dark:text-dark-text hover:bg-primary-100/50 dark:hover:bg-dark-border/30'
                  : 'text-primary-900 dark:text-dark-text hover:bg-primary-100 dark:hover:bg-dark-border/50 hover:border-primary-200/80 dark:hover:border-dark-border hover:text-primary-900 dark:hover:text-dark-text'
            }
          `}
        >
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-primary-900 dark:bg-dark-text text-primary-50 dark:text-dark-bg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
              {label}
            </span>
          )}
          {/* Icon Container - Fixed Width 48px (w-12) */}
          <span
            className={`
              shrink-0 flex items-center justify-center transition-colors duration-200
              w-[44px] h-[40px] absolute top-0
              ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-0'}
            `}
          >
            <span
              className={`
                flex items-center justify-center transition-colors duration-200
                w-[20px] h-[20px]
                ${
                  isActive
                    ? 'text-[var(--accent)]'
                    : 'text-primary-900 dark:text-dark-text group-hover:text-primary-900 dark:group-hover:text-dark-text'
                }
              `}
            >
              <Icon />
            </span>
          </span>
          
          {/* Text Container */}
          <div className={`
            flex items-center flex-1 min-w-0 overflow-hidden whitespace-nowrap pl-[52px]
            transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
            ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
          `}>
            <span className={`truncate pr-2 ${isActive ? 'font-semibold' : ''}`}>{label}</span>
            
            {/* Task Count / Focus Timer */}
            <div className="ml-auto pr-3 pl-1">
              {!isFocusItem && taskCount > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-primary-50 dark:bg-dark-bg text-primary-900 dark:text-dark-text' : 'bg-primary-200 dark:bg-dark-border text-primary-900 dark:text-dark-text'}`}>
                  {taskCount}
                </span>
              )}
              
              {isFocusItem && isFocusActive && focusTimeLeft !== undefined && (
                <div className="flex items-center gap-2">
                   <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-danger-border)] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-danger-text)]"></span>
                   </span>
                   <span className="text-[10px] font-mono font-bold text-[var(--status-danger-text)]">
                     {formatTimeMini(focusTimeLeft)}
                   </span>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Delete Button */}
        {canDelete && onDeleteProject && !isCollapsed && (
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
    prev.focusTimeLeft === next.focusTimeLeft &&
    prev.isCollapsed === next.isCollapsed &&
    prev.onFilterChange === next.onFilterChange &&
    prev.onDeleteProject === next.onDeleteProject
  );
};

const NavItem = React.memo(NavItemComponent, navItemPropsEqual);

const getProjectIcon = (name: string) => {
  switch (name) {
    case 'Work': return Icons.Briefcase;
    case 'Study': return Icons.Book;
    case 'Travel': return Icons.Plane;
    case 'Life': return Icons.Coffee;
    default: return Icons.Folder;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeFilter,
  onFilterChange,
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingProject) {
      inputRef.current?.focus();
    }
  }, [isAddingProject]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName('');
      setIsAddingProject(false);
    }
  };

  const startAddProject = () => {
    if (isCollapsed) {
       toggleCollapse();
    }
    setIsAddingProject(true);
  }

  // Silky smooth expand/collapse
  const sidebarClasses = cn(
    'relative z-30 flex flex-col',
    activeFilter === 'focus' ? 'bg-transparent' : 'bg-[var(--app-bg)]',
    isCollapsed ? 'w-[96px]' : 'w-[260px]',
    'transition-[width] duration-[var(--duration-slow)] ease-[cubic-bezier(0.2,0,0,1)]',
  );

  return (
      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full w-full p-2.5 pt-2.5">
          <div className="relative flex flex-col h-full overflow-hidden rounded-[var(--app-radius)] border border-primary-200/60 dark:border-dark-border/70 bg-primary-100 dark:bg-dark-surface shadow-[0_8px_30px_rgba(20,20,19,0.15),0_2px_8px_rgba(20,20,19,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]">
          {/* Header */}
          <div className={`h-[102px] relative flex items-center shrink-0 select-none w-full ${isDesktopMac ? 'pt-[54px]' : ''}`}>

             {/* EXPANDED HEADER */}
             <div className={`
                flex absolute inset-0 px-6 items-center justify-between z-20
                transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
             `}>
               <div className="flex items-center gap-2.5 overflow-hidden">
                 <span className="shrink-0 w-12 h-12 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6 text-primary-900 dark:text-dark-text">
                   <Icons.GitickLogo />
                 </span>
                 <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap font-display brand-text">
                   Gitick
                 </span>
               </div>

               <button
                  onClick={toggleCollapse}
                  aria-label="Collapse sidebar"
                  className="flex items-center justify-center p-2 rounded-lg text-primary-400 hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border transition-colors"
                  title="Collapse Sidebar"
               >
                  <Icons.SidebarLeft />
               </button>
             </div>

             {/* COLLAPSED HEADER */}
             <div className={`
                flex absolute inset-0 items-center justify-center z-10
                transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                ${isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}
             `}>
                <button 
                  onClick={toggleCollapse} 
                  aria-label="Expand sidebar"
                  className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-primary-200/50 dark:hover:bg-dark-border transition-colors"
                  title="Expand Sidebar"
                >
                   {/* Brand Logo - Visible by default */}
                   <span className="absolute inset-0 flex items-center justify-center text-primary-900 dark:text-dark-text transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:opacity-0 [&>svg]:w-6 [&>svg]:h-6">
                     <Icons.GitickLogo />
                   </span>

                   {/* Expand Icon - Visible on Hover */}
                   <span className="absolute inset-0 flex items-center justify-center text-primary-500 hover:text-primary-900 dark:hover:text-dark-text transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)] opacity-0 group-hover:opacity-100">
                     <Icons.SidebarRight />
                   </span>
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto no-scrollbar py-2.5 space-y-5 px-2.5 pr-4 -mr-2">
            {/* Section: Overview */}
            <div>
              <div className={`
                 overflow-hidden px-2.5 h-5 mb-1.5 flex items-center
                 transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}>
                <h3 className="text-[10px] font-semibold text-primary-900 dark:text-dark-text uppercase tracking-[0.14em] whitespace-nowrap pl-1">Overview</h3>
              </div>
              <nav className="space-y-0.5">
                <NavItem 
                  id="next7days" label="Dashboard" icon={Icons.Dashboard} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} taskCount={taskCounts['next7days']} 
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="inbox" label="Inbox" icon={Icons.Inbox} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} taskCount={taskCounts['inbox']} 
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="today" label="Today" icon={Icons.Calendar} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} taskCount={taskCounts['today']} 
                  isCollapsed={isCollapsed}
                />
                <NavItem 
                  id="focus" label="Focus Mode" icon={Icons.Clock} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} taskCount={0} 
                  isFocusItem={true} isFocusActive={isFocusActive} focusTimeLeft={focusTimeLeft}
                  isCollapsed={isCollapsed}
                />
              </nav>
            </div>

            {/* Section: Projects */}
            <div>
              <div className={`
                 flex items-center justify-between px-2.5 group overflow-hidden whitespace-nowrap h-5 mb-1.5
                 transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}>
                  <h3 className="text-[10px] font-semibold text-primary-900 dark:text-dark-text uppercase tracking-[0.14em] pl-1">Projects</h3>
                  <button
                    onClick={startAddProject}
                    aria-label="Add project"
                    className="text-primary-900 dark:text-dark-text hover:text-primary-900 dark:hover:text-dark-text transition-colors p-1 rounded-full hover:bg-primary-200/50 dark:hover:bg-dark-border"
                    title="Add Project"
                  >
                    <Icons.Plus />
                  </button>
              </div>

              <nav className="space-y-0.5">
                {projects.map(project => (
                  <NavItem 
                    key={project} 
                    id={project} 
                    label={project} 
                    icon={getProjectIcon(project)}
                    canDelete={!DEFAULT_PROJECTS.includes(project)}
                    onDeleteProject={onDeleteProject}
                    activeFilter={activeFilter} 
                    onFilterChange={onFilterChange} 
                                       taskCount={taskCounts[project] || 0} 
                    isCollapsed={isCollapsed}
                  />
                ))}

                {isAddingProject && !isCollapsed && (
                  <form onSubmit={handleCreateProject} className="px-1 py-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 bg-primary-100 dark:bg-dark-bg rounded-lg border border-primary-200 dark:border-dark-border focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all shadow-sm">
                      <span className="text-primary-900 dark:text-dark-text"><Icons.Folder /></span>
                      <input 
                        ref={inputRef}
                        type="text"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
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

            {/* Section: History */}
            <div>
               <div className={`
                  overflow-hidden px-3 h-6 mb-2 flex items-center
                  transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                  ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
               `}>
                 <h3 className="text-[10px] font-semibold text-primary-900 dark:text-dark-text uppercase tracking-[0.14em] whitespace-nowrap pl-1">History</h3>
               </div>
                 <nav className="space-y-0.5">
                  <NavItem 
                    id="completed" label="Repository" icon={Icons.CheckCircle} 
                    activeFilter={activeFilter} onFilterChange={onFilterChange} taskCount={0} 
                    isCollapsed={isCollapsed}
                  />
               </nav>
            </div>
            </div>
          </div>
          
          {/* User Profile Footer (Unified Design) */}
          <div className="mt-auto px-2.5 pb-3 pt-1.5 shrink-0">
             {/* Subtle Divider */}
             <div className="mx-2 mb-1.5 h-px bg-primary-200/80 dark:bg-dark-border/80" />
             
             <div className={isCollapsed ? 'md:px-0 px-1.5' : 'px-1.5'}> {/* Wrapper to match NavItem padding */}
                <button 
                  onClick={onOpenSettings}
                  className={`
                    group flex items-center w-full rounded-xl transition-colors duration-200 outline-none
                    h-10 px-0
                    ${isCollapsed ? 'md:justify-center' : ''}
                    hover:bg-primary-200/50 dark:hover:bg-dark-border
                  `}
                  title="Settings & Profile"
                >
                  {/* Icon Container - Perfectly aligned with NavItem w-12 */}
                  <div className={`shrink-0 flex items-center justify-center transition-colors duration-200 ${isCollapsed ? 'w-10 h-10' : 'w-11 h-full'}`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10 dark:ring-black/10 overflow-hidden ${userProfile.avatarColor}`}>
                          {userProfile.avatarImage ? (
                            <img src={userProfile.avatarImage} alt="User avatar" className="w-full h-full object-cover" />
                          ) : (
                            userProfile.name.charAt(0).toUpperCase()
                          )}
                      </div>
                  </div>

                  {/* Text Container */}
                  <div className={cn(
                      'flex items-center justify-between flex-1 min-w-0 overflow-hidden pr-2.5 pl-1',
                      'transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                      isCollapsed ? 'hidden' : 'opacity-100'
                  )}>
                      <div className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-bold text-primary-900 dark:text-dark-text truncate max-w-[120px]">{userProfile.name}</span>
                          <span className="text-[10px] text-primary-900 dark:text-dark-text font-medium">Settings</span>
                      </div>
                      
                      <span className="text-primary-900 dark:text-dark-text group-hover:text-primary-900 dark:group-hover:text-dark-text transition-colors">
                          <Icons.Settings />
                      </span>
                  </div>
                </button>
             </div>
          </div>

          </div>
        </div>
      </aside>
  );
};
