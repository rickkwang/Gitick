import { addDaysLocalIsoDate, todayLocalIsoDate } from './date';
import { FilterType, Priority, Task } from '../types';

const PRIORITY_SCORE: Record<Priority, number> = {
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
};

export type DashboardTaskGroups = {
  Overdue: Task[];
  Today: Task[];
  Tomorrow: Task[];
  'Next 7 Days': Task[];
};

export const getFilteredTasks = (
  tasks: Task[],
  filter: FilterType,
  projects: string[],
): Task[] => {
  const todayStr = todayLocalIsoDate();
  const next7daysStr = addDaysLocalIsoDate(7);

  let filtered = tasks;
  if (filter === 'completed') {
    filtered = filtered.filter((task) => task.completed);
  } else if (filter === 'next7days') {
    filtered = filtered.filter((task) => !task.completed && Boolean(task.dueDate) && task.dueDate <= next7daysStr);
  } else if (filter === 'today') {
    filtered = filtered.filter((task) => !task.completed && task.dueDate === todayStr);
  } else if (filter === 'inbox') {
    filtered = filtered.filter((task) => !task.completed && (task.list === 'Inbox' || !task.list));
  } else if (projects.includes(filter)) {
    filtered = filtered.filter((task) => task.list === filter && !task.completed);
  } else {
    filtered = filtered.filter((task) => !task.completed);
  }

  return [...filtered].sort((taskA, taskB) => {
    if (taskA.completed !== taskB.completed) return taskA.completed ? 1 : -1;

    const scoreA = PRIORITY_SCORE[taskA.priority];
    const scoreB = PRIORITY_SCORE[taskB.priority];
    if (scoreA !== scoreB) return scoreB - scoreA;

    if (taskA.dueDate && taskB.dueDate) {
      return taskA.dueDate.localeCompare(taskB.dueDate);
    }
    if (taskA.dueDate && !taskB.dueDate) return -1;
    if (!taskA.dueDate && taskB.dueDate) return 1;

    return taskB.createdAt - taskA.createdAt;
  });
};

export const groupDashboardTasks = (tasks: Task[]): DashboardTaskGroups => {
  const todayStr = todayLocalIsoDate();
  const tomorrowStr = addDaysLocalIsoDate(1);

  const groups: DashboardTaskGroups = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    'Next 7 Days': [],
  };

  tasks.forEach((task) => {
    if (task.dueDate && task.dueDate < todayStr) {
      groups.Overdue.push(task);
      return;
    }
    if (task.dueDate && task.dueDate === todayStr) {
      groups.Today.push(task);
      return;
    }
    if (task.dueDate && task.dueDate === tomorrowStr) {
      groups.Tomorrow.push(task);
      return;
    }
    groups['Next 7 Days'].push(task);
  });

  return groups;
};

export const getTaskCounts = (tasks: Task[], projects: string[]): Record<string, number> => {
  const todayStr = todayLocalIsoDate();
  const next7daysStr = addDaysLocalIsoDate(7);

  const counts: Record<string, number> = {
    inbox: 0,
    today: 0,
    next7days: 0,
  };

  projects.forEach((projectName) => {
    counts[projectName] = 0;
  });

  tasks.forEach((task) => {
    if (task.completed) return;

    if (task.list === 'Inbox' || !task.list) {
      counts.inbox += 1;
    }

    if (task.dueDate === todayStr) {
      counts.today += 1;
    }

    if (task.dueDate && task.dueDate <= next7daysStr) {
      counts.next7days += 1;
    }

    if (task.list && Object.prototype.hasOwnProperty.call(counts, task.list)) {
      counts[task.list] += 1;
    }
  });

  return counts;
};

export const getFilterBreadcrumb = (filter: FilterType): string => {
  switch (filter) {
    case 'next7days':
      return '~/dashboard';
    case 'today':
      return '~/plan/today';
    case 'completed':
      return '~/repository/history';
    case 'inbox':
      return '~/inbox';
    case 'focus':
      return '~/terminal/focus';
    default:
      return `~/projects/${filter.toLowerCase()}`;
  }
};

export const searchTasks = (tasks: Task[], searchQuery: string): Task[] => {
  const keyword = searchQuery.trim().toLowerCase();
  if (!keyword) return [];

  return tasks.filter((task) => {
    const inTitle = task.title.toLowerCase().includes(keyword);
    const inTags = task.tags.some((tag) => tag.toLowerCase().includes(keyword));
    return inTitle || inTags;
  });
};
