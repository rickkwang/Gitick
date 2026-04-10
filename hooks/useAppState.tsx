import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { FilterType, Priority, Task, UserProfile } from '../types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from '../constants';
import { useDesktopUpdater, type DesktopConfirmDialogRequest } from './useDesktopUpdater';
import { playSuccessSound } from '../utils/audio';
import { createOnboardingTasks, DEFAULT_USER_PROFILE } from '../utils/appDefaults';
import { useFocusTimer } from './useFocusTimer';
import { type FocusModeType } from '../utils/focusTimer';
import { sanitizeTaskList } from '../utils/taskSanitizer';
import { getFilteredTasks, getTaskCounts, groupDashboardTasks } from '../utils/taskView';
import { getNextRecurringDueDate } from '../utils/recurrence';
import { todayLocalIsoDate } from '../utils/date';
import { normalizeDesktopFontSize } from '../lib/utils';
import { generateTaskId } from '../utils/id';
import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEYS,
  readStoredJson,
  readStoredValue,
  removeStoredKeys,
  writeStoredJson,
  writeStoredValue,
} from '../utils/storage';

const TASKS_PERSIST_DEBOUNCE_MS = 800;
const MAX_CONCURRENT_TASKS_CREATED_SAME_MS = 1000;

type TaskUpdate = Task | ((prevTask: Task) => Task);

export interface UseAppStateReturn {
  // State
  tasks: Task[];
  filter: FilterType;
  selectedTask: Task | null;
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  desktopFontSize: number;
  showSettings: boolean;
  isCommandPaletteOpen: boolean;
  searchQuery: string;
  searchPriority: 'all' | 'high' | 'medium' | 'low';
  searchProject: 'all' | string;
  projects: string[];
  userProfile: UserProfile;
  confirmDialog: DesktopConfirmDialogRequest | null;
  statusMessage: string | null;
  undoAction: (() => void) | undefined;
  isStartupStatic: boolean;
  focusTimeLeft: number;
  isFocusActive: boolean;
  focusModeType: FocusModeType;
  desktopAppVersion: string | undefined;
  desktopUpdateStatus: string | undefined;
  isCheckingDesktopUpdate: boolean;
  desktopPlatform: string | undefined;
  isDesktopMac: boolean;
  isDesktopRuntime: boolean;
  emptyState: { icon: ReactNode; title: string; sub: string };
  showTaskInput: boolean;
  isRightSidebarOpen: boolean;
  taskCounts: Record<string, number>;
  filteredTasks: Task[];
  taskGroups: Record<string, Task[]> | null;

  // Actions
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setFilter: Dispatch<SetStateAction<FilterType>>;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsDarkMode: Dispatch<SetStateAction<boolean>>;
  setDesktopFontSize: Dispatch<SetStateAction<number>>;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  setIsCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setSearchPriority: Dispatch<SetStateAction<'all' | 'high' | 'medium' | 'low'>>;
  setSearchProject: Dispatch<SetStateAction<'all' | string>>;
  setConfirmDialog: Dispatch<SetStateAction<DesktopConfirmDialogRequest | null>>;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;

  // Callbacks
  addTask: (newTaskData: Omit<Task, 'id' | 'createdAt'>) => void;
  deleteTask: (id: string) => void;
  updateTask: (taskUpdate: TaskUpdate) => void;
  performToggle: (id: string) => void;
  requestToggleTask: (task: Task) => void;
  toggleThemeMode: () => void;
  showToast: (message: string, action?: () => void) => void;
  clearAllLocalData: () => void;
  handleSidebarFilterChange: (nextFilter: FilterType) => void;
  handleSidebarToggleCollapse: () => void;
  handleOpenSettings: () => void;
  createTaskFromCommand: (title: string) => void;
  openTaskFromCommand: (task: Task) => void;
  addProject: (name: string) => void;
  deleteProject: (projectToDelete: string) => void;
  handleImportData: (importedTasks: Task[]) => void;

  // Focus Timer
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  handleSetTimeLeft: (val: number | ((prev: number) => number)) => void;
  handleFocusModeChange: (mode: FocusModeType) => void;
  resetFocusState: () => void;

