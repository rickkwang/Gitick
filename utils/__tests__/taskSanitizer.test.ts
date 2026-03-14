import { Priority } from '../../types';
import { sanitizeTaskList } from '../taskSanitizer';

describe('taskSanitizer', () => {
  it('throws when input is not an array', () => {
    expect(() => sanitizeTaskList(null)).toThrow('Invalid format: Expected an array of tasks');
  });

  it('sanitizes tasks, trims values, and removes invalid records', () => {
    const result = sanitizeTaskList([
      {
        id: 'a',
        title: '  Task A  ',
        completed: false,
        priority: Priority.HIGH,
        dueDate: '2026-03-20',
        tags: [' Work ', 'work', '', 'Home'],
        list: '  Sprint  ',
        subtasks: [
          { id: 's1', title: ' sub ', completed: false },
          { id: '', title: '   ', completed: true },
        ],
        createdAt: 100,
      },
      {
        id: 'b',
        title: '   ',
        completed: false,
        priority: Priority.LOW,
        tags: [],
        subtasks: [],
        createdAt: 200,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'a',
      title: 'Task A',
      priority: Priority.HIGH,
      dueDate: '2026-03-20',
      tags: ['Work', 'Home'],
      list: 'Sprint',
    });
    expect(result[0].subtasks).toHaveLength(1);
    expect(result[0].subtasks[0].title).toBe('sub');
  });

  it('keeps IDs unique when duplicates exist', () => {
    const result = sanitizeTaskList([
      {
        id: 'dup',
        title: 'First',
        completed: false,
        priority: Priority.MEDIUM,
        tags: [],
        subtasks: [],
        createdAt: 1,
      },
      {
        id: 'dup',
        title: 'Second',
        completed: false,
        priority: Priority.MEDIUM,
        tags: [],
        subtasks: [],
        createdAt: 2,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });
});
