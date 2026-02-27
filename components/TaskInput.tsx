import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';
import { addDaysLocalIsoDate, todayLocalIsoDate } from '../utils/date';

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

  const parseTaskInput = (text: string) => {
    let title = text;
    let priority: Priority | undefined = undefined;
    let tags: string[] = [];
    let dueDate: string | undefined = undefined;

    // 1. Priority Parsing (!high)
    const priorityRegex = /!(high|medium|low)/i;
    const priorityMatch = text.match(priorityRegex);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as Priority;
    }

    // 2. Tags Parsing (#tag)
    const tagRegex = /#([^\s#@!]+)/gu;
    const tagMatches = Array.from(text.matchAll(tagRegex));
    if (tagMatches.length > 0) {
      tags = Array.from(new Set(tagMatches.map((match) => match[1].trim()).filter(Boolean)));
    }

    // 3. Project Parsing (@Project)
    const projectRegex = /@([^\s#@!]+)/iu;
    const projectMatch = text.match(projectRegex);
    let projectFound = null;
    if (projectMatch) {
       const pName = projectMatch[1];
       projectFound = projects.find(p => p.toLowerCase() === pName.toLowerCase());
    }

    // 4. Date Parsing (Local Time robust)
    const today = new Date();
    const lowerText = text.toLowerCase();
    let dateLabel = '';

    // Regex ensures we match whole words to avoid false positives inside words
    if (/\b(today|tod)\b/.test(lowerText)) {
      dueDate = todayLocalIsoDate();
      dateLabel = 'Today';
    } else if (/\b(tomorrow|tmr|tom)\b/.test(lowerText)) {
      dueDate = addDaysLocalIsoDate(1);
      dateLabel = 'Tomorrow';
    } else if (/\b(next week)\b/.test(lowerText)) {
      const nextMon = new Date(today);
      nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
      const diffDays = Math.round((nextMon.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      dueDate = addDaysLocalIsoDate(diffDays);
      dateLabel = 'Next Week';
    }

    // Generate Clean Title for Preview
    const projectTokenRegex = /@([^\s#@!]+)/gu;
    let cleanTitle = title
        .replace(priorityRegex, '')
        .replace(tagRegex, '')
        .replace(projectTokenRegex, '')
        .replace(/\b(today|tod|tomorrow|tmr|tom|next week)\b/gi, '')
        .replace(/\s+/g, ' ').trim();

    return { title, priority, tags, dueDate, cleanTitle, dateLabel, projectFound };
  };

  // Real-time parsing effect
  useEffect(() => {
     const result = parseTaskInput(input);
     setParsedPreview({
         priority: result.priority,
         tags: result.tags,
         dueDate: result.dateLabel, // Use label for preview
         cleanTitle: result.cleanTitle
     });
     if (result.projectFound) {
         setSelectedProject(result.projectFound);
     }
  }, [input, projects]);

  const submit = () => {
    if (!input.trim()) return;

    const parsedData = parseTaskInput(input);
    
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
        <div className="relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none overflow-visible transition-all duration-200 ease-out flex flex-col justify-center min-h-[3.25rem] focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:focus-within:shadow-none">
            <div className="flex items-center pl-5 md:pl-6 pr-2.5 h-[52px] shrink-0">
                <div className="text-gray-400 shrink-0">
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
                    className="w-full h-full pl-3 pr-3 bg-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none font-medium text-[15px] min-w-0"
                    autoFocus={shouldAutoFocus}
                />
                <button
                    onClick={submit}
                    type="button"
                    aria-label="Add task"
                    className={`mr-1 flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black transition-all duration-200 hover:scale-110 active:scale-95 ${input.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
                >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                </button>
                <div className="h-5 w-px bg-gray-200/70 dark:bg-zinc-700/60 mx-1.5" />
                <div className="relative shrink-0 z-40" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-label="Select project"
                      className={`
                        h-9 px-4 md:px-4.5 flex items-center gap-2 rounded-full transition-all duration-200
                        bg-gray-100/75 dark:bg-white/5
                        ${isDropdownOpen
                          ? 'bg-gray-100 dark:bg-white/10'
                          : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'}
                      `}
                      title="Select Project"
                    >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Project</span>
                        <span className="text-xs font-bold text-black dark:text-white max-w-[96px] truncate">{selectedProject}</span>
                        <span className={`text-gray-400 dark:text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-44 rounded-2xl border border-white/35 dark:border-white/10 bg-white/72 dark:bg-zinc-900/62 backdrop-blur-xl shadow-[0_16px_32px_-20px_rgba(0,0,0,0.45)] overflow-hidden py-1.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                          <button
                              type="button"
                              onClick={() => { setSelectedProject('Inbox'); setIsDropdownOpen(false); }}
                              className={`mx-1 w-[calc(100%-0.5rem)] text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${selectedProject === 'Inbox' ? 'text-black dark:text-white bg-gray-100/85 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-white/6'}`}
                          >
                              <Icons.Inbox /> Inbox
                              {selectedProject === 'Inbox' && <span className="ml-auto text-black dark:text-white"><Icons.Checked /></span>}
                          </button>
                          <div className="h-px bg-gray-200/70 dark:bg-white/10 my-1 mx-2"></div>
                          <div className="max-h-44 overflow-y-auto custom-scroll">
                            {projects.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => { setSelectedProject(p); setIsDropdownOpen(false); }}
                                    className={`mx-1 w-[calc(100%-0.5rem)] text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${selectedProject === p ? 'text-black dark:text-white bg-gray-100/85 dark:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-white/6'}`}
                                >
                                    <Icons.Folder /> {p}
                                    {selectedProject === p && <span className="ml-auto text-black dark:text-white"><Icons.Checked /></span>}
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
                    <div className="h-px w-4 bg-gray-200 dark:bg-zinc-800 mr-1 shrink-0"></div>
                    
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
                        <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
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
