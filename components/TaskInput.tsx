import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  activeList?: string;
  projects: string[];
}

const RANDOM_PROMPTS = [
  "Buy coffee !high #life today",
  "Save the world... !high",
  "Debug the universe #coding",
  "Call mom tomorrow #family",
  "Design the future !medium",
  "Go for a run 🏃‍♂️ #health",
  "Read a book 📚 #relax",
  "Ship it! 🚀 #work",
  "Plan weekend trip next week #travel",
  "Water the plants 🌱",
  "Learn TypeScript #dev",
  "Pay bills !high #finance",
  "Review goals 🎯",
  "Take a deep breath... #focus",
  "Deploy to production !high",
  "Invent time travel tomorrow",
  "Feed the cat 🐱 #chores",
  "Write a song #creative",
  "Fix that bug !medium",
  "Coffee break ☕️"
];

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, activeList, projects }) => {
  const [input, setInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('Inbox');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [placeholderHint, setPlaceholderHint] = useState(RANDOM_PROMPTS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  // Helper to get local date string YYYY-MM-DD (Safe for local timezone)
  const getLocalDateStr = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  };

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
    const tagRegex = /#(\w+)/g;
    const tagMatches = text.match(tagRegex);
    if (tagMatches) {
      tags = tagMatches.map(t => t.substring(1));
    }

    // 3. Project Parsing (@Project)
    const projectRegex = /@(\w+)/i;
    const projectMatch = input.match(projectRegex);
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
      dueDate = getLocalDateStr(today);
      dateLabel = 'Today';
    } else if (/\b(tomorrow|tmr|tom)\b/.test(lowerText)) {
      const tmr = new Date(today);
      tmr.setDate(tmr.getDate() + 1);
      dueDate = getLocalDateStr(tmr);
      dateLabel = 'Tomorrow';
    } else if (/\b(next week)\b/.test(lowerText)) {
      const nextMon = new Date(today);
      nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
      dueDate = getLocalDateStr(nextMon);
      dateLabel = 'Next Week';
    }

    // Generate Clean Title for Preview
    let cleanTitle = title
        .replace(priorityRegex, '')
        .replace(tagRegex, '')
        .replace(projectRegex, '')
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
    let date = parsedData.dueDate || getLocalDateStr(new Date());

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
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submit();
    }
  }

  // Helper for placeholder
  const getPlaceholder = () => {
      if (activeList === 'today') return `For today... (e.g. ${placeholderHint})`;
      if (activeList && projects.includes(activeList) && activeList !== 'Inbox') return `Add to ${activeList}... (e.g. ${placeholderHint})`;
      return `I need to... (e.g. ${placeholderHint})`;
  }
  
  // Auto-focus logic: Only on desktop
  const shouldAutoFocus = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div className="w-full relative z-30 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 md:gap-3 group transition-all duration-300">
        
        {/* LEFT: Main Input Container */}
        {/* Updated shadow and hover states for natural feel */}
        <div className="flex-1 relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden transition-all duration-200 ease-out flex flex-col justify-center min-h-[3.5rem] hover:border-gray-200 dark:hover:border-zinc-700 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:focus-within:shadow-none focus-within:border-gray-300 dark:focus-within:border-zinc-600">
            
            {/* Input Field Row - Fixed Height 3.5rem (h-14) to match button */}
            <div className="flex items-center pl-4 md:pl-6 pr-12 md:pr-16 h-14 shrink-0">
                <div className="text-gray-400 shrink-0">
                   <Icons.Plus />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    className="w-full h-full pl-3 pr-4 bg-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none font-medium text-base" 
                    autoFocus={shouldAutoFocus}
                />
            </div>

            {/* Smart Parsed Attributes (Pills) Row */}
            {(parsedPreview.priority || parsedPreview.tags.length > 0 || parsedPreview.dueDate) && (
                <div className="flex items-center gap-2 px-6 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200 overflow-x-auto no-scrollbar">
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

            {/* Enter Button (Always visible on mobile to provide a submit action if keyboard is tricky) */}
            <div className="absolute right-2 top-0 h-14 flex items-center pr-1 md:pr-2">
                <button
                    onClick={submit} 
                    type="button"
                    className={`flex items-center justify-center w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black transition-all duration-200 hover:scale-110 active:scale-95 ${input.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                </button>
            </div>
        </div>

        {/* RIGHT: Independent Project Selector Pill */}
        <div className="relative shrink-0 z-40" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`
                 h-14 px-3 md:px-5 flex items-center gap-2 rounded-[28px] border transition-all duration-200
                 bg-white dark:bg-zinc-900 
                 ${isDropdownOpen 
                    ? 'border-gray-400 dark:border-zinc-500 shadow-md' 
                    : 'border-gray-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:border-gray-200 dark:hover:border-zinc-700 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-none'}
              `}
              title="Select Project"
            >
                <div className="flex flex-col items-start justify-center">
                    {/* Hide label on mobile to save space */}
                    <span className="hidden md:block text-[9px] font-bold uppercase text-gray-400 dark:text-zinc-500 leading-none mb-0.5">Project</span>
                    <div className="flex items-center gap-1.5">
                       <span className="md:hidden text-gray-500 dark:text-zinc-400"><Icons.Folder /></span>
                       <span className="text-xs font-bold text-black dark:text-white leading-none max-w-[80px] md:max-w-[100px] truncate">{selectedProject}</span>
                    </div>
                </div>
                <div className={`hidden md:block text-gray-400 dark:text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </button>

            {/* Dropdown Menu (Anchored Right) */}
            {isDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-48 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                  <div className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-600 tracking-wider">
                      Select Destination
                  </div>
                  
                  <button
                      type="button"
                      onClick={() => { setSelectedProject('Inbox'); setIsDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedProject === 'Inbox' ? 'text-black dark:text-white bg-gray-50 dark:bg-zinc-800' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                      <Icons.Inbox /> Inbox
                      {selectedProject === 'Inbox' && <span className="ml-auto text-black dark:text-white"><Icons.Checked /></span>}
                  </button>
                  
                  <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1 mx-3"></div>
                  
                  <div className="max-h-48 overflow-y-auto custom-scroll">
                    {projects.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => { setSelectedProject(p); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedProject === p ? 'text-black dark:text-white bg-gray-50 dark:bg-zinc-800' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <Icons.Folder /> {p}
                            {selectedProject === p && <span className="ml-auto text-black dark:text-white"><Icons.Checked /></span>}
                        </button>
                    ))}
                  </div>
              </div>
            )}
        </div>

      </form>
    </div>
  );
};