import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, RecurrenceRule } from '../types';
import { Icons } from '../constants';
import { todayLocalIsoDate } from '../utils/date';
import { parseTaskInput } from '../utils/taskParser';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  activeList?: string;
  projects: string[];
}

const RECURRENCE_OPTIONS: Array<{ label: string; value: RecurrenceRule | null }> = [
  { label: 'No Repeat', value: null },
  { label: 'Daily', value: { type: 'daily' } },
  { label: 'Weekly', value: { type: 'weekly' } },
  { label: 'Monthly', value: { type: 'monthly' } },
  { label: 'Weekdays', value: { type: 'weekdays' } },
];

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, activeList, projects }) => {
  const [input, setInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('Inbox');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  
  // Parsed state for visual feedback
  const [parsedPreview, setParsedPreview] = useState<{
     priority?: Priority;
     tags: string[];
     dueDate?: string;
     cleanTitle: string;
  }>({ tags: [], cleanTitle: '' });

  // Sync selectedProject with activeList when context changes
  useEffect(() => {
    if (activeList && projects.includes(activeList)) {
      setSelectedProject(activeList);
    } else {
      setSelectedProject('Inbox');
    }
  }, [activeList, projects]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time parsing effect
  useEffect(() => {
     const result = parseTaskInput(input, projects);
     setParsedPreview({
         priority: result.priority,
         tags: result.tags,
         dueDate: result.dateLabel,
         cleanTitle: result.cleanTitle
     });
     if (result.projectFound) {
         setSelectedProject(result.projectFound);
     }
  }, [input, projects]);

  const submit = () => {
    if (!input.trim()) return;

    const parsedData = parseTaskInput(input, projects);
    
    // Determine Date
    // MODIFIED: Default to Today globally if no date was specifically parsed.
    // This ensures tasks appear in "Today" view by default.
    const date = parsedData.dueDate || todayLocalIsoDate();

    onAddTask({
      title: parsedData.cleanTitle || input, // Fallback to input if regex strips everything
      description: "",
      completed: false,
      priority: parsedData.priority || Priority.MEDIUM,
      tags: parsedData.tags,
      subtasks: [],
      dueDate: date,
      list: selectedProject, // Use the UI state
      recurrence,
    });
    
    setInput('');
    setParsedPreview({ tags: [], cleanTitle: '' });
    setRecurrence(null);
    
    // Reset project selection only if we are not in a specific project view
    if (!activeList || !projects.includes(activeList)) {
        setSelectedProject('Inbox');
    }
    
    inputRef.current?.focus();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposingRef.current) return;
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposingRef.current || (e.nativeEvent as KeyboardEvent).isComposing) return;
    if (e.key === 'Enter') {
        e.preventDefault();
        submit();
    }
  }

  // Helper for placeholder
  const getPlaceholder = () => {
      if (activeList === 'today') return 'For today...';
      if (activeList && projects.includes(activeList) && activeList !== 'Inbox') return `${activeList}...`;
      return 'Add task... (e.g. Finish report !high #work)';
  }
  
  // Auto-focus logic: Only on desktop
  const shouldAutoFocus = typeof window !== 'undefined';

  return (
    <div className="w-full relative z-30 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="group transition-all duration-300">
        <div className="relative overflow-visible rounded-[14px] border border-primary-200/90 dark:border-dark-border/80 bg-primary-50/98 dark:bg-dark-surface shadow-[0_2px_14px_rgba(20,20,19,0.05)] dark:shadow-none transition-all duration-200 ease-out focus-within:shadow-[0_6px_22px_rgba(20,20,19,0.08)]">
            <div className="flex min-h-[52px] items-center gap-2 pl-4 pr-3">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onCompositionStart={() => { isComposingRef.current = true; }}
                    onCompositionEnd={() => { isComposingRef.current = false; }}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    className="h-full w-full min-w-0 bg-transparent pr-2 text-sm font-medium text-primary-900 outline-none placeholder:text-primary-400 dark:text-dark-text dark:placeholder:text-dark-muted"
                    autoFocus={shouldAutoFocus}
                />
                <div className="flex items-center gap-1.5 text-primary-500 dark:text-dark-muted">
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = RECURRENCE_OPTIONS.findIndex(
                        (option) => option.value?.type === recurrence?.type,
                      );
                      const nextIndex = (currentIndex + 1) % RECURRENCE_OPTIONS.length;
                      setRecurrence(RECURRENCE_OPTIONS[nextIndex].value);
                    }}
                    className={`flex h-7 items-center justify-center rounded-lg px-1.5 transition-colors ${
                      recurrence
                        ? 'bg-primary-200/70 text-primary-700 dark:bg-dark-border/70 dark:text-dark-text'
                        : 'hover:bg-primary-200/60 dark:hover:bg-dark-border/60'
                    }`}
                    title="Repeat"
                    aria-label="Set repeat frequency"
                  >
                    <Icons.Refresh />
                  </button>

                  <div className="relative z-40 shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-label="Select project"
                      className={`
                        flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] font-semibold transition-colors
                        ${isDropdownOpen
                          ? 'bg-primary-200/70 text-primary-700 dark:bg-dark-border/70 dark:text-dark-text'
                          : 'text-primary-500 hover:bg-primary-200/60 dark:text-dark-muted dark:hover:bg-dark-border/60'}
                      `}
                      title="Select Project"
                    >
                      <Icons.Folder />
                      <span className="max-w-[90px] truncate">{selectedProject}</span>
                      <span className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-lg border border-primary-200 bg-primary-50 py-1.5 shadow-lg dark:border-dark-border dark:bg-dark-surface animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                        <button
                          type="button"
                          onClick={() => { setSelectedProject('Inbox'); setIsDropdownOpen(false); }}
                          className={`mx-1 w-[calc(100%-0.5rem)] text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${selectedProject === 'Inbox' ? 'text-primary-900 dark:text-dark-text bg-primary-200/50 dark:bg-dark-border/50' : 'text-primary-500 dark:text-dark-muted hover:bg-primary-200/40 dark:hover:bg-dark-border/30'}`}
                        >
                          <Icons.Inbox /> Inbox
                          {selectedProject === 'Inbox' && <span className="ml-auto text-primary-900 dark:text-dark-text"><Icons.Checked /></span>}
                        </button>
                        <div className="h-px bg-primary-200/70 dark:bg-dark-border/50 my-1 mx-2"></div>
                        <div className="max-h-44 overflow-y-auto custom-scroll">
                          {projects.map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => { setSelectedProject(p); setIsDropdownOpen(false); }}
                              className={`mx-1 w-[calc(100%-0.5rem)] text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${selectedProject === p ? 'text-primary-900 dark:text-dark-text bg-primary-200/50 dark:bg-dark-border/50' : 'text-primary-500 dark:text-dark-muted hover:bg-primary-200/40 dark:hover:bg-dark-border/30'}`}
                            >
                              <Icons.Folder /> {p}
                              {selectedProject === p && <span className="ml-auto text-primary-900 dark:text-dark-text"><Icons.Checked /></span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                    type="submit"
                    aria-label="Add task"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary-200/80 bg-primary-100/80 text-primary-700 transition-all duration-200 dark:border-dark-border dark:bg-dark-border/50 dark:text-dark-text ${
                      input.length > 0
                        ? 'opacity-100 hover:scale-105 hover:bg-primary-200/80 active:scale-95'
                        : 'pointer-events-none opacity-45'
                    }`}
                >
                  <Icons.CornerDownLeft />
                </button>
            </div>

            {/* Smart Parsed Attributes (Pills) Row */}
            {(parsedPreview.priority || parsedPreview.tags.length > 0 || parsedPreview.dueDate || recurrence) && (
                <div className="flex items-center gap-2 border-t border-primary-200/75 px-3 py-2 overflow-x-auto no-scrollbar dark:border-dark-border/75">
                    
                    {parsedPreview.dueDate && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--status-info-bg)] text-[10px] font-bold text-[var(--status-info-text)] border border-[var(--status-info-border)] whitespace-nowrap">
                            <Icons.Calendar /> {parsedPreview.dueDate}
                        </span>
                    )}
                    
                    {parsedPreview.priority && (
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap
                            ${parsedPreview.priority === Priority.HIGH ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]' : 
                              parsedPreview.priority === Priority.LOW ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]' : 
                              'bg-[var(--status-warn-bg)] text-[var(--status-warn-text)] border-[var(--status-warn-border)]'}
                        `}>
                            !{parsedPreview.priority}
                        </span>
                    )}
                    
                    {parsedPreview.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-[10px] font-mono font-medium text-primary-600 dark:text-dark-muted whitespace-nowrap">
                            <Icons.Tag />
                            {tag}
                        </span>
                    ))}
                    {recurrence && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-[10px] font-semibold text-primary-700 dark:text-dark-text whitespace-nowrap">
                        <Icons.Refresh />
                        {RECURRENCE_OPTIONS.find((option) => option.value?.type === recurrence.type)?.label}
                      </span>
                    )}
                </div>
            )}

        </div>
      </form>
    </div>
  );
};
