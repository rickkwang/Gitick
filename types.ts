
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: number; // Timestamp for heatmap
  priority: Priority;
  dueDate?: string; // ISO Date string YYYY-MM-DD
  tags: string[];
  list?: string; // Mapped to "Repository" concept
  subtasks: Subtask[];
  createdAt: number;
}

export type FilterType = 'all' | 'today' | 'next7days' | 'inbox' | 'completed' | 'focus' | string; // string allows for custom repo names

export interface UserProfile {
  name: string;
  email: string;
  jobTitle: string;
  avatarColor: string; // Tailwind color class or hex
  avatarImage?: string; // Data URL for custom avatar image
}
