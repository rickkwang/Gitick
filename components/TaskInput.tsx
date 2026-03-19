import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';
import { todayLocalIsoDate } from '../utils/date';
import { parseTaskInput } from '../utils/taskParser';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  activeList?: string;
  projects: string[];
}

const RANDOM_PROMPTS = [
  'Finish report !high',
  'Call mom tomorrow',
  'Buy coffee #life',
  'Read 20 mins',
  'Workout today',
];

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, activeList, projects }) => {
  const [input, setInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('Inbox');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [placeholderHint, setPlaceholderHint] = useState(RANDOM_PROMPTS[0]);
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

  // Initialize random placeholder on mount
  useEffect(() => {
    setPlaceholderHint(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]);
  }, []);

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
      list: selectedProject // Use the UI state
    });
    
    setInput('');
    setParsedPreview({ tags: [], cleanTitle: '' });
    
    // Randomize hint for next task
    setPlaceholderHint(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]);

    // Reset project selection only if we are not in a specific project view
    if (!activeList || !projects.includes(activeList)) {
        setSelectedProject('Inbox');
    }
    
    // Re-focus on desktop only
    if (window.innerWidth > 768) {
        inputRef.current?.focus();
    }
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
      return 'Add task...';
  }
  
  // Auto-focus logic: Only on desktop
  const shouldAutoFocus = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div className="w-full relative z-30 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="group transition-all duration-300">
        <div className="relative bg-primary-50 dark:bg-dark-surface border border-primary-200/80 dark:border-dark-border rounded-xl shadow-sm dark:shadow-none overflow-visible transition-all duration-200 ease-out flex flex-col justify-center min-h-[3.25rem] focus-within:shadow-md dark:focus-within:shadow-none">
            <div className="flex items-center pl-5 md:pl-6 pr-2.5 h-[52px] shrink-0">
                <div className="text-primary-400 shrink-0">
                   <Icons.Plus />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onCompositionStart={() => { isComposingRef.current = true; }}
                    onCompositionEnd={() => { isComposingRef.current = false; }}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    className="w-full h-full pl-3 pr-3 bg-transparent text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted outline-none font-medium text-[15px] min-w-0"
                    autoFocus={shouldAutoFocus}
                />
                <button
                    onClick={submit}
                    type="button"
                    aria-label="Add task"
                    className={`mr-1 flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-[var(--accent)] text-white transition-all duration-200 hover:scale-110 active:scale-95 ${input.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
                >
<Icons.CornerDownLeft />
                </button>
                <div className="h-5 w-px bg-gray-200/70 dark:bg-zinc-700/60 mx-1.5" />
                <div className="relative shrink-0 z-40" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-label="Select project"
                      className={`
                        h-9 px-4 md:px-4.5 flex items-center gap-2 rounded-full transition-all duration-200
                        bg-primary-200/50 dark:bg-dark-border/30
                        ${isDropdownOpen
                          ? 'bg-primary-200/50 dark:bg-dark-border/50'
                          : 'hover:bg-primary-200/50 dark:hover:bg-dark-border/40'}
                      `}
                      title="Select Project"
                    >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-primary-400 dark:text-dark-muted">Project</span>
                        <span className="text-xs font-bold text-primary-900 dark:text-dark-text max-w-[96px] truncate">{selectedProject}</span>
                        <span className={`text-primary-400 dark:text-dark-muted transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-44 rounded-lg border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface shadow-lg overflow-hidden py-1.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
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

            {/* Smart Parsed Attributes (Pills) Row */}
            {(parsedPreview.priority || parsedPreview.tags.length > 0 || parsedPreview.dueDate) && (
                <div className="flex items-center gap-2 px-6 md:px-8 pb-2.5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200 overflow-x-auto no-scrollbar">
                    <div className="h-px w-4 bg-primary-200 dark:bg-dark-border mr-1 shrink-0"></div>
                    
                    {parsedPreview.dueDate && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 whitespace-nowrap">
                            <Icons.Calendar /> {parsedPreview.dueDate}
                        </span>
                    )}
                    
                    {parsedPreview.priority && (
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap
                            ${parsedPreview.priority === Priority.HIGH ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30' : 
                              parsedPreview.priority === Priority.LOW ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-100 dark:border-green-900/30' : 
                              'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100 dark:border-orange-900/30'}
                        `}>
                            !{parsedPreview.priority}
                        </span>
                    )}
                    
                    {parsedPreview.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-[10px] font-mono font-medium text-primary-600 dark:text-dark-muted whitespace-nowrap">
                            <Icons.Tag />
                            {tag}
                        </span>
                    ))}
                </div>
            )}

        </div>
      </form>
    </div>
  );
};