  // Desktop Updater
  requestDesktopUpdateCheck: () => void;
  resetDesktopUpdaterState: () => void;
  runConfirmAction: (kind: 'confirm' | 'cancel') => Promise<void>;

  // Internal
  taskTiebreakerRef: MutableRefObject<number>;
  showSettingsRef: MutableRefObject<boolean>;
  selectedTaskRef: MutableRefObject<Task | null>;
}

export function useAppState(): UseAppStateReturn {
  // Initialize tasks with Onboarding data if localStorage is empty
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = readStoredJson<Task[] | null>([STORAGE_KEYS.tasks, LEGACY_STORAGE_KEYS.tasks], null, (value) =>
      sanitizeTaskList(value),
    );
    return saved !== null ? saved : createOnboardingTasks();
  });

  const [filter, setFilter] = useState<FilterType>('next7days');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    readStoredJson<boolean>([STORAGE_KEYS.sidebarCollapsed, LEGACY_STORAGE_KEYS.sidebarCollapsed], true, (value) =>
      Boolean(value),
    ),
  );

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = readStoredValue(STORAGE_KEYS.theme) ?? readStoredValue(LEGACY_STORAGE_KEYS.theme);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [desktopFontSize, setDesktopFontSize] = useState(() => {
    if (typeof window === 'undefined') return 12;
    const saved = readStoredValue(STORAGE_KEYS.desktopFontSize) ?? readStoredValue(LEGACY_STORAGE_KEYS.desktopFontSize);
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
    readStoredJson<string[]>([STORAGE_KEYS.projects, LEGACY_STORAGE_KEYS.projects], DEFAULT_PROJECTS, (value) =>
      Array.isArray(value)
        ? value.filter((project): project is string => typeof project === 'string' && project.trim().length > 0)
        : DEFAULT_PROJECTS,
    ),
  );

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    readStoredJson<UserProfile>([STORAGE_KEYS.profile, LEGACY_STORAGE_KEYS.profile], DEFAULT_USER_PROFILE, (value) => {
      if (!value || typeof value !== 'object') return DEFAULT_USER_PROFILE;
      const profile = value as Record<string, unknown>;
      return {
        name:
          typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : DEFAULT_USER_PROFILE.name,
        email:
          typeof profile.email === 'string' && profile.email.trim()
            ? profile.email.trim()
            : DEFAULT_USER_PROFILE.email,
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
    }),
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
  const taskTiebreakerRef = useRef(0);
  // Use crypto.randomUUID() for unique tiebreaker when available (multi-tab safety)
  const instanceId = useRef(typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  // Cleanup timers/RAF on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) clearTimeout(toastTimeoutRef.current);
      if (themeSwitchTimerRef.current !== null) clearTimeout(themeSwitchTimerRef.current);
      if (themeSwitchRafRef.current !== null) cancelAnimationFrame(themeSwitchRafRef.current);
    };
  }, []);

  // Sync all refs in one effect to guarantee consistent snapshot
  useEffect(() => {
    tasksRef.current = tasks;
    showSettingsRef.current = showSettings;
    selectedTaskRef.current = selectedTask;
  }, [tasks, showSettings, selectedTask]);

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
    let cancelled = false;
    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      const persist = () => {
        if (cancelled) return;
        const ok = writeStoredJson(STORAGE_KEYS.tasks, tasks);
        if (!ok) {
          showToast('Failed to save tasks. Storage may be full.', () => {
            clearAllLocalData();
          });
        }
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(persist, { timeout: 1000 });
      } else {
        persist();
      }
    }, TASKS_PERSIST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
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

  const showToast = useCallback(
    (message: string, action?: () => void) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setStatusMessage(message);
      setUndoAction(() => action);
      toastTimeoutRef.current = window.setTimeout(() => {
        setStatusMessage(null);
        setUndoAction(undefined);
      }, 4000);
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

  const clearAllLocalData = useCallback(() => {
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
  }, [resetDesktopUpdaterState, resetFocusState, showToast]);

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

  const addProject = useCallback(
    (name: string) => {
      if (!projects.some((p) => p.toLowerCase() === name.toLowerCase())) {
        setProjects((prev) => [...prev, name]);
        showToast(`Project "${name}" created`);
      } else {
        showToast(`Project "${name}" already exists`);
      }
    },
    [projects, showToast],
  );

  const deleteProject = useCallback(
    (projectToDelete: string) => {
      if (DEFAULT_PROJECTS.includes(projectToDelete)) {
        showToast('Cannot delete default projects');
        return;
      }

      const prevProjects = [...projects];
      setProjects((prev) => prev.filter((p) => p !== projectToDelete));

      const tasksToMove = tasks.filter((t) => t.list === projectToDelete);
      const tasksToMoveIds = new Set(tasksToMove.map((task) => task.id));
      if (tasksToMove.length > 0) {
        setTasks((prev) =>
          prev.map((t) => (t.list === projectToDelete ? { ...t, list: 'Inbox' } : t)),
        );
        showToast(`Deleted "${projectToDelete}". ${tasksToMove.length} tasks moved to Inbox.`, () => {
          setProjects(prevProjects);
          setTasks((prev) =>
            prev.map((t) => (tasksToMoveIds.has(t.id) ? { ...t, list: projectToDelete } : t)),
          );
        });
      } else {
        showToast(`Project "${projectToDelete}" deleted`, () => {
          setProjects(prevProjects);
        });
      }

      if (filter === projectToDelete) setFilter('inbox');
    },
    [filter, projects, showToast],
  );

  const addTask = useCallback((newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: generateTaskId(),
      createdAt: Date.now(),
      completedAt: undefined,
      recurrence: newTaskData.recurrence ?? null,
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const performToggle = useCallback((id: string) => {
    const now = Date.now();
    const task = tasksRef.current.find((t) => t.id === id);
    if (task && !task.completed) {
      playSuccessSound();
    }

    const shouldGenerateNext = Boolean(task && !task.completed && task.recurrence);
    // Combine instanceId with tiebreaker counter for uniqueness across tabs/sessions
    // Format: instanceId:counter where counter ensures ordering within same instance
    const tiebreakerValue = `${instanceId.current}:${taskTiebreakerRef.current}`;
    const nextTask: Task | null =
      shouldGenerateNext && task
        ? {
            ...task,
            id: generateTaskId(),
            completed: false,
            completedAt: undefined,
            dueDate: getNextRecurringDueDate(task.dueDate, task.recurrence),
            createdAt: now - taskTiebreakerRef.current,
            // Embed tiebreaker in id to ensure uniqueness across rapid multi-tab creation
          }
        : null;

    taskTiebreakerRef.current = (taskTiebreakerRef.current + 1) % MAX_CONCURRENT_TASKS_CREATED_SAME_MS;

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t,
      );
      return nextTask ? [nextTask, ...updated] : updated;
    });

    setSelectedTask((prev) =>
      prev?.id === id
        ? { ...prev, completed: !prev.completed, completedAt: !prev.completed ? now : undefined }
        : prev,
    );
  }, []);

  const requestToggleTask = useCallback(
    (task: Task) => {
      performToggle(task.id);
    },
    [performToggle],
  );

  const updateTask = useCallback((taskUpdate: TaskUpdate) => {
    let latestNormalizedTask: Task | null = null;

    setTasks((prev) =>
      prev.map((t) => {
        const candidateTask = typeof taskUpdate === 'function' ? taskUpdate(t) : taskUpdate;
        if (candidateTask.id !== t.id) return t;
        const normalizedTask =
          candidateTask.completed && !candidateTask.completedAt
            ? { ...candidateTask, completedAt: Date.now() }
            : candidateTask;
        latestNormalizedTask = normalizedTask;
        return normalizedTask;
      }),
    );

    setSelectedTask((prevSelectedTask) => {
      if (!latestNormalizedTask) return prevSelectedTask;
      if (!prevSelectedTask || prevSelectedTask.id !== latestNormalizedTask.id) return prevSelectedTask;
      return latestNormalizedTask;
    });
  }, []);

  const deleteTask = useCallback(
    (id: string) => {
      const taskToDelete = tasks.find((t) => t.id === id);
      if (!taskToDelete) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTask?.id === id) setSelectedTask(null);

      showToast(`Deleted "${taskToDelete.title}"`, () => {
        setTasks((prev) => [taskToDelete, ...prev]);
      });
    },
    [selectedTask, tasks, showToast],
  );

  const handleImportData = useCallback(
    (importedTasks: Task[]) => {
      setTasks(importedTasks);
      const usedProjects = Array.from(new Set(importedTasks.map((t) => t.list).filter(Boolean))) as string[];
      const mergedProjects = Array.from(new Set([...DEFAULT_PROJECTS, ...usedProjects])).filter(
        (p) => p !== 'Inbox',
      );
      setProjects(mergedProjects);
      showToast(`${importedTasks.length} tasks imported`);
    },
    [showToast],
  );

  const baseFilteredTasks = useMemo(
    () => getFilteredTasks(tasks, filter, projects),
    [filter, projects, tasks],
  );
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
      case 'inbox':
        return { icon: <Icons.Inbox />, title: 'Inbox Zero', sub: 'Everything is organized.' };
      case 'today':
        return { icon: <Icons.Sun />, title: 'No tasks for today', sub: 'Time to recharge.' };
      case 'next7days':
        return { icon: <Icons.Dashboard />, title: 'No upcoming tasks', sub: 'Looking clear ahead.' };
      case 'Work':
        return { icon: <Icons.Briefcase />, title: 'Work complete', sub: 'Great job wrapping things up.' };
      case 'Study':
        return { icon: <Icons.Book />, title: 'Study session over', sub: 'Knowledge absorbed.' };
      case 'Travel':
        return { icon: <Icons.Plane />, title: 'No trips planned', sub: 'Where to next?' };
      case 'Life':
        return { icon: <Icons.Coffee />, title: 'Life is good', sub: 'Enjoy your free time.' };
      default:
        return { icon: <Icons.Folder />, title: 'No tasks here', sub: 'Ready for your new ideas.' };
    }
  };
  const emptyState = getEmptyState();

  // Only show input on Dashboard, Today, Inbox, OR active projects
  const showTaskInput = ['next7days', 'today', 'inbox'].includes(filter) || projects.includes(filter);
  const isRightSidebarOpen = selectedTask !== null;
  const handleSidebarFilterChange = useCallback(
    (nextFilter: FilterType) => {
      setFilter(nextFilter);
      setSelectedTask(null);
    },
    [],
  );
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
    [addTask, showToast],
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

  return {
    // State
    tasks,
    filter,
    selectedTask,
    isSidebarCollapsed,
    isDarkMode,
    desktopFontSize,
    showSettings,
    isCommandPaletteOpen,
    searchQuery,
    searchPriority,
    searchProject,
    projects,
    userProfile,
    confirmDialog,
    statusMessage,
    undoAction,
    isStartupStatic,
    focusTimeLeft,
    isFocusActive,
    focusModeType,
    desktopAppVersion,
    desktopUpdateStatus,
    isCheckingDesktopUpdate,
    desktopPlatform,
    isDesktopMac,
    isDesktopRuntime,
    emptyState,
    showTaskInput,
    isRightSidebarOpen,
    taskCounts,
    filteredTasks,
    taskGroups,

    // Setters
    setTasks,
    setFilter,
    setSelectedTask,
    setIsSidebarCollapsed,
    setIsDarkMode,
    setDesktopFontSize,
    setShowSettings,
    setIsCommandPaletteOpen,
    setSearchQuery,
    setSearchPriority,
    setSearchProject,
    setConfirmDialog,
    setUserProfile,

    // Callbacks
    addTask,
    deleteTask,
    updateTask,
    performToggle,
    requestToggleTask,
    toggleThemeMode,
    showToast,
    clearAllLocalData,
    handleSidebarFilterChange,
    handleSidebarToggleCollapse,
    handleOpenSettings,
    createTaskFromCommand,
    openTaskFromCommand,
    addProject,
    deleteProject,
    handleImportData,

    // Focus Timer
    startTimer,
    pauseTimer,
    resetTimer,
    handleSetTimeLeft,
    handleFocusModeChange,
    resetFocusState,

    // Desktop Updater
    requestDesktopUpdateCheck,
    resetDesktopUpdaterState,
    runConfirmAction,

    // Internal
    taskTiebreakerRef,
    showSettingsRef,
    selectedTaskRef,
  };
}
