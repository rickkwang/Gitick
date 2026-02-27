import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FocusMode } from './components/FocusMode';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { StagingPanel } from './components/StagingPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FilterType, Task, UserProfile } from './types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from './constants';
import { useDesktopUpdater, type DesktopConfirmDialogRequest } from './hooks/useDesktopUpdater';
import { playSuccessSound } from './utils/audio';
import { createOnboardingTasks, DEFAULT_USER_PROFILE } from './utils/appDefaults';
import { sanitizeTaskList } from './utils/taskSanitizer';
import { getFilterBreadcrumb, getFilteredTasks, getTaskCounts, groupDashboardTasks, searchTasks } from './utils/taskView';
import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEYS,
  readStoredJson,
  readStoredValue,
  removeStoredKeys,
  writeStoredJson,
  writeStoredValue,
} from './utils/storage';

const Heatmap = lazy(() => import('./components/Heatmap').then((module) => ({ default: module.Heatmap })));
const GitGraph = lazy(() => import('./components/GitGraph').then((module) => ({ default: module.GitGraph })));
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })),
);
const FOCUS_DEFAULT_SECONDS = 25 * 60;
const BREAK_DEFAULT_SECONDS = 5 * 60;
const TASKS_PERSIST_DEBOUNCE_MS = 250;
const getDefaultFocusSeconds = (mode: 'focus' | 'break') =>
  mode === 'focus' ? FOCUS_DEFAULT_SECONDS : BREAK_DEFAULT_SECONDS;

