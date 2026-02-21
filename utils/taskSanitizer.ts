import { Priority, Task } from '../types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPriority = (value: unknown): value is Priority =>
  value === Priority.HIGH || value === Priority.MEDIUM || value === Priority.LOW;

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeSubtasks = (value: unknown): Task['subtasks'] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((sub): Task['subtasks'][number] | null => {
      if (!sub || typeof sub !== 'object') return null;
      const rawSub = sub as Record<string, unknown>;
      const title = typeof rawSub.title === 'string' ? rawSub.title.trim() : '';
      if (!title) return null;

      return {
        id: typeof rawSub.id === 'string' && rawSub.id.trim() ? rawSub.id : createId(),
        title,
        completed: Boolean(rawSub.completed),
      };
    })
    .filter((sub): sub is Task['subtasks'][number] => sub !== null);
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
};

export const normalizeTask = (raw: unknown): Task | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return null;

  const completed = Boolean(item.completed);
  const createdAt =
    typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : Date.now();

  const completedAt =
    completed && typeof item.completedAt === 'number' && Number.isFinite(item.completedAt)
      ? item.completedAt
      : undefined;

  const dueDate = typeof item.dueDate === 'string' && ISO_DATE_RE.test(item.dueDate) ? item.dueDate : undefined;

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createId(),
    title,
    description: typeof item.description === 'string' ? item.description : '',
    completed,
    completedAt,
    priority: isPriority(item.priority) ? item.priority : Priority.MEDIUM,
    dueDate,
    tags: normalizeTags(item.tags),
    list: typeof item.list === 'string' && item.list.trim() ? item.list.trim() : 'Inbox',
    subtasks: normalizeSubtasks(item.subtasks),
    createdAt,
  };
};

export const sanitizeTaskList = (value: unknown): Task[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid format: Expected an array of tasks');
  }

  const seenIds = new Set<string>();

  return value
    .map(normalizeTask)
    .filter((task): task is Task => task !== null)
    .map((task) => {
      if (!seenIds.has(task.id)) {
        seenIds.add(task.id);
        return task;
      }
      const nextTask = { ...task, id: createId() };
      seenIds.add(nextTask.id);
      return nextTask;
    });
};
