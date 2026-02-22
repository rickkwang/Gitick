import { Priority, Task, UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  email: 'user@gitick.app',
  jobTitle: 'Productivity Master',
  avatarColor: 'bg-zinc-900',
  avatarImage: '',
};

export const createOnboardingTasks = (now = Date.now()): Task[] => [
  {
    id: 'welcome-1',
    title: 'Welcome to Gitick! 👋 Start here.',
    description:
      'Gitick is a minimalist task manager inspired by Git and TickTick. \n\nFeatures:\n- Local-first (Privacy focused)\n- Smart text parsing\n- Focus timer\n- Git-style contribution graph',
    completed: false,
    priority: Priority.HIGH,
    tags: ['welcome', 'guide'],
    list: 'Inbox',
    subtasks: [
      { id: 'sub-1', title: 'Click this task to see details', completed: true },
      { id: 'sub-2', title: 'Try completing this subtask', completed: false },
    ],
    createdAt: now,
  },
  {
    id: 'welcome-2',
    title: 'Try Smart Parsing: Type "!high #demo today"',
    description:
      'When adding a task, try typing:\n\n"Buy coffee !high #life today"\n\nIt will automatically set the priority, tag, and due date.',
    completed: false,
    priority: Priority.MEDIUM,
    tags: ['feature', 'smart-syntax'],
    list: 'Inbox',
    subtasks: [],
    createdAt: now - 1000,
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
    createdAt: now - 2000,
  },
];