const App: React.FC = () => {
  // Initialize tasks with Onboarding data if localStorage is empty
  const [tasks, setTasks] = useState<Task[]>(() => {
     const saved = readStoredJson<Task[] | null>(
      [STORAGE_KEYS.tasks, LEGACY_STORAGE_KEYS.tasks],
      null,
      (value) => sanitizeTaskList(value),
    );
     return saved !== null ? saved : createOnboardingTasks();
  });

  const [filter, setFilter] = useState<FilterType>('next7days');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    readStoredJson<boolean>(
      [STORAGE_KEYS.sidebarCollapsed, LEGACY_STORAGE_KEYS.sidebarCollapsed],
      true,
      (value) => Boolean(value),
    ),
  ); // Desktop collapse

  const [isDarkMode, setIsDarkMode] = useState(() => {
     if (typeof window === 'undefined') return false;
     const saved = readStoredValue(STORAGE_KEYS.theme) ?? readStoredValue(LEGACY_STORAGE_KEYS.theme);
     if (saved) return saved === 'dark';
     return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [desktopFontSize, setDesktopFontSize] = useState(() => {
    if (typeof window === 'undefined') return 13;
    const saved =
      readStoredValue(STORAGE_KEYS.desktopFontSize) ?? readStoredValue(LEGACY_STORAGE_KEYS.desktopFontSize);
    const parsed = Number(saved);
    if (!Number.isFinite(parsed)) return 13;
    return Math.min(15, Math.max(12, parsed));
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const desktopPlatform = typeof window !== 'undefined' ? window.gitickDesktop?.platform : undefined;
  const isDesktopMac = desktopPlatform === 'darwin';
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.gitickDesktop?.updater);
  const [confirmDialog, setConfirmDialog] = useState<DesktopConfirmDialogRequest | null>(null);
  
  // Projects State
  const [projects, setProjects] = useState<string[]>(() =>
    readStoredJson<string[]>(
      [STORAGE_KEYS.projects, LEGACY_STORAGE_KEYS.projects],
      DEFAULT_PROJECTS,
      (value) =>
        Array.isArray(value)
          ? value.filter((project): project is string => typeof project === 'string' && project.trim().length > 0)
          : DEFAULT_PROJECTS,
    ),
  );
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    readStoredJson<UserProfile>(
      [STORAGE_KEYS.profile, LEGACY_STORAGE_KEYS.profile],
      DEFAULT_USER_PROFILE,
      (value) => {
        if (!value || typeof value !== 'object') return DEFAULT_USER_PROFILE;
        const profile = value as Record<string, unknown>;
        return {
          name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : DEFAULT_USER_PROFILE.name,
          email: typeof profile.email === 'string' && profile.email.trim() ? profile.email.trim() : DEFAULT_USER_PROFILE.email,
          jobTitle:
            typeof profile.jobTitle === 'string' && profile.jobTitle.trim()
              ? profile.jobTitle.trim()
              : DEFAULT_USER_PROFILE.jobTitle,
          avatarColor:
            typeof profile.avatarColor === 'string' && profile.avatarColor.trim()
              ? profile.avatarColor.trim()
              : DEFAULT_USER_PROFILE.avatarColor,
          avatarImage: typeof profile.avatarImage === 'string' ? profile.avatarImage : '',
        };
      },
    ),
  );
  
  // Search / Command Palette State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const showSearchRef = useRef(showSearch);
  const showSettingsRef = useRef(showSettings);
  const selectedTaskRef = useRef(selectedTask);
  const isSidebarOpenRef = useRef(isSidebarOpen);

  // Undo / Toast State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | undefined>(undefined);
  const toastTimeoutRef = useRef<number | null>(null);
  const themeSwitchTimerRef = useRef<number | null>(null);
  const themeSwitchRafRef = useRef<number | null>(null);
  const [isStartupStatic, setIsStartupStatic] = useState(() => typeof window !== 'undefined');
  
  // --- GLOBAL FOCUS TIMER STATE ---
  const [focusEndTime, setFocusEndTime] = useState<number | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(FOCUS_DEFAULT_SECONDS);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [focusModeType, setFocusModeType] = useState<'focus' | 'break'>('focus');
  const tasksRef = useRef(tasks);
  const isFocusActiveRef = useRef(isFocusActive);

  useEffect(() => {
    isFocusActiveRef.current = isFocusActive;
  }, [isFocusActive]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    showSearchRef.current = showSearch;
  }, [showSearch]);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  // Helper: Format Time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Start Timer Logic
  const switchTimerMode = useCallback((nextMode: 'focus' | 'break', autoStart = false) => {
    const nextDuration = getDefaultFocusSeconds(nextMode);
    setFocusModeType(nextMode);
    setFocusTimeLeft(nextDuration);
    if (autoStart) {
      setFocusEndTime(Date.now() + nextDuration * 1000);
      setIsFocusActive(true);
      return;
    }

    setFocusEndTime(null);
    setIsFocusActive(false);
  }, []);

  const startTimer = () => {
     if (isFocusActiveRef.current) return;
     const startSeconds = Math.max(1, Math.floor(focusTimeLeft));
     setFocusTimeLeft(startSeconds);
     const now = Date.now();
     const end = now + startSeconds * 1000;
     setFocusEndTime(end);
     setIsFocusActive(true);
     if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
       Notification.requestPermission();
     }
  };

  const pauseTimer = () => {
    setIsFocusActive(false);
    setFocusEndTime(null);
  };

  const resetTimer = () => {
    pauseTimer();
    const defaultSeconds = getDefaultFocusSeconds(focusModeType);
    setFocusTimeLeft(defaultSeconds);
  };

  // Timer Tick Effect (High Precision)
  useEffect(() => {
    let interval: number | null = null;

    if (isFocusActive && focusEndTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((focusEndTime - now) / 1000);
        
        if (diff <= 0) {
           const completedMode = focusModeType;
           const nextMode = completedMode === 'focus' ? 'break' : 'focus';

           document.title = 'Gitick - Done!';
           const msg =
             completedMode === 'focus'
               ? 'Focus session finished. Time for a break.'
               : 'Break finished. Back to focus.';
           showToast(msg);
           playSuccessSound();
           
           if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
             new Notification('Gitick Timer', { body: msg, icon: '/favicon.ico' });
           }
           switchTimerMode(nextMode, true);
        } else {
           setFocusTimeLeft((prev) => (prev === diff ? prev : diff));
           document.title = `${formatTime(diff)} - ${focusModeType === 'focus' ? 'Focus' : 'Break'}`;
        }
      }, 1000);
    } else {
      document.title = 'Gitick - Minimalist Tasks';
    }

    return () => { 
      if (interval) clearInterval(interval); 
    };
  }, [isFocusActive, focusEndTime, focusModeType, switchTimerMode]);

  // Handle Focus Mode UI Updates (Wrapping the logic for the component)
  const handleSetTimeLeft = (val: number | ((prev: number) => number)) => {
      setFocusTimeLeft((prev) => {
        const nextValue = typeof val === 'function' ? val(prev) : val;
        const safeValue = Math.max(1, Math.floor(nextValue));
        if (isFocusActiveRef.current) {
          setFocusEndTime(Date.now() + safeValue * 1000);
        }
        return safeValue;
      });
  };

  const handleFocusModeChange = (nextMode: 'focus' | 'break') => {
    switchTimerMode(nextMode, false);
  };

  const toggleThemeMode = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsDarkMode((prev) => !prev);
      return;
    }

    const root = document.documentElement;
    root.classList.add('theme-switching');

    if (themeSwitchRafRef.current !== null) {
      window.cancelAnimationFrame(themeSwitchRafRef.current);
      themeSwitchRafRef.current = null;
    }
    if (themeSwitchTimerRef.current !== null) {
      window.clearTimeout(themeSwitchTimerRef.current);
      themeSwitchTimerRef.current = null;
    }

    themeSwitchRafRef.current = window.requestAnimationFrame(() => {
      setIsDarkMode((prev) => !prev);
      themeSwitchRafRef.current = null;
      themeSwitchTimerRef.current = window.setTimeout(() => {
        root.classList.remove('theme-switching');
        themeSwitchTimerRef.current = null;
      }, 180);
    });
  }, []);

  // Persistence Effects
  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeStoredJson(STORAGE_KEYS.tasks, tasks);
    }, TASKS_PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [tasks]);
  
  useEffect(() => {
      writeStoredJson(STORAGE_KEYS.projects, projects);
  }, [projects]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.profile, userProfile);
  }, [userProfile]);
  
  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.sidebarCollapsed, isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.theme, isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.desktopFontSize, String(desktopFontSize));
    document.documentElement.style.setProperty('--desktop-font-size', `${desktopFontSize}px`);
  }, [desktopFontSize]);

  // --- Actions ---

  const showToast = useCallback((message: string, action?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setStatusMessage(message);
    setUndoAction(() => action);
    toastTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      setUndoAction(undefined);
    }, 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (themeSwitchRafRef.current !== null) {
        window.cancelAnimationFrame(themeSwitchRafRef.current);
      }
      if (themeSwitchTimerRef.current !== null) {
        window.clearTimeout(themeSwitchTimerRef.current);
      }
      document.documentElement.classList.remove('theme-switching');
    },
    [],
  );

  const {
    desktopAppVersion,
    desktopUpdateStatus,
    isCheckingDesktopUpdate,
    requestDesktopUpdateCheck,
    resetDesktopUpdaterState,
  } = useDesktopUpdater({
    enabled: isDesktopRuntime,
    showToast,
    setConfirmDialog,
  });

  const clearAllLocalData = () => {
    removeStoredKeys([
      STORAGE_KEYS.tasks,
      STORAGE_KEYS.projects,
      STORAGE_KEYS.profile,
      STORAGE_KEYS.sidebarCollapsed,
      STORAGE_KEYS.theme,
      STORAGE_KEYS.desktopFontSize,
      LEGACY_STORAGE_KEYS.tasks,
      LEGACY_STORAGE_KEYS.projects,
      LEGACY_STORAGE_KEYS.profile,
      LEGACY_STORAGE_KEYS.sidebarCollapsed,
      LEGACY_STORAGE_KEYS.theme,
      LEGACY_STORAGE_KEYS.desktopFontSize,
    ]);
    setTasks([]);
    setProjects(DEFAULT_PROJECTS);
    setUserProfile(DEFAULT_USER_PROFILE);
    setSelectedTask(null);
    setFilter('next7days');
    setSearchQuery('');
    setShowSearch(false);
    setIsSidebarCollapsed(true);
    resetDesktopUpdaterState();
    setDesktopFontSize(13);
    setFocusEndTime(null);
    setFocusTimeLeft(FOCUS_DEFAULT_SECONDS);
    setIsFocusActive(false);
    setFocusModeType('focus');
    const fallbackDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(fallbackDark);
    showToast('All local data has been reset.');
  };

  const runConfirmAction = useCallback(
    async (kind: 'confirm' | 'cancel') => {
      const dialog = confirmDialog;
      if (!dialog) return;

      setConfirmDialog(null);
      if (kind === 'confirm') {
        try {
          await dialog.onConfirm();
        } catch (error) {
          console.warn('Confirm action failed:', error);
        }
        return;
      }
      if (dialog.onCancel) {
        try {
          await dialog.onCancel();
        } catch (error) {
          console.warn('Cancel action failed:', error);
        }
      }
    },
    [confirmDialog],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      setIsStartupStatic(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  const addProject = (name: string) => {
      if (!projects.some(p => p.toLowerCase() === name.toLowerCase())) {
          setProjects(prev => [...prev, name]);
          showToast(`Project "${name}" created`);
      } else {
          showToast(`Project "${name}" already exists`);
      }
  };

  const deleteProject = (projectToDelete: string) => {
      if (DEFAULT_PROJECTS.includes(projectToDelete)) {
        showToast("Cannot delete default projects");
        return;
      }
      
      const prevProjects = [...projects];
      setProjects(prev => prev.filter(p => p !== projectToDelete));
      
      const tasksToMove = tasks.filter(t => t.list === projectToDelete);
      const tasksToMoveIds = new Set(tasksToMove.map((task) => task.id));
      if (tasksToMove.length > 0) {
        setTasks(prev => prev.map(t => t.list === projectToDelete ? { ...t, list: 'Inbox' } : t));
        showToast(`Deleted "${projectToDelete}". ${tasksToMove.length} tasks moved to Inbox.`, () => {
           setProjects(prevProjects);
           setTasks(prev => prev.map(t => tasksToMoveIds.has(t.id) ? { ...t, list: projectToDelete } : t));
        });
      } else {
         showToast(`Project "${projectToDelete}" deleted`, () => {
             setProjects(prevProjects);
         });
      }

      if (filter === projectToDelete) setFilter('inbox');
  };

  const addTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      completedAt: undefined
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const performToggle = useCallback((id: string) => {
    const now = Date.now();
    const task = tasksRef.current.find(t => t.id === id);
    if (task && !task.completed) {
      playSuccessSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }

    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t
    ));
    
    setSelectedTask((prev) =>
      prev?.id === id ? { ...prev, completed: !prev.completed, completedAt: !prev.completed ? now : undefined } : prev,
    );
  }, []);

  const requestToggleTask = useCallback((task: Task) => {
    performToggle(task.id);
  }, [performToggle]);

  const updateTask = (updatedTask: Task) => {
     const normalizedTask =
       updatedTask.completed && !updatedTask.completedAt
         ? { ...updatedTask, completedAt: Date.now() }
         : updatedTask;
     setTasks(prev => prev.map(t => t.id === normalizedTask.id ? normalizedTask : t));
     setSelectedTask(normalizedTask);
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);

    showToast(`Deleted "${taskToDelete.title}"`, () => {
       setTasks(prev => [taskToDelete, ...prev]);
    });
  };

  const handleImportData = (importedTasks: Task[]) => {
      setTasks(importedTasks);
      const usedProjects = Array.from(new Set(importedTasks.map(t => t.list).filter(Boolean))) as string[];
      const mergedProjects = Array.from(new Set([...DEFAULT_PROJECTS, ...usedProjects])).filter(p => p !== 'Inbox');
      setProjects(mergedProjects);
      showToast(`${importedTasks.length} tasks imported`);
  };

  const filteredTasks = useMemo(() => getFilteredTasks(tasks, filter, projects), [filter, projects, tasks]);

  const taskGroups = useMemo(
    () => (filter === 'next7days' ? groupDashboardTasks(filteredTasks) : null),
    [filteredTasks, filter],
  );

  const taskCounts = useMemo(() => getTaskCounts(tasks, projects), [projects, tasks]);
  
  // Empty State Logic
  const getEmptyState = () => {
     switch (filter) {
        case 'inbox': return { icon: <Icons.Inbox />, title: "Inbox Zero", sub: "Everything is organized." };
        case 'today': return { icon: <Icons.Sun />, title: "No tasks for today", sub: "Time to recharge." };
        case 'next7days': return { icon: <Icons.Dashboard />, title: "No upcoming tasks", sub: "Looking clear ahead." };
        case 'Work': return { icon: <Icons.Briefcase />, title: "Work complete", sub: "Great job wrapping things up." };
        case 'Study': return { icon: <Icons.Book />, title: "Study session over", sub: "Knowledge absorbed." };
        case 'Travel': return { icon: <Icons.Plane />, title: "No trips planned", sub: "Where to next?" };
        case 'Life': return { icon: <Icons.Coffee />, title: "Life is good", sub: "Enjoy your free time." };
        default: return { icon: <Icons.Folder />, title: "No tasks here", sub: "Ready for your new ideas." };
     }
  };
  const emptyState = getEmptyState();

  // Only show input on Dashboard, Today, Inbox, OR active projects
  const showTaskInput = ['next7days', 'today', 'inbox'].includes(filter) || projects.includes(filter);
  const searchResults = useMemo(() => searchTasks(tasks, searchQuery), [searchQuery, tasks]);

  const isRightSidebarOpen = selectedTask !== null;
  const handleSidebarFilterChange = useCallback((nextFilter: FilterType) => {
    setFilter(nextFilter);
    setSelectedTask(null);
  }, []);
  const handleSidebarToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);
  const handleSidebarCloseMobile = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);
  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center pt-24 text-center select-none opacity-60">
      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 flex items-center justify-center text-gray-300 dark:text-zinc-600 mb-6 shadow-sm">
        <div className="scale-150">
          {emptyState.icon}
        </div>
      </div>
      <p className="text-base font-medium text-gray-900 dark:text-white">
        {emptyState.title}
      </p>
      <p className="text-xs font-mono text-gray-400 dark:text-zinc-500 mt-2">
        {emptyState.sub}
      </p>
    </div>
  );

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
          return next;
        });
        return;
      }
      if (e.key === 'Escape') {
        if (showSearchRef.current) {
          setShowSearch(false);
          setSearchQuery('');
        } else if (showSettingsRef.current) {
          setShowSettings(false);
        } else if (selectedTaskRef.current) {
          setSelectedTask(null);
        } else if (isSidebarOpenRef.current) {
          setIsSidebarOpen(false);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderTaskList = (taskList: Task[], groupName?: string) => {
     if (taskList.length === 0) return null;
     
     // Determine group color/style
     let headerClass = "text-gray-900 dark:text-white";
     if (groupName === 'Overdue') headerClass = "text-red-500";
     if (groupName === 'Today') headerClass = "text-blue-500";

     return (
        <div className="mb-6">
           {groupName && (
              // OPTICAL FIX: Added px-5 md:px-6 to align header text with TaskItem content (checkbox)
              // This fixes the "floating header" look relative to the rounded cards
              <div className={`sticky top-0 bg-gray-50 dark:bg-[#181818] z-10 py-3 mb-2 border-b border-gray-200/60 dark:border-zinc-800/80 flex items-center gap-3 transition-colors ${headerClass} px-5 md:px-6`}>
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-90 transform translate-y-[1px]">{groupName}</span>
                  <span className="text-[9px] font-bold font-mono opacity-60 bg-gray-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-black dark:text-white min-w-[1.5rem] text-center">{taskList.length}</span>
              </div>
           )}
           <div className="space-y-2">
              {taskList.map(task => (
                 <TaskItem 
                    key={task.id}
                    task={task}
                    onToggle={requestToggleTask}
                    selected={selectedTask?.id === task.id}
                    onSelect={setSelectedTask}
                 />
              ))}
           </div>
        </div>
     );
  };

  return (
    <div
      className={`[--app-radius:12px] flex flex-col h-dvh md:rounded-[var(--app-radius)] font-sans text-gray-900 dark:text-dark-text bg-white dark:bg-[#181818] overflow-hidden transition-colors duration-300 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black ${
        isStartupStatic ? 'startup-static' : ''
      }`}
    > 
      {/* Mobile Header with Safe Area Padding */}
      <header className="md:hidden bg-gray-50 dark:bg-[#181818] border-b border-gray-100 dark:border-zinc-800 shrink-0 z-50 pt-safe transition-colors duration-300">
         <div className="h-14 flex items-center px-4 justify-between">
            <div className="flex items-center gap-3">
               <button
                 onClick={() => setIsSidebarOpen(true)}
                 aria-label="Open sidebar"
                 className="text-black dark:text-white p-1"
               >
                 <Icons.Menu />
               </button>
               <span className="font-display font-bold tracking-tight brand-text">Gitick</span>
            </div>
            {/* Mobile context indicator */}
            <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-600 px-2 py-1 bg-gray-50 dark:bg-zinc-900 rounded-md">
               {filter === 'next7days' ? 'Dashboard' : filter}
            </div>
         </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        
        {/* COL 1: Sidebar */}
        <Sidebar 
          activeFilter={filter} 
          onFilterChange={handleSidebarFilterChange} 
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={handleSidebarToggleCollapse}
          onCloseMobile={handleSidebarCloseMobile}
          taskCounts={taskCounts}
          onOpenSettings={handleOpenSettings}
          isFocusActive={isFocusActive}
          focusTimeLeft={focusTimeLeft}
          projects={projects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          userProfile={userProfile}
          isDesktopMac={isDesktopMac}
        />

        {/* COL 2: Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-gray-50 dark:bg-[#181818] relative z-0 transition-colors duration-300">
           
           <div className={`h-full flex flex-col ${filter === 'focus' ? '' : 'animate-view-breathe'}`}>
             
             {filter === 'focus' ? (
               <FocusMode
                 timeLeft={focusTimeLeft}
                 setTimeLeft={handleSetTimeLeft}
                 isActive={isFocusActive}
                 onStart={startTimer}
                 onPause={pauseTimer}
                 onReset={resetTimer}
                 mode={focusModeType}
                 setMode={handleFocusModeChange}
               />
             ) : (
               <div className="flex-1 flex flex-col h-full relative">
                  
                  {/* Working Dir Header (Desktop Only) */}
                  <div
                    className={`hidden md:flex h-16 items-center justify-between shrink-0 bg-gray-50 dark:bg-[#181818] z-10 transition-colors duration-300 ${
                      isDesktopMac ? 'pl-24 pr-8' : 'px-8'
                    }`}
                    style={isDesktopMac ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
                  >
                     <div className="flex items-center gap-2 text-sm font-mono text-gray-500 dark:text-zinc-500">
                        <Icons.Folder />
                        <span className="truncate tracking-tight font-medium text-black dark:text-white opacity-70">
                          {getFilterBreadcrumb(filter)}
                        </span>
                     </div>
                     <div
                       className="flex items-center gap-4"
                       style={isDesktopMac ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
                     >
                        {isFocusActive && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-black dark:bg-white rounded-full text-white dark:text-black shadow-lg shadow-black/10 animate-pulse">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Focus</span>
                                <span className="font-mono text-xs font-bold">{formatTime(focusTimeLeft)}</span>
                            </div>
                        )}

                        {/* Search Trigger (Refined) */}
                        <button 
                          onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                          aria-label="Open quick search"
                          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all duration-200"
                          title="Quick Search (Cmd+K)"
                        >
                           <Icons.Search />
                           <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium group-hover:text-black dark:group-hover:text-white transition-colors">Search</span>
                           <span className="ml-1 text-[10px] text-gray-300 dark:text-zinc-600 font-mono border border-gray-200 dark:border-zinc-700 rounded px-1 group-hover:border-gray-300 dark:group-hover:border-zinc-500">⌘K</span>
                        </button>
                     </div>
                  </div>

                  {/* Scrollable List Area */}
                  <div className="flex-1 overflow-y-auto main-scroll scroll-smooth">
                      <div className="max-w-[1100px] mx-auto w-full px-5 md:px-10 py-7 md:py-10">
                          
                          {/* Heatmap Section */}
                          {filter === 'next7days' && (
                             <div className="mb-10">
                                <div className="p-5 md:p-6 bg-white/96 dark:bg-zinc-900/70 rounded-[22px] shadow-sm border border-gray-200/80 dark:border-zinc-800/80">
                                   <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                         <Icons.Flame />
                                         <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Contribution Graph</h3>
                                      </div>
                                      <div className="text-[10px] font-mono text-gray-400">
                                         Activity Log
                                      </div>
                                   </div>
                                   <Suspense fallback={<div className="h-44 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/60" />}>
                                     <Heatmap tasks={tasks} />
                                   </Suspense>
                                </div>
                             </div>
                          )}
                          
                          {/* LIST RENDERING */}
                          {filter === 'completed' ? (
                             <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800/60" />}>
                               <GitGraph tasks={filteredTasks} onDelete={deleteTask} />
                             </Suspense>
                          ) : (
                            <div className="pb-36">
                              {/* Grouped View for Dashboard (TickTick Style) */}
                              {filter === 'next7days' && taskGroups ? (
                                  Object.values(taskGroups).flat().length === 0 ? (
                                      renderEmptyState()
                                  ) : (
                                    <>
                                        {renderTaskList(taskGroups['Overdue'], 'Overdue')}
                                        {renderTaskList(taskGroups['Today'], 'Today')}
                                        {renderTaskList(taskGroups['Tomorrow'], 'Tomorrow')}
                                        {renderTaskList(taskGroups['Next 7 Days'], 'Next 7 Days')}
                                    </>
                                  )
                              ) : (
                                  /* Flat List for other views */
                                  filteredTasks.length > 0 ? (
                                    <div className="space-y-4">
                                      {filteredTasks.map(task => (
                                          <TaskItem 
                                            key={task.id}
                                            task={task}
                                            onToggle={requestToggleTask}
                                            selected={selectedTask?.id === task.id}
                                            onSelect={setSelectedTask}
                                          />
                                      ))}
                                    </div>
                                  ) : (
                                    renderEmptyState()
                                  )
                              )}
                            </div>
                          )}
                      </div>
                  </div>

                  {/* GLOBAL COMMAND BAR (Floating Bottom with Gradient Mask) */}
                  {showTaskInput && (
                     <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                        {/* Gradient Mask to catch scrolling text - Taller and solid at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gray-50/92 dark:bg-[#181818]/88" />

                        {/* Input Container - Padded from bottom including Safe Area */}
                        <div className="relative z-10 w-full flex justify-center px-4 pt-10 pb-safe">
                           <div className="max-w-3xl w-full pointer-events-auto mb-8 md:mb-9">
                              <TaskInput onAddTask={addTask} activeList={filter} projects={projects} />
                           </div>
                        </div>
                     </div>
                  )}

               </div>
             )}
           </div>
        </main>

        {/* COL 3: Staging Area */}
        <aside 
          className={`
             hidden lg:flex flex-col h-full bg-white/95 dark:bg-[#181818]/95 backdrop-blur-sm overflow-hidden border-l border-gray-200/70 dark:border-zinc-800/80
             transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] 
             ${isRightSidebarOpen && filter !== 'focus' ? 'w-96 translate-x-0 opacity-100' : 'w-0 translate-x-10 opacity-0'}
          `}
        >
          <div className="w-96 h-full flex flex-col min-w-[24rem]">
            {selectedTask ? (
               <StagingPanel 
                  variant="sidebar"
                  task={selectedTask}
                  onClose={() => {
                    setSelectedTask(null);
                  }}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onCommit={requestToggleTask}
                  projects={projects}
               />
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                   <Icons.GitCommit />
                   <p className="mt-4 text-xs font-mono text-gray-400">Select a task to view staging details</p>
               </div>
            )}
          </div>
        </aside>

        {/* Mobile Detail Modal -> Now Bottom Sheet in StagingPanel */}
        {selectedTask && (
           <div className="lg:hidden">
              <StagingPanel 
                variant="modal"
                task={selectedTask} 
                onClose={() => setSelectedTask(null)}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onCommit={requestToggleTask}
                projects={projects}
              />
           </div>
        )}

      </div>

      {/* --- OVERLAYS --- */}
      {/* Search / Command Palette (Redesigned - Spotlight Style) */}
      {showSearch && (
         <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop with Blur */}
            <div 
              className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-xl transition-all duration-300 animate-in fade-in"
              onClick={() => setShowSearch(false)} 
            />
            
            {/* Search Box */}
            <div className="relative w-full max-w-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] ring-1 ring-white/20 dark:ring-white/5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
               
               {/* Large Apple-style Input */}
               <div className="flex items-center gap-4 p-5 border-b border-gray-200/50 dark:border-white/5">
                  <span className="text-gray-400 dark:text-zinc-500 scale-125 ml-2">
                     <Icons.Search />
                  </span>
                  <input 
                     ref={searchInputRef}
                     type="text"
                     placeholder="Type to search..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="flex-1 bg-transparent text-2xl outline-none text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-zinc-600 font-medium tracking-tight h-10"
                     autoFocus
                  />
                  <button
                    onClick={() => setShowSearch(false)}
                    aria-label="Close search"
                    className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                     ESC
                  </button>
               </div>

               {/* Results Area */}
               <div className="overflow-y-auto p-2 custom-scroll bg-white/50 dark:bg-zinc-900/50 min-h-[100px]">
                  {searchQuery ? (
                      searchResults.length > 0 ? (
                        <div className="space-y-1 p-2">
                            {searchResults.slice(0, 10).map(task => (
                              <button 
                                  key={task.id}
                                  onClick={() => { setSelectedTask(task); setShowSearch(false); setSearchQuery(''); }}
                                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 group transition-all text-left"
                              >
                                  <div className="flex items-center gap-3">
                                    <span className={`text-gray-400 dark:text-zinc-600 ${task.completed ? 'text-green-500' : ''}`}>
                                        {task.completed ? <Icons.Checked /> : <Icons.Circle />}
                                    </span>
                                    <div>
                                        <div className="text-base font-medium text-gray-900 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">
                                          {task.title}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                                          <span>{task.list || 'Inbox'}</span>
                                          {task.tags.map(t => <span key={t}>#{t}</span>)}
                                        </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Enter to open
                                  </span>
                              </button>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-zinc-600">
                           <span className="text-sm">No results found for "{searchQuery}"</span>
                        </div>
                      )
                  ) : (
                      <div className="p-8 text-center text-gray-400 dark:text-zinc-600">
                          <div className="flex flex-col items-center gap-2 opacity-50">
                             <Icons.Command />
                             <span className="text-sm font-medium">Search your tasks, tags, and projects</span>
                          </div>
                      </div>
                  )}
               </div>
               
               {/* Footer hints */}
               {searchQuery && (
                  <div className="px-4 py-2 bg-gray-50/80 dark:bg-black/20 border-t border-gray-100/50 dark:border-white/5 flex justify-end">
                          <span className="text-[10px] text-gray-400 dark:text-zinc-600 font-mono">
                          {searchResults.length} results found
                          </span>
                  </div>
               )}
            </div>
         </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm" />}>
          <SettingsModal
            onClose={() => setShowSettings(false)}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleThemeMode}
            desktopFontSize={desktopFontSize}
            onChangeDesktopFontSize={setDesktopFontSize}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            tasks={tasks}
            onImportData={handleImportData}
            onClearData={clearAllLocalData}
            desktopAppVersion={desktopAppVersion}
            canCheckDesktopUpdate={isDesktopRuntime}
            desktopUpdateStatus={desktopUpdateStatus}
            isCheckingDesktopUpdate={isCheckingDesktopUpdate}
            onCheckDesktopUpdate={requestDesktopUpdateCheck}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmTone={confirmDialog?.confirmTone}
        onCancel={() => {
          void runConfirmAction('cancel');
        }}
        onConfirm={() => {
          void runConfirmAction('confirm');
        }}
      />

    </div>
  );
};

export default App;
