import { Priority, Task } from '../../types';
import { addDaysLocalIsoDate, todayLocalIsoDate } from '../date';
import { getFilteredTasks, getTaskCounts, groupDashboardTasks, searchTasks } from '../taskView';

const makeTask = (overrides: Partial<Task>): Task => ({
  id: 'id',
  title: 'Task',
  completed: false,
  priority: Priority.MEDIUM,
  tags: [],
  subtasks: [],
  createdAt: 1,
  ...overrides,
});

describe('taskView', () => {
  it('filters today tasks correctly', () => {
    const today = todayLocalIsoDate();
    const tasks = [
      makeTask({ id: '1', title: 'today', dueDate: today }),
      makeTask({ id: '2', title: 'later', dueDate: addDaysLocalIsoDate(5) }),
      makeTask({ id: '3', title: 'done', dueDate: today, completed: true }),
    ];

    const result = getFilteredTasks(tasks, 'today', ['Work']);
    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('sorts by completion, priority, dueDate, createdAt', () => {
    const today = todayLocalIsoDate();
    const tasks = [
      makeTask({ id: 'low', priority: Priority.LOW, createdAt: 10 }),
      makeTask({ id: 'high', priority: Priority.HIGH, createdAt: 5 }),
      makeTask({ id: 'due', priority: Priority.MEDIUM, dueDate: today, createdAt: 1 }),
    ];

    const result = getFilteredTasks(tasks, 'all', ['Work']);
    expect(result.map((t) => t.id)).toEqual(['high', 'due', 'low']);
  });

  it('groups dashboard tasks by due date buckets', () => {
    const today = todayLocalIsoDate();
    const tomorrow = addDaysLocalIsoDate(1);
    const tasks = [
      makeTask({ id: 'overdue', dueDate: addDaysLocalIsoDate(-1) }),
      makeTask({ id: 'today', dueDate: today }),
      makeTask({ id: 'tomorrow', dueDate: tomorrow }),
      makeTask({ id: 'next', dueDate: addDaysLocalIsoDate(5) }),
    ];

    const groups = groupDashboardTasks(tasks);
    expect(groups.Overdue.map((t) => t.id)).toEqual(['overdue']);
    expect(groups.Today.map((t) => t.id)).toEqual(['today']);
    expect(groups.Tomorrow.map((t) => t.id)).toEqual(['tomorrow']);
    expect(groups['Next 7 Days'].map((t) => t.id)).toEqual(['next']);
  });

  it('computes task counts and search results', () => {
    const today = todayLocalIsoDate();
    const tasks = [
      makeTask({ id: '1', title: 'Write docs', tags: ['Docs'], list: 'Inbox', dueDate: today }),
      makeTask({ id: '2', title: 'Ship feature', tags: ['Release'], list: 'Work' }),
      makeTask({ id: '3', title: 'Done task', list: 'Work', completed: true }),
    ];

    const counts = getTaskCounts(tasks, ['Work']);
    expect(counts.inbox).toBe(1);
    expect(counts.today).toBe(1);
    expect(counts.Work).toBe(1);

    const results = searchTasks(tasks, 'doc');
    expect(results.map((t) => t.id)).toEqual(['1']);
  });
});
