import { Priority } from '../types';
import { addDaysLocalIsoDate, todayLocalIsoDate } from './date';

interface ParsedTask {
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
// Negative lookbehind ensures we don't match "todayismy birthday" etc.
// Using (?<![a-zA-Z]) instead of \b for cross-browser compatibility
const DATE_STRIP_REGEX = /(?<![a-zA-Z])(today|tod|tomorrow|tmr|tom|next week)(?![a-zA-Z])/gi;

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

  // Date - use same negative lookbehind pattern for consistency
  const lowerText = text.toLowerCase();
  if (/(?<![a-zA-Z])(today|tod)(?![a-zA-Z])/i.test(lowerText)) {
    dueDate = todayLocalIsoDate();
    dateLabel = 'Today';
  } else if (/(?<![a-zA-Z])(tomorrow|tmr|tom)(?![a-zA-Z])/i.test(lowerText)) {
    dueDate = addDaysLocalIsoDate(1);
    dateLabel = 'Tomorrow';
  } else if (/(?<![a-zA-Z])(next week)(?![a-zA-Z])/i.test(lowerText)) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calculate days until next Monday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // If today is Monday (1), we want next Monday = 7 days later
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    dueDate = addDaysLocalIsoDate(daysUntilNextMonday);
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
