import { Priority } from '../types';
import { addDaysLocalIsoDate, todayLocalIsoDate } from './date';

export interface ParsedTask {
  title: string;
  cleanTitle: string;
  priority?: Priority;
  tags: string[];
  dueDate?: string;
  dateLabel?: string;
  projectFound?: string;
}

const PRIORITY_REGEX = /!(high|medium|low)/i;
const TAG_REGEX = /#([^\s#@!]+)/gu;
const PROJECT_REGEX = /@([^\s#@!]+)/iu;
const PROJECT_TOKEN_REGEX = /@([^\s#@!]+)/gu;
const DATE_STRIP_REGEX = /\b(today|tod|tomorrow|tmr|tom|next week)\b/gi;

export const parseTaskInput = (text: string, projects: string[] = []): ParsedTask => {
  let priority: Priority | undefined;
  let tags: string[] = [];
  let dueDate: string | undefined;
  let dateLabel: string | undefined;

  // Priority
  const priorityMatch = text.match(PRIORITY_REGEX);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as Priority;
  }

  // Tags
  const tagMatches = Array.from(text.matchAll(TAG_REGEX));
  if (tagMatches.length > 0) {
    tags = Array.from(new Set(tagMatches.map((m) => m[1].trim()).filter(Boolean)));
  }

  // Project
  let projectFound: string | undefined;
  const projectMatch = text.match(PROJECT_REGEX);
  if (projectMatch) {
    const pName = projectMatch[1];
    projectFound = projects.find((p) => p.toLowerCase() === pName.toLowerCase());
  }

  // Date
  const lowerText = text.toLowerCase();
  if (/\b(today|tod)\b/.test(lowerText)) {
    dueDate = todayLocalIsoDate();
    dateLabel = 'Today';
  } else if (/\b(tomorrow|tmr|tom)\b/.test(lowerText)) {
    dueDate = addDaysLocalIsoDate(1);
    dateLabel = 'Tomorrow';
  } else if (/\b(next week)\b/.test(lowerText)) {
    const today = new Date();
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    const diffDays = Math.round((nextMon.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    dueDate = addDaysLocalIsoDate(diffDays);
    dateLabel = 'Next Week';
  }

  // Clean title (strip tokens)
  const cleanTitle = text
    .replace(PRIORITY_REGEX, '')
    .replace(TAG_REGEX, '')
    .replace(PROJECT_TOKEN_REGEX, '')
    .replace(DATE_STRIP_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: text, cleanTitle, priority, tags, dueDate, dateLabel, projectFound };
};
