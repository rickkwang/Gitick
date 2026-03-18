import { Priority } from '../../types';
import { parseTaskInput } from '../taskParser';

const PROJECTS = ['Work', 'Study', 'Life'];

describe('parseTaskInput', () => {
  it('parses high priority', () => {
    const result = parseTaskInput('Fix bug !high', PROJECTS);
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.cleanTitle).toBe('Fix bug');
  });

  it('parses medium and low priority', () => {
    expect(parseTaskInput('Task !medium').priority).toBe(Priority.MEDIUM);
    expect(parseTaskInput('Task !low').priority).toBe(Priority.LOW);
  });

  it('parses tags', () => {
    const result = parseTaskInput('Buy milk #life #errands');
    expect(result.tags).toEqual(['life', 'errands']);
  });

  it('deduplicates exact-same tags', () => {
    const result = parseTaskInput('Task #work #work #work');
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]).toBe('work');
  });

  it('parses today', () => {
    const result = parseTaskInput('Call mom today');
    expect(result.dueDate).toBeDefined();
    expect(result.dateLabel).toBe('Today');
    expect(result.cleanTitle).toBe('Call mom');
  });

  it('parses tod shorthand', () => {
    expect(parseTaskInput('Task tod').dateLabel).toBe('Today');
  });

  it('parses tomorrow', () => {
    const result = parseTaskInput('Meeting tomorrow');
    expect(result.dateLabel).toBe('Tomorrow');
  });

  it('parses tmr and tom shorthands', () => {
    expect(parseTaskInput('Task tmr').dateLabel).toBe('Tomorrow');
    expect(parseTaskInput('Task tom').dateLabel).toBe('Tomorrow');
  });

  it('parses next week', () => {
    const result = parseTaskInput('Review PR next week');
    expect(result.dateLabel).toBe('Next Week');
    expect(result.dueDate).toBeDefined();
  });

  it('parses @project mention', () => {
    const result = parseTaskInput('Write report @Work', PROJECTS);
    expect(result.projectFound).toBe('Work');
    expect(result.cleanTitle).toBe('Write report');
  });

  it('project match is case insensitive', () => {
    const result = parseTaskInput('Task @work', PROJECTS);
    expect(result.projectFound).toBe('Work');
  });

  it('returns undefined projectFound when no match', () => {
    const result = parseTaskInput('Task @unknown', PROJECTS);
    expect(result.projectFound).toBeUndefined();
  });

  it('parses combined syntax', () => {
    const result = parseTaskInput('Finish slides !high #work tomorrow @Work', PROJECTS);
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.tags).toContain('work');
    expect(result.dateLabel).toBe('Tomorrow');
    expect(result.projectFound).toBe('Work');
    expect(result.cleanTitle).toBe('Finish slides');
  });

  it('returns original text as title', () => {
    const result = parseTaskInput('Just a plain task');
    expect(result.title).toBe('Just a plain task');
    expect(result.cleanTitle).toBe('Just a plain task');
  });

  it('does not match today inside a word', () => {
    // "birthday" contains no whole-word "today"
    const result = parseTaskInput('birthday party');
    expect(result.dueDate).toBeUndefined();
  });
});
