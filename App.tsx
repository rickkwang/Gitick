import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { StagingPanel } from './components/StagingPanel';
import { FocusMode } from './components/FocusMode';
import { Heatmap } from './components/Heatmap';
import { GitGraph } from './components/GitGraph';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { Task, FilterType, UserProfile, Priority } from './types';
import { Icons, PROJECTS as DEFAULT_PROJECTS } from './constants';
import {
  getRuntimePlatform,
  initNativeAppShell,
  isNativePlatform,
  registerAndroidBackButton,
  syncStatusBarWithTheme,
} from './services/nativeApp';

// --- ONBOARDING DATA ---
const ONBOARDING_TASKS: Task[] = [
  {
    id: 'welcome-1',
    title: 'Welcome to Gitick! 👋 Start here.',
    description: 'Gitick is a minimalist task manager inspired by Git and TickTick. \n\nFeatures:\n- Local-first (Privacy focused)\n- Smart text parsing\n- Focus timer\n- Git-style contribution graph',
    completed: false,
    priority: Priority.HIGH,
    tags: ['welcome', 'guide'],
    list: 'Inbox',
    subtasks: [
      { id: 'sub-1', title: 'Click this task to see details', completed: true },
      { id: 'sub-2', title: 'Try completing this subtask', completed: false },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'welcome-2',
    title: 'Try Smart Parsing: Type "!high #demo today"',
    description: 'When adding a task, try typing:\n\n"Buy coffee !high #life today"\n\nIt will automatically set the priority, tag, and due date.',
    completed: false,
    priority: Priority.MEDIUM,
    tags: ['feature', 'smart-syntax'],
    list: 'Inbox',
    subtasks: [],
    createdAt: Date.now() - 1000,
  },
  {
    id: 'welcome-3',
    title: 'Explore Focus Mode 🍅',
    description: 'Click the "Focus Mode" in the sidebar to start a Pomodoro timer.',
    completed: false,
    priority: Priority.LOW,
    tags: ['productivity'],
    list: 'Study',
    subtasks: [],
    createdAt: Date.now() - 2000,
  }
];

// --- SOUND UTILS ---
// Simple synthesized "Pop" sound to avoid external assets failing
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Slide up to A5
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

const App: React.FC = () => {
  // Helper for lazy state initialization from localStorage
  const loadState = <T,>(key: string, fallback: T | null): T => {
    if (typeof window === 'undefined') return fallback as T;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.error(`Error loading ${key}`, e);
      return fallback as T;
    }
  };

  // Helper for Local Date String (Fixes Timezone Bugs)
  const getLocalDateStr = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const getLocalTodayStr = () => getLocalDateStr(new Date());

  // Initialize tasks with Onboarding data if localStorage is empty
  const [tasks, setTasks] = useState<Task[]>(() => {
     const saved = loadState<Task[]>('zendo-tasks', null);
     return saved !== null ? saved : ONBOARDING_TASKS;
  });

  const [filter, setFilter] = useState<FilterType>('next7days');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => loadState('zendo-sidebar-collapsed', true)); // Desktop collapse

  // Right Sidebar Toggle State - Default to closed
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
     if (typeof window === 'undefined') return false;
     const saved = localStorage.getItem('zendo-theme');
     if (saved) return saved === 'dark';
     return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const nativeApp = isNativePlatform();
  const runtimePlatform = getRuntimePlatform();
  const desktopPlatform = typeof window !== 'undefined' ? window.gitickDesktop?.platform : undefined;
  const isDesktopMac = desktopPlatform === 'darwin';
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.gitickDesktop?.updater);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [isStandaloneInstalled, setIsStandaloneInstalled] = useState(() => {
    if (typeof window === 'undefined') return nativeApp;
    const standaloneNavigator = window.navigator as StandaloneNavigator;
    return (
      nativeApp ||
      window.matchMedia('(display-mode: standalone)').matches ||
      standaloneNavigator.standalone === true
    );
  });
  
  // Projects State
  const [projects, setProjects] = useState<string[]>(() => loadState('zendo-projects', DEFAULT_PROJECTS));
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadState('zendo-profile', {
    name: 'User',
    email: 'user@gitick.app',
    jobTitle: 'Productivity Master',
    avatarColor: 'bg-zinc-900'
  }));
  
  // Search / Command Palette State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Undo / Toast State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | undefined>(undefined);
  const toastTimeoutRef = useRef<number | null>(null);
  const desktopUpdateUserFlowRef = useRef(false);
  const manualDesktopCheckRef = useRef(false);
  const desktopUpdaterSignalRef = useRef(false);
  const [desktopAppVersion, setDesktopAppVersion] = useState('');
  const [desktopUpdateStatus, setDesktopUpdateStatus] = useState('');
  const [isCheckingDesktopUpdate, setIsCheckingDesktopUpdate] = useState(false);
  const [isStartupStatic, setIsStartupStatic] = useState(() => typeof window !== 'undefined');
  
  // --- GLOBAL FOCUS TIMER STATE ---
  const [focusEndTime, setFocusEndTime] = useState<number | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [focusModeType, setFocusModeType] = useState<'focus' | 'break'>('focus');
  const [initialFocusDuration, setInitialFocusDuration] = useState(25 * 60);

  // Helper: Format Time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Start Timer Logic
  const startTimer = () => {
     const now = Date.now();
     const end = now + (focusTimeLeft * 1000);
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

  // Timer Tick Effect (High Precision)
  useEffect(() => {
    let interval: number | null = null;

    if (isFocusActive && focusEndTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((focusEndTime - now) / 1000);
        
        if (diff <= 0) {
           // Finished
           setFocusTimeLeft(0);
           setIsFocusActive(false);
           setFocusEndTime(null);
           
           document.title = "Gitick - Done!";
           const msg = `${focusModeType === 'focus' ? 'Focus session' : 'Break'} finished!`;
           showToast(msg);
           playSuccessSound();
           
           if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
             new Notification("Gitick Timer", { body: msg, icon: '/favicon.ico' });
           }
        } else {
           setFocusTimeLeft(diff);
           document.title = `${formatTime(diff)} - ${focusModeType === 'focus' ? 'Focus' : 'Break'}`;
        }
      }, 500); 
    } else {
      document.title = "Gitick - Minimalist Tasks";
    }

    return () => { 
      if (interval) clearInterval(interval); 
    };
  }, [isFocusActive, focusEndTime, focusModeType]);

  // Handle Focus Mode UI Updates (Wrapping the logic for the component)
  const handleSetTimeLeft = (val: number | ((prev: number) => number)) => {
      if (typeof val === 'function') {
          setFocusTimeLeft(prev => {
              const newVal = val(prev);
              setInitialFocusDuration(newVal);
              return newVal;
          });
      } else {
          setFocusTimeLeft(val);
          setInitialFocusDuration(val);
      }
  };

  const handleSetIsActive = (val: boolean | ((prev: boolean) => boolean)) => {
      const shouldBeActive = typeof val === 'function' ? val(isFocusActive) : val;
      if (shouldBeActive) {
          startTimer();
      } else {
          pauseTimer();
      }
  };

  useEffect(() => {
    void initNativeAppShell();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneNavigator = window.navigator as StandaloneNavigator;
    const media = window.matchMedia('(display-mode: standalone)');
    const updateStandalone = () => {
      setIsStandaloneInstalled(
        nativeApp || media.matches || standaloneNavigator.standalone === true,
      );
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      const installPromptEvent = event as DeferredInstallPromptEvent;
      installPromptEvent.preventDefault();
      setDeferredInstallPrompt(installPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredInstallPrompt(null);
      updateStandalone();
    };

    updateStandalone();
    media.addEventListener?.('change', updateStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      media.removeEventListener?.('change', updateStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [nativeApp]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('zendo-tasks', JSON.stringify(tasks));
  }, [tasks]);
  
  useEffect(() => {
      localStorage.setItem('zendo-projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('zendo-profile', JSON.stringify(userProfile));
  }, [userProfile]);
  
  useEffect(() => {
    localStorage.setItem('zendo-sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('zendo-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    void syncStatusBarWithTheme(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (selectedTask) {
      setIsRightSidebarOpen(true);
    } else {
      setIsRightSidebarOpen(false);
    }
  }, [selectedTask]);

  // --- Actions ---

  const showToast = (message: string, action?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setStatusMessage(message);
    setUndoAction(() => action);
    toastTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      setUndoAction(undefined);
    }, 4000);
  };

  const getFriendlyUpdateError = (raw: string, reason?: string) => {
    const message = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedReason = (reason ?? '').trim().toLowerCase();
    if (normalizedReason === 'not-in-applications' || message.includes('/applications') || message.includes('not-in-applications')) {
      return 'Please move Gitick.app to /Applications, then retry in-app update.';
    }
    if (normalizedReason === 'user-cancelled') {
      return 'Move was canceled. Please move Gitick.app to /Applications and retry.';
    }
    if (normalizedReason === 'move-failed') {
      return 'Unable to move Gitick.app to /Applications. Please move it manually, then retry.';
    }
    if (message.includes('zip file not provided') || message.includes('err_updater_zip_file_not_found')) {
      return 'Release assets are incomplete (missing .zip update package). Please republish this version.';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('econn')) {
      return 'Update failed due to network issue. Please try again later.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Update metadata is not available yet. Please retry shortly.';
    }
    return 'Update failed. Please try again later.';
  };

  const finishDesktopUpdateFlow = () => {
    desktopUpdateUserFlowRef.current = false;
    manualDesktopCheckRef.current = false;
    setIsCheckingDesktopUpdate(false);
  };

  const tryMoveDesktopAppToApplications = async () => {
    if (!window.gitickDesktop?.updater?.moveToApplications) {
      const friendly = getFriendlyUpdateError('move failed', 'move-failed');
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    }

    try {
      const result = await window.gitickDesktop.updater.moveToApplications();
      if (result.ok) {
        setDesktopUpdateStatus('Moving Gitick.app to /Applications and relaunching...');
        showToast('Moving Gitick.app to /Applications...');
        return true;
      }

      const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'move failed', result.reason);
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    } catch (error) {
      console.warn('Move to /Applications failed:', error);
      const friendly = getFriendlyUpdateError('move failed', 'move-failed');
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    }
  };

  const requestDesktopUpdateCheck = async () => {
    if (!window.gitickDesktop?.updater) return;
    manualDesktopCheckRef.current = true;
    setIsCheckingDesktopUpdate(true);
    setDesktopUpdateStatus('Checking for updates...');
    try {
      const result = await window.gitickDesktop.updater.checkForUpdates();
      if (result.reason === 'in-progress') {
        setDesktopUpdateStatus('Update check already in progress...');
      }
    } catch (error) {
      console.warn('Manual update check failed:', error);
      setDesktopUpdateStatus('Unable to check updates right now.');
      showToast('Unable to check updates right now.');
      manualDesktopCheckRef.current = false;
      setIsCheckingDesktopUpdate(false);
    }
  };

  const requestInstallApp = async () => {
    if (nativeApp) {
      showToast('Running as native app');
      return true;
    }

    if (isStandaloneInstalled) {
      showToast('App already installed');
      return true;
    }

    if (!deferredInstallPrompt) {
      showToast('Install entry unavailable. Use browser menu.');
      return false;
    }

    try {
      await deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Install started');
      } else {
        showToast('Install canceled');
      }
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed', error);
      showToast('Install failed');
      return false;
    } finally {
      setDeferredInstallPrompt(null);
    }
  };

  useEffect(() => {
    if (!isDesktopRuntime || !window.gitickDesktop?.updater) return;

    const updater = window.gitickDesktop.updater;
    void updater.getVersion().then((version) => setDesktopAppVersion(version)).catch(() => undefined);
    desktopUpdaterSignalRef.current = false;

    const removeListener = updater.onStatus((payload) => {
      desktopUpdaterSignalRef.current = true;

      if (payload.type === 'checking') {
        setIsCheckingDesktopUpdate(true);
        setDesktopUpdateStatus('Checking for updates...');
      }

      if (payload.type === 'available') {
        setDesktopUpdateStatus(`Update ${payload.version ?? ''} is available.`.trim());
        const ok = window.confirm(`New version ${payload.version ?? ''} is available. Download now?`.trim());
        if (ok) {
          desktopUpdateUserFlowRef.current = true;
          setDesktopUpdateStatus('Downloading update...');
          void updater.downloadUpdate()
            .then((result) => {
              if (!result.ok) {
                const friendly = getFriendlyUpdateError(result.reason ?? 'download failed', result.reason);
                setDesktopUpdateStatus(friendly);
                showToast(friendly);
                finishDesktopUpdateFlow();
              }
            })
            .catch((error) => {
              console.warn('Download update call failed:', error);
              const friendly = getFriendlyUpdateError('download failed');
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
              finishDesktopUpdateFlow();
            });
        } else {
          setIsCheckingDesktopUpdate(false);
        }
      }

      if (payload.type === 'download-progress' && payload.percent % 25 === 0) {
        setDesktopUpdateStatus(`Downloading... ${payload.percent}%`);
        showToast(`Downloading update... ${payload.percent}%`);
      }

      if (payload.type === 'downloaded') {
        setDesktopUpdateStatus(`Update ${payload.version ?? ''} downloaded. Restart to install.`.trim());
        const restartNow = window.confirm(`Version ${payload.version ?? ''} is ready. Restart now to install?`.trim());
        if (restartNow) {
          desktopUpdateUserFlowRef.current = true;
          void updater.quitAndInstall()
            .then(async (result) => {
              if (result.ok) {
                return;
              }

              if (result.reason === 'not-in-applications') {
                const moveNow = window.confirm('Gitick.app must be in /Applications for in-app update. Move it now?');
                if (moveNow) {
                  await tryMoveDesktopAppToApplications();
                  return;
                }
              }

              const friendly = getFriendlyUpdateError(result.reason ?? 'install failed', result.reason);
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
            })
            .catch((error) => {
              console.warn('Install update call failed:', error);
              const friendly = getFriendlyUpdateError('install failed');
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
            })
            .finally(() => {
              finishDesktopUpdateFlow();
            });
        } else {
          showToast('Update downloaded. It will install when you restart the app.');
          finishDesktopUpdateFlow();
        }
      }

      if (payload.type === 'not-available') {
        setDesktopUpdateStatus('You are using the latest version.');
        if (manualDesktopCheckRef.current) {
          showToast('You are already on the latest version.');
        }
        manualDesktopCheckRef.current = false;
        setIsCheckingDesktopUpdate(false);
      }

      if (payload.type === 'error') {
        const friendly = getFriendlyUpdateError(payload.message);
        setDesktopUpdateStatus(friendly);
        if (desktopUpdateUserFlowRef.current) {
          showToast(friendly);
        } else if (manualDesktopCheckRef.current) {
          showToast('Unable to check updates right now.');
        } else {
          console.warn('Background update check failed:', payload.message);
        }
        finishDesktopUpdateFlow();
      }
    });

    const runCheck = async () => {
      try {
        const result = await updater.checkForUpdates();
        if (result.reason === 'in-progress') {
          setDesktopUpdateStatus('Checking for updates...');
        }
      } catch (error) {
        console.warn('Background update check call failed:', error);
        setDesktopUpdateStatus('Unable to check updates right now.');
        setIsCheckingDesktopUpdate(false);
      }
    };

    const initialTimer = window.setTimeout(() => {
      setIsCheckingDesktopUpdate(true);
      void runCheck();
    }, 1200);

    const retryTimer = window.setTimeout(() => {
      if (!desktopUpdaterSignalRef.current) {
        setIsCheckingDesktopUpdate(true);
        void runCheck();
      }
    }, 10000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(retryTimer);
      removeListener();
    };
  }, [isDesktopRuntime]);

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
      if (tasksToMove.length > 0) {
        setTasks(prev => prev.map(t => t.list === projectToDelete ? { ...t, list: 'Inbox' } : t));
        showToast(`Deleted "${projectToDelete}". ${tasksToMove.length} tasks moved to Inbox.`, () => {
           setProjects(prevProjects);
           setTasks(prev => prev.map(t => tasksToMove.find(tm => tm.id === t.id) ? { ...t, list: projectToDelete } : t));
           setStatusMessage(null);
           setUndoAction(undefined);
        });
      } else {
         showToast(`Project "${projectToDelete}" deleted`, () => {
             setProjects(prevProjects);
             setStatusMessage(null);
             setUndoAction(undefined);
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

  const requestToggleTask = (task: Task) => {
    performToggle(task.id);
  };

  const performToggle = (id: string) => {
    const now = Date.now();
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      playSuccessSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }

    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? now : undefined } : t
    ));
    
    if (selectedTask?.id === id) {
       setSelectedTask(prev => prev ? {...prev, completed: !prev.completed, completedAt: !prev.completed ? now : undefined} : null);
    }
  };

  const updateTask = (updatedTask: Task) => {
     if (updatedTask.completed && !updatedTask.completedAt) {
       updatedTask.completedAt = Date.now();
     }
     setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
     setSelectedTask(updatedTask);
  };

  const deleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);

    showToast(`Deleted "${taskToDelete.title}"`, () => {
       setTasks(prev => [taskToDelete, ...prev]);
       setStatusMessage(null);
       setUndoAction(undefined);
    });
  };

  const handleImportData = (importedTasks: Task[]) => {
      setTasks(importedTasks);
      const usedProjects = Array.from(new Set(importedTasks.map(t => t.list).filter(Boolean))) as string[];
      const mergedProjects = Array.from(new Set([...DEFAULT_PROJECTS, ...usedProjects])).filter(p => p !== 'Inbox');
      setProjects(mergedProjects);
      showToast(`${importedTasks.length} tasks imported`);
  };

  // --- Filter & Sorting Logic ---
  const filteredTasks = useMemo(() => {
    const todayStr = getLocalTodayStr();
    
    // Base Filtering
    let filtered = tasks;

    if (filter === 'completed') {
       filtered = filtered.filter(t => t.completed);
    } else if (filter === 'next7days') {
       filtered = filtered.filter(t => !t.completed);
    } else if (filter === 'today') {
      filtered = filtered.filter(t => !t.completed && t.dueDate === todayStr);
    } else if (filter === 'inbox') {
      filtered = filtered.filter(t => !t.completed && (t.list === 'Inbox' || !t.list));
    } else if (projects.includes(filter)) {
       filtered = filtered.filter(t => t.list === filter && !t.completed);
    } else {
       filtered = filtered.filter(t => !t.completed);
    }

    // Advanced Sorting
    return [...filtered].sort((a, b) => {
        // 1. Completion check
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        // 2. Priority Logic (High = 3, Med = 2, Low = 1)
        const pScore = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
        const scoreA = pScore[a.priority];
        const scoreB = pScore[b.priority];
        if (scoreA !== scoreB) return scoreB - scoreA; // Descending priority

        // 3. Due Date Logic (Overdue at top)
        if (a.dueDate && b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate && !b.dueDate) return -1; // Date first
        if (!a.dueDate && b.dueDate) return 1;

        // 4. Creation Date
        return b.createdAt - a.createdAt;
    });
  }, [filter, projects, tasks]);

  // --- Grouping Logic for "TickTick" style Dashboard ---
  const taskGroups = useMemo(() => {
    if (filter !== 'next7days') return null;

    const todayStr = getLocalTodayStr();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tmrStr = getLocalDateStr(d);

    const groups: { [key: string]: Task[] } = {
        'Overdue': [],
        'Today': [],
        'Tomorrow': [],
        'Later': [],
        'No Date': []
    };

    filteredTasks.forEach(t => {
        if (!t.dueDate) {
            groups['No Date'].push(t);
        } else if (t.dueDate < todayStr) {
            groups['Overdue'].push(t);
        } else if (t.dueDate === todayStr) {
            groups['Today'].push(t);
        } else if (t.dueDate === tmrStr) {
            groups['Tomorrow'].push(t);
        } else {
            groups['Later'].push(t);
        }
    });

    return groups;
  }, [filteredTasks, filter]);


  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const active = tasks.filter((t) => !t.completed);
    counts['inbox'] = active.filter((t) => t.list === 'Inbox' || !t.list).length;
    const todayStr = getLocalTodayStr();
    counts['today'] = active.filter((t) => t.dueDate === todayStr).length;
    counts['next7days'] = active.length;
    projects.forEach((projectName) => {
      counts[projectName] = active.filter((t) => t.list === projectName).length;
    });
    return counts;
  }, [projects, tasks]);

  const getBreadcrumb = () => {
    switch(filter) {
      case 'next7days': return '~/dashboard';
      case 'today': return '~/plan/today';
      case 'completed': return '~/repository/history';
      case 'inbox': return '~/inbox';
      case 'focus': return '~/terminal/focus';
      default: return `~/projects/${filter.toLowerCase()}`;
    }
  };
  
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
  const searchResults = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return [];
    return tasks.filter((task) => {
      const inTitle = task.title.toLowerCase().includes(keyword);
      const inTags = task.tags.some((tag) => tag.toLowerCase().includes(keyword));
      return inTitle || inTags;
    });
  }, [searchQuery, tasks]);

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
        setShowSearch(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }
      if (e.key === 'Escape') {
        if (showSearch) { setShowSearch(false); setSearchQuery(''); }
        else if (showSettings) setShowSettings(false);
        else if (selectedTask) setSelectedTask(null);
        else if (isRightSidebarOpen) setIsRightSidebarOpen(false);
        else if (isSidebarOpen) setIsSidebarOpen(false);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, selectedTask, isSidebarOpen, isRightSidebarOpen, showSearch]);

  const handleAndroidBack = useCallback(
    (_canGoBack: boolean) => {
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        return true;
      }
      if (showSettings) {
        setShowSettings(false);
        return true;
      }
      if (selectedTask) {
        setSelectedTask(null);
        return true;
      }
      if (isRightSidebarOpen) {
        setIsRightSidebarOpen(false);
        return true;
      }
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        return true;
      }
      return false;
    },
    [isRightSidebarOpen, isSidebarOpen, selectedTask, showSearch, showSettings],
  );

  useEffect(() => registerAndroidBackButton(handleAndroidBack), [handleAndroidBack]);

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
              <div className={`sticky top-0 bg-gray-50/92 dark:bg-zinc-900/92 backdrop-blur-md z-10 py-3 mb-2 border-b border-gray-200/60 dark:border-zinc-800/80 flex items-center gap-3 transition-colors ${headerClass} px-5 md:px-6`}>
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
      className={`flex flex-col h-dvh font-sans text-gray-900 dark:text-dark-text bg-white dark:bg-zinc-950 overflow-hidden transition-colors duration-300 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black ${
        isDesktopMac ? 'pt-10' : ''
      } ${isStartupStatic ? 'startup-static' : ''}`}
    > 
      {isDesktopMac && (
        <div
          className="fixed top-0 left-0 right-0 z-[120] h-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Header with Safe Area Padding */}
      <header className="md:hidden bg-white/95 dark:bg-zinc-950/95 border-b border-gray-100 dark:border-zinc-800 shrink-0 z-50 pt-safe backdrop-blur-sm transition-colors duration-300">
         <div className="h-14 flex items-center px-4 justify-between">
            <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="text-black dark:text-white p-1">
                 <Icons.Menu />
               </button>
               <span className="font-bold text-black dark:text-white tracking-tight">Gitick</span>
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
          onFilterChange={(f) => { setFilter(f); setSelectedTask(null); }} 
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onCloseMobile={() => setIsSidebarOpen(false)}
          taskCounts={taskCounts}
          onOpenSettings={() => setShowSettings(true)}
          isFocusActive={isFocusActive}
          focusTimeLeft={focusTimeLeft}
          projects={projects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          userProfile={userProfile}
          isDesktopMac={isDesktopMac}
        />

        {/* COL 2: Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 relative z-0 transition-colors duration-300">
           
           <div key={filter} className="h-full flex flex-col">
             
             {filter === 'focus' ? (
               <FocusMode 
                 timeLeft={focusTimeLeft}
                 setTimeLeft={handleSetTimeLeft}
                 isActive={isFocusActive}
                 setIsActive={handleSetIsActive}
                 mode={focusModeType}
                 setMode={setFocusModeType}
               />
             ) : (
               <div className="flex-1 flex flex-col h-full relative">
                  
                  {/* Working Dir Header (Desktop Only) */}
                  <div className="hidden md:flex h-16 items-center justify-between px-8 shrink-0 bg-gray-50/85 dark:bg-zinc-900/85 border-b border-gray-200/70 dark:border-zinc-800/80 backdrop-blur-sm z-10 transition-colors duration-300">
                     <div className="flex items-center gap-2 text-sm font-mono text-gray-500 dark:text-zinc-500">
                        <Icons.Folder />
                        <span className="truncate tracking-tight font-medium text-black dark:text-white opacity-70">{getBreadcrumb()}</span>
                     </div>
                     <div className="flex items-center gap-4">
                        {isFocusActive && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-black dark:bg-white rounded-full text-white dark:text-black shadow-lg shadow-black/10 animate-pulse">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Focus</span>
                                <span className="font-mono text-xs font-bold">{formatTime(focusTimeLeft)}</span>
                            </div>
                        )}

                        {/* Search Trigger (Refined) */}
                        <button 
                          onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
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
                      <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-6 md:py-8">
                          
                          {/* Heatmap Section */}
                          {filter === 'next7days' && (
                             <div className="mb-10">
                                <div className="p-6 bg-white/96 dark:bg-zinc-900/70 rounded-[24px] shadow-sm border border-gray-200/80 dark:border-zinc-800/80">
                                   <div className="flex items-center justify-between mb-5">
                                      <div className="flex items-center gap-2">
                                         <Icons.Flame />
                                         <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Contribution Graph</h3>
                                      </div>
                                      <div className="text-[10px] font-mono text-gray-400">
                                         Activity Log
                                      </div>
                                   </div>
                                   <Heatmap tasks={tasks} />
                                </div>
                             </div>
                          )}
                          
                          {/* LIST RENDERING */}
                          {filter === 'completed' ? (
                             <GitGraph tasks={filteredTasks} />
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
                                        {renderTaskList(taskGroups['Later'], 'Later')}
                                        {renderTaskList(taskGroups['No Date'], 'No Date')}
                                    </>
                                  )
                              ) : (
                                  /* Flat List for other views */
                                  filteredTasks.length > 0 ? (
                                    <div className="space-y-3">
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
                        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-50/95 via-gray-50/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80" />

                        {/* Input Container - Padded from bottom including Safe Area */}
                        <div className="relative z-10 w-full flex justify-center px-4 pt-10 pb-safe">
                           <div className="max-w-3xl w-full pointer-events-auto mb-3">
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
             hidden lg:flex flex-col h-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm overflow-hidden border-l border-gray-200/70 dark:border-zinc-800/80
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
                    setIsRightSidebarOpen(false);
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

      {/* --- BOTTOM STATUS BAR (Desktop Only) --- */}
      <div className="hidden md:block">
        <StatusBar 
          message={statusMessage}
          onUndo={undoAction}
          activeFilter={filter}
          taskCount={tasks.length}
          isFocusActive={isFocusActive}
          focusTimeLeft={focusTimeLeft}
        />
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
                  <button onClick={() => setShowSearch(false)} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
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
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          userProfile={userProfile}
          onUpdateProfile={setUserProfile}
          tasks={tasks}
          onImportData={handleImportData}
          onClearData={() => setTasks([])}
          isNativeApp={nativeApp}
          runtimePlatform={runtimePlatform}
          isStandaloneInstalled={isStandaloneInstalled}
          canInstallApp={Boolean(deferredInstallPrompt)}
          onRequestInstallApp={requestInstallApp}
          desktopAppVersion={desktopAppVersion}
          canCheckDesktopUpdate={isDesktopRuntime}
          desktopUpdateStatus={desktopUpdateStatus}
          isCheckingDesktopUpdate={isCheckingDesktopUpdate}
          onCheckDesktopUpdate={requestDesktopUpdateCheck}
        />
      )}

    </div>
  );
};

export default App;
