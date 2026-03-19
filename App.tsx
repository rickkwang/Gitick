import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FocusMode } from './components/FocusMode';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { StagingPanel } from './components/StagingPanel';
import { CommandPalette } from './components/CommandPalette';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FilterType, Priority, Task, UserProfile } from './types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from './constants';
import { useDesktopUpdater, type DesktopConfirmDialogRequest } from './hooks/useDesktopUpdater';
import { playSuccessSound } from './utils/audio';
import { createOnboardingTasks, DEFAULT_USER_PROFILE } from './utils/appDefaults';
import { useFocusTimer } from './hooks/useFocusTimer';
import { sanitizeTaskList } from './utils/taskSanitizer';
import { getFilteredTasks, getTaskCounts, groupDashboardTasks } from './utils/taskView';
import { getNextRecurringDueDate } from './utils/recurrence';
import { todayLocalIsoDate } from './utils/date';
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
const TASKS_PERSIST_DEBOUNCE_MS = 800;
const DESKTOP_FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18] as const;

const normalizeDesktopFontSize = (value: number): number => {
  if (!Number.isFinite(value)) return 12;
  return DESKTOP_FONT_SIZE_OPTIONS.reduce((nearest, candidate) =>
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest
  );
};

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
    if (typeof window === 'undefined') return 12;
    const saved =
      readStoredValue(STORAGE_KEYS.desktopFontSize) ?? readStoredValue(LEGACY_STORAGE_KEYS.desktopFontSize);
    const parsed = Number(saved);
    return normalizeDesktopFontSize(parsed);
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPriority, setSearchPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchProject, setSearchProject] = useState<'all' | string>('all');
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
  
  const showSettingsRef = useRef(showSettings);
  const selectedTaskRef = useRef(selectedTask);

  // Undo / Toast State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | undefined>(undefined);
  const toastTimeoutRef = useRef<number | null>(null);
  const themeSwitchTimerRef = useRef<number | null>(null);
  const themeSwitchRafRef = useRef<number | null>(null);
  const [isStartupStatic, setIsStartupStatic] = useState(() => typeof window !== 'undefined');
  
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

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
    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      const persist = () => writeStoredJson(STORAGE_KEYS.tasks, tasks);
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(persist, { timeout: 1000 });
      } else {
        persist();
      }
    }, TASKS_PERSIST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
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
    focusTimeLeft,
    isFocusActive,
    focusModeType,
    startTimer,
    pauseTimer,
    resetTimer,
    handleSetTimeLeft,
    handleFocusModeChange,
    resetFocusState,
  } = useFocusTimer({ filter, showToast });

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
    setIsSidebarCollapsed(true);
    resetDesktopUpdaterState();
    setDesktopFontSize(12);
    resetFocusState();
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
      completedAt: undefined,
      recurrence: newTaskData.recurrence ?? null,
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const performToggle = useCallback((id: string) => {
    const now = Date.now();
    const task = tasksRef.current.find(t => t.id === id);
    if (task && !task.completed) {
      playSuccessSound();
    }

    const shouldGenerateNext = Boolean(task && !task.completed && task.recurrence);
    const nextTask: Task | null =
      shouldGenerateNext && task
        ? {
            ...task,
            id: crypto.randomUUID(),
            completed: false,
            completedAt: undefined,
            dueDate: getNextRecurringDueDate(task.dueDate, task.recurrence),
            createdAt: now + 1,
          }
        : null;

    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t
      );
      return nextTask ? [nextTask, ...updated] : updated;
    });
    
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

  const baseFilteredTasks = useMemo(() => getFilteredTasks(tasks, filter, projects), [filter, projects, tasks]);
  const filteredTasks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return baseFilteredTasks.filter((task) => {
      if (searchPriority !== 'all' && task.priority !== searchPriority) return false;
      if (searchProject !== 'all' && (task.list || 'Inbox') !== searchProject) return false;

      if (!keyword) return true;
      const inTitle = task.title.toLowerCase().includes(keyword);
      const inDescription = (task.description || '').toLowerCase().includes(keyword);
      const inTags = task.tags.some((tag) => tag.toLowerCase().includes(keyword));
      const inList = (task.list || 'Inbox').toLowerCase().includes(keyword);
      return inTitle || inDescription || inTags || inList;
    });
  }, [baseFilteredTasks, searchPriority, searchProject, searchQuery]);

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
  const isRightSidebarOpen = selectedTask !== null;
  const handleSidebarFilterChange = useCallback((nextFilter: FilterType) => {
    setFilter(nextFilter);
    setSelectedTask(null);
  }, []);
  const handleSidebarToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);
  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const createTaskFromCommand = useCallback(
    (title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;
      addTask({
        title: cleanTitle,
        description: '',
        completed: false,
        priority: Priority.MEDIUM,
        dueDate: todayLocalIsoDate(),
        tags: [],
        list: 'Inbox',
        subtasks: [],
        recurrence: null,
      });
      setFilter('inbox');
      showToast(`Created "${cleanTitle}"`);
    },
    [showToast],
  );

  const openTaskFromCommand = useCallback(
    (task: Task) => {
      if (task.completed) {
        setFilter('completed');
      } else if (task.list && projects.includes(task.list)) {
        setFilter(task.list);
      } else {
        setFilter('inbox');
      }
      setSelectedTask(task);
    },
    [projects],
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center pt-24 text-center select-none opacity-60">
      <div className="w-20 h-20 rounded-xl bg-primary-50 dark:bg-dark-bg border border-primary-200/80 dark:border-dark-border/80 flex items-center justify-center text-primary-300 dark:text-dark-muted mb-6 shadow-sm">
        <div className="scale-150">
          {emptyState.icon}
        </div>
      </div>
      <p className="text-base font-medium text-primary-900 dark:text-dark-text">
        {emptyState.title}
      </p>
      <p className="text-xs font-mono text-primary-400 dark:text-dark-muted mt-2">
        {emptyState.sub}
      </p>
    </div>
  );

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.closest('[contenteditable="true"]'));

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (showSettingsRef.current) {
          setShowSettings(false);
        } else if (selectedTaskRef.current) {
          setSelectedTask(null);
        }
        return;
      }

      if (!isTextField && e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const renderTaskList = (taskList: Task[], groupName?: string) => {
     if (taskList.length === 0) return null;
     
     // Determine group color/style
     let headerClass = "text-primary-900 dark:text-dark-text";
     if (groupName === 'Overdue') headerClass = "text-[var(--status-danger-text)]";
     if (groupName === 'Today') headerClass = "text-[var(--status-info-text)]";

     return (
        <div className="mb-6">
           {groupName && (
              <div className={`sticky top-0 bg-[var(--app-bg)] z-10 py-3 mb-2 flex items-center gap-2.5 transition-colors ${headerClass} px-6`}>
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{groupName}</span>
                  <span className="text-[10px] font-bold font-mono opacity-60 bg-primary-200/40 dark:bg-dark-border px-2 py-0.5 rounded-full text-primary-900 dark:text-dark-text min-w-[1.5rem] text-center">{taskList.length}</span>
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
      className={`[--app-radius:0.625rem] flex flex-col h-dvh rounded-[var(--app-radius)] font-sans text-primary-900 dark:text-dark-text bg-[var(--app-bg)] overflow-hidden transition-colors duration-300 selection:bg-primary-900 selection:text-white dark:selection:bg-primary-100 dark:selection:text-primary-900 ${
        isStartupStatic ? 'startup-static' : ''
      }`}
    >
      {/* Main Layout Container */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        
        {/* COL 1: Sidebar */}
        <Sidebar
          activeFilter={filter}
          onFilterChange={handleSidebarFilterChange}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={handleSidebarToggleCollapse}
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
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[var(--app-bg)] relative z-0 transition-colors duration-300">
           
           <div className={`h-full flex flex-col ${filter === 'focus' || isSidebarCollapsed ? '' : 'animate-view-breathe'}`}>
             
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
                  
                  {/* Scrollable List Area */}
                  <div className="flex-1 overflow-y-auto main-scroll scroll-smooth">
                      <div className="max-w-[1400px] mx-auto w-full px-8 py-6">
                          {filter !== 'focus' && (
                            <div className="mb-5">
                              <div className="w-full max-w-[1040px] mx-auto px-1 py-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-full max-w-[520px] min-w-[280px]">
                                    <div className="h-9 flex items-center gap-2 rounded-lg px-3 bg-primary-50 dark:bg-dark-bg/40 border border-primary-200/70 dark:border-dark-border/70">
                                      <span className="text-primary-400 dark:text-dark-muted shrink-0 flex items-center justify-center w-4 h-4">
                                        <Icons.Search />
                                      </span>
                                      <input
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        placeholder="Search"
                                        className="w-full bg-transparent outline-none text-xs font-medium text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex-1" />

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="h-9 rounded-lg border border-primary-200/70 dark:border-dark-border/70 bg-primary-50 dark:bg-dark-bg/40 px-2.5">
                                      <select
                                        value={searchPriority}
                                        onChange={(event) => setSearchPriority(event.target.value as 'all' | 'high' | 'medium' | 'low')}
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
                                        onChange={(event) => setSearchProject(event.target.value as 'all' | string)}
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
                          )}
                          
                          {/* Heatmap Section */}
                          {filter === 'next7days' && (
                             <div className="mb-6">
                                <div className="w-full max-w-[1040px] mx-auto p-4 bg-primary-50 dark:bg-dark-surface rounded-lg shadow-sm border border-primary-200/80 dark:border-dark-border/80">
                                   <div className="flex items-center justify-between mb-2">
                                      <h3 className="text-[10px] font-bold text-primary-900 dark:text-dark-text uppercase tracking-wider flex items-center gap-1.5">
                                         <Icons.Flame /> Contributions
                                      </h3>
                                   </div>
                                   <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-primary-200/50 dark:bg-dark-surface/70" />}>
                                     <Heatmap tasks={tasks} />
                                   </Suspense>
                                </div>
                             </div>
                          )}
                          
                          {/* LIST RENDERING */}
                          {filter === 'completed' ? (
                             <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-primary-200/50 dark:bg-dark-border/60" />}>
                               <GitGraph tasks={filteredTasks} onDelete={deleteTask} userProfile={userProfile} />
                             </Suspense>
                          ) : (
                            <div className="pb-28">
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
                                    <div className="space-y-2.5">
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
                        {/* Gradient Mask */}
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-[var(--app-bg)]/92 dark:bg-[var(--app-bg)]/88" />

                        {/* Input Container - Padded from bottom including Safe Area */}
                        <div className="relative z-10 w-full flex justify-center px-4 pt-10 pb-4">
                           <div className="max-w-[1040px] w-full pointer-events-auto mb-9">
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
             flex flex-col h-full bg-primary-50 dark:bg-dark-surface overflow-hidden border-l border-primary-200/70 dark:border-dark-border
             transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
             ${isRightSidebarOpen && filter !== 'focus' ? 'w-96 translate-x-0 opacity-100' : 'w-0 translate-x-10 opacity-0'}
          `}
        >
          <div className="w-96 h-full flex flex-col min-w-[24rem]">
            {selectedTask ? (
               <StagingPanel
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
                   <p className="mt-4 text-xs font-mono text-primary-400">Select a task to view staging details</p>
               </div>
            )}
          </div>
        </aside>

      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 z-[90] bg-primary-900/20" />}>
          <SettingsModal
            onClose={() => setShowSettings(false)}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleThemeMode}
            desktopFontSize={desktopFontSize}
            onChangeDesktopFontSize={(size) => setDesktopFontSize(normalizeDesktopFontSize(size))}
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

      <CommandPalette
        open={isCommandPaletteOpen}
        tasks={tasks}
        onClose={() => setIsCommandPaletteOpen(false)}
        onChangeFilter={handleSidebarFilterChange}
        onOpenSettings={handleOpenSettings}
        onOpenTask={openTaskFromCommand}
        onCreateTask={createTaskFromCommand}
      />

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
