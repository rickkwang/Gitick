/**
 * ID generation utilities with crypto fallback
 */

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const generateTaskId = () => generateId('task');
export const generateSubtaskId = () => generateId('subtask');
