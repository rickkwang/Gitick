import React, { useState, useRef, useEffect } from 'react';
import { FilterType, UserProfile } from '../types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from '../constants';

interface SidebarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  taskCounts: Record<string, number>;
  onOpenSettings: () => void;
  // Focus Props
  isFocusActive: boolean;
  focusTimeLeft: number;
  // Dynamic Projects
  projects: string[];
  onAddProject: (name: string) => void;
  onDeleteProject: (name: string) => void;
  // User Profile
  userProfile: UserProfile;
  // Collapse State
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isDesktopMac: boolean;
}

const NavItem: React.FC<{ 
  id: string; 
  label: string; 
  icon: React.ReactNode; 
  canDelete?: boolean;
  activeFilter: FilterType;
  onFilterChange: (id: string) => void;
  onCloseMobile: () => void;
  taskCount: number;
  isFocusItem?: boolean;
  isFocusActive?: boolean;
  focusTimeLeft?: number;
  onDeleteProject?: (id: string) => void;
  isCollapsed: boolean;
}> = ({ 
  id, 
  label, 
  icon, 
  canDelete, 
  activeFilter, 
  onFilterChange, 
  onCloseMobile, 
  taskCount,
  isFocusItem,
  isFocusActive,
  focusTimeLeft,
  onDeleteProject,
  isCollapsed
}) => {
  const isActive = activeFilter === id;
  const isCompact = isCollapsed;
  
  const formatTimeMini = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative group px-2">
        <button
          type="button"
          title={isCollapsed ? label : undefined}
          onClick={() => {
            onFilterChange(id);
            onCloseMobile();
          }}
          className={`
            flex items-center w-full text-[13px] font-medium rounded-xl outline-none select-none
            transition-all duration-200
            h-11 px-0 ${isCompact ? 'justify-center' : ''}
            ${
              isActive
                ? isCompact
                  ? 'text-black dark:text-white border border-transparent'
                  : 'bg-gray-100 dark:bg-zinc-800/90 text-black dark:text-white font-bold border border-gray-200/80 dark:border-zinc-700'
                : isCompact
                  ? 'text-gray-500 dark:text-zinc-400 border border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                  : 'text-gray-500 dark:text-zinc-400 border border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:border-gray-200/80 dark:hover:border-zinc-800 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
        >
          {/* Icon Container - Fixed Width 48px (w-12) */}
          <span
            className={`
              shrink-0 flex items-center justify-center transform-gpu transition-all duration-200
              ${isCompact ? 'w-11 h-11' : 'w-12 h-full group-hover:scale-105'}
            `}
          >
            <span
              className={`
                flex items-center justify-center transition-all duration-200
                ${isCompact ? 'w-9 h-9 rounded-2xl' : 'w-5 h-5'}
                ${
                  isCompact && isActive
                    ? 'bg-gray-100 dark:bg-zinc-800 ring-1 ring-gray-200 dark:ring-zinc-700 shadow-sm'
                    : ''
                }
                ${
                  isCompact && !isActive
                    ? 'group-hover:bg-gray-100/80 dark:group-hover:bg-zinc-800/60'
                    : ''
                }
                ${
                  isActive
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }
              `}
            >
              {icon}
            </span>
          </span>
          
          {/* Text Container */}
          {/* CRITICAL FIX: Always visible on Mobile (default classes), only conditionally hidden on Desktop (md: prefix) */}
          <div className={`
            flex items-center flex-1 min-w-0 overflow-hidden whitespace-nowrap pl-1
            transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] transform-gpu
            opacity-100 translate-x-0
            ${isCollapsed ? 'md:opacity-0 md:translate-x-2' : 'md:opacity-100 md:translate-x-0'}
          `}>
            <span className="truncate pr-2">{label}</span>
            
            {/* Task Count / Focus Timer */}
            <div className="ml-auto pr-3 pl-1">
              {!isFocusItem && taskCount > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white dark:bg-zinc-900 text-black dark:text-white' : 'bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}>
                  {taskCount}
                </span>
              )}
              
              {isFocusItem && isFocusActive && focusTimeLeft !== undefined && (
                <div className="flex items-center gap-2">
                   <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                   </span>
                   <span className="text-[10px] font-mono font-bold text-red-500">
                     {formatTimeMini(focusTimeLeft)}
                   </span>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Collapsed Indicator Dot - Desktop Only */}
        {!isFocusItem && taskCount > 0 && isCollapsed && (
             <span className="hidden md:block absolute top-3 left-8 w-2 h-2 rounded-full bg-black dark:bg-white ring-2 ring-white dark:ring-zinc-950 pointer-events-none animate-in fade-in zoom-in duration-200" />
        )}
        
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
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
             title="Delete Project"
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Logic: renderCollapsed applies MAINLY to Desktop. 
  // On Mobile, we force visual expansion via CSS regardless of this bool to prevent flickering.
  const renderCollapsed = isCollapsed && !isOpen;

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
    if (renderCollapsed) {
       toggleCollapse();
    }
    setIsAddingProject(true);
  }

  const getProjectIcon = (name: string) => {
    switch (name) {
      case 'Work': return <Icons.Briefcase />;
      case 'Study': return <Icons.Book />;
      case 'Travel': return <Icons.Plane />;
      case 'Life': return <Icons.Coffee />;
      default: return <Icons.Folder />;
    }
  };

  // Optimized for "Silky" feel (ChatGPT/Obsidian style)
  // Using a custom spring-like bezier for more natural movement
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-[60] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex flex-col border-r border-gray-200/75 dark:border-zinc-800/85
    
    /* MOBILE CONFIGURATION */
    w-[280px]
    transform-gpu will-change-transform
    /* Smoother, slightly faster transition for mobile drawer feel (500ms) */
    transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
    ${isOpen ? 'translate-x-0 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.15)]' : '-translate-x-full'}
    
    /* DESKTOP CONFIGURATION (Overrides) */
    md:translate-x-0 md:shadow-none md:relative md:z-30 
    md:transition-all md:duration-300 md:ease-[cubic-bezier(0.2,0,0,1)]
    ${renderCollapsed ? 'md:w-[80px]' : 'md:w-[270px]'}
  `;

  return (
    <>
      {/* Mobile Backdrop - Persistent for smooth exit animation */}
      <div 
        className={`
          fixed inset-0 bg-gray-900/30 dark:bg-black/60 z-50 md:hidden backdrop-blur-[2px]
          transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      
      <aside className={sidebarClasses}>
        <div className={`flex flex-col h-full overflow-hidden w-full pt-safe md:pt-0 ${isDesktopMac ? 'pt-5 md:pt-2' : ''}`}>
          
          {/* Header - Completely Refactored for Zero-Flicker */}
          <div className="h-[76px] md:h-[88px] relative flex items-center shrink-0 select-none w-full">
             
             {/* 1. MOBILE HEADER: Static, Always Visible on Mobile (md:hidden) */}
             {/* This separates mobile logic from desktop state, preventing logo flicker during open */}
             <div className="md:hidden absolute inset-0 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5 text-black dark:text-white">
                    <span className="shrink-0 flex items-center justify-center">
                        <Icons.GitickLogo />
                    </span>
                    <span className="text-base font-semibold tracking-tight whitespace-nowrap">
                        Gitick
                    </span>
                </div>
                {/* Mobile Close Button */}
                <button 
                  onClick={onCloseMobile} 
                  aria-label="Close sidebar"
                  className="flex items-center justify-center p-2 -mr-2 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition-colors active:scale-95 transform"
                  title="Close Sidebar"
               >
                  <Icons.SidebarLeft />
               </button>
             </div>

             {/* 2. DESKTOP HEADER - EXPANDED (hidden on mobile) */}
             <div className={`
                hidden md:flex absolute inset-0 px-6 items-center justify-between
                transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                ${renderCollapsed ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0 delay-100'}
             `}>
               <div className="flex items-center gap-3.5 text-black dark:text-white overflow-hidden">
                 <span className="shrink-0 flex items-center justify-center">
                   <Icons.GitickLogo />
                 </span>
                 <span className="text-base font-semibold tracking-tight whitespace-nowrap">
                   Gitick
                 </span>
               </div>
               
               <button 
                  onClick={toggleCollapse} 
                  aria-label="Collapse sidebar"
                  className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Collapse Sidebar"
               >
                  <Icons.SidebarLeft />
               </button>
             </div>

             {/* 3. DESKTOP HEADER - COLLAPSED (hidden on mobile) */}
             <div className={`
                hidden md:flex absolute inset-0 items-center justify-center
                transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                ${renderCollapsed ? 'opacity-100 scale-100 delay-100' : 'opacity-0 scale-90 pointer-events-none'}
             `}>
                <button 
                  onClick={toggleCollapse} 
                  aria-label="Expand sidebar"
                  className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Expand Sidebar"
                >
                   {/* Brand Logo - Visible by default */}
                   <span className="absolute inset-0 flex items-center justify-center text-black dark:text-white transition-all duration-300 transform group-hover:opacity-0 group-hover:scale-75 group-hover:rotate-12">
                     <Icons.GitickLogo />
                   </span>
                   
                   {/* Expand Icon - Visible on Hover */}
                   <span className="absolute inset-0 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-all duration-300 transform opacity-0 scale-75 -rotate-12 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0">
                     <Icons.SidebarRight />
                   </span>
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-7 px-3">
            {/* Section: Overview */}
            <div>
              {/* CRITICAL: md: prefix ensures collapse logic only affects desktop. Mobile is always visible (h-6) */}
              <div className={`
                 overflow-hidden transition-all duration-200 px-3
                 opacity-100 h-6 mb-2
                 ${renderCollapsed ? 'md:opacity-0 md:h-0 md:mb-0' : 'md:opacity-100 md:h-6 md:mb-2'}
              `}>
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest whitespace-nowrap pl-1">Overview</h3>
              </div>
              <nav className="space-y-1">
                <NavItem 
                  id="next7days" label="Dashboard" icon={<Icons.Dashboard />} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['next7days']} 
                  isCollapsed={renderCollapsed}
                />
                <NavItem 
                  id="inbox" label="Inbox" icon={<Icons.Inbox />} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['inbox']} 
                  isCollapsed={renderCollapsed}
                />
                <NavItem 
                  id="today" label="Today" icon={<Icons.Calendar />} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={taskCounts['today']} 
                  isCollapsed={renderCollapsed}
                />
                <NavItem 
                  id="focus" label="Focus Mode" icon={<Icons.Clock />} 
                  activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={0} 
                  isFocusItem={true} isFocusActive={isFocusActive} focusTimeLeft={focusTimeLeft}
                  isCollapsed={renderCollapsed}
                />
              </nav>
            </div>

            {/* Section: Projects */}
            <div>
              <div className={`
                 flex items-center justify-between px-3 group overflow-hidden whitespace-nowrap
                 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]
                 opacity-100 h-6 mb-2
                 ${renderCollapsed ? 'md:opacity-0 md:h-0 md:mb-0' : 'md:opacity-100 md:h-6 md:mb-2'}
              `}>
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest pl-1">Projects</h3>
                  <button 
                    onClick={startAddProject}
                    aria-label="Add project"
                    className="text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                    title="Add Project"
                  >
                    <Icons.Plus />
                  </button>
              </div>

              <nav className="space-y-1">
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
                    onCloseMobile={onCloseMobile} 
                    taskCount={taskCounts[project] || 0} 
                    isCollapsed={renderCollapsed}
                  />
                ))}

                {isAddingProject && !renderCollapsed && (
                  <form onSubmit={handleCreateProject} className="px-1 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700 focus-within:border-black dark:focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-zinc-500 transition-all shadow-sm">
                      <span className="text-gray-400"><Icons.Folder /></span>
                      <input 
                        ref={inputRef}
                        type="text"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-gray-400 min-w-0"
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
                  overflow-hidden transition-all duration-200 px-3
                  opacity-100 h-6 mb-2
                  ${renderCollapsed ? 'md:opacity-0 md:h-0 md:mb-0' : 'md:opacity-100 md:h-6 md:mb-2'}
               `}>
                 <h3 className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest whitespace-nowrap pl-1">History</h3>
               </div>
               <nav className="space-y-1">
                  <NavItem 
                    id="completed" label="Repository" icon={<Icons.CheckCircle />} 
                    activeFilter={activeFilter} onFilterChange={onFilterChange} onCloseMobile={onCloseMobile} taskCount={0} 
                    isCollapsed={renderCollapsed}
                  />
               </nav>
            </div>
          </div>
          
          {/* User Profile Footer (Unified Design) */}
          <div className="mt-auto px-3 pb-safe md:pb-4 pt-2 shrink-0">
             {/* Subtle Divider */}
             <div className="mx-2 mb-2 h-px bg-gray-200/80 dark:bg-zinc-800/80" />
             
             <div className="px-2"> {/* Wrapper to match NavItem padding */}
                <button 
                  onClick={onOpenSettings}
                  className={`
                    group flex items-center w-full rounded-xl transition-all duration-200 outline-none
                    h-11 px-0
                    hover:bg-gray-100 dark:hover:bg-zinc-800
                  `}
                  title="Settings & Profile"
                >
                  {/* Icon Container - Perfectly aligned with NavItem w-12 */}
                  <div className="shrink-0 w-12 h-full flex items-center justify-center transform-gpu transition-transform duration-200 group-hover:scale-105">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10 dark:ring-black/10 overflow-hidden ${userProfile.avatarColor}`}>
                          {userProfile.avatarImage ? (
                            <img src={userProfile.avatarImage} alt="User avatar" className="w-full h-full object-cover" />
                          ) : (
                            userProfile.name.charAt(0).toUpperCase()
                          )}
                      </div>
                  </div>

                  {/* Text Container */}
                  <div className={`
                      flex items-center justify-between flex-1 min-w-0 overflow-hidden pr-3 pl-1
                      transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                      opacity-100 w-auto translate-x-0
                      ${renderCollapsed ? 'md:opacity-0 md:w-0 md:translate-x-4' : 'md:opacity-100 md:w-auto md:translate-x-0'}
                  `}>
                      <div className="flex flex-col items-start leading-tight">
                          <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{userProfile.name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Settings</span>
                      </div>
                      
                      <span className="text-gray-300 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white transition-colors">
                          <Icons.Settings />
                      </span>
                  </div>
                </button>
             </div>
          </div>

        </div>
      </aside>
    </>
  );
};
