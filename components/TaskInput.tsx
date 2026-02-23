import React, { useEffect, useRef, useState } from 'react';
import { Task, Priority } from '../types';
import { Icons } from '../constants';
import { addDaysLocalIsoDate, todayLocalIsoDate } from '../utils/date';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  activeList?: string;
  projects: string[];
}

const RANDOM_PROMPTS = [
  'Plan sprint !high #work today',
  'Review lecture notes #study tomorrow',
  'Book tickets #travel next week',
  'Buy coffee beans #life',
  'Finalize report !high #work',
  'Read 20 pages #study',
];

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, activeList, projects }) => {
  const [input, setInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('Inbox');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [placeholderHint, setPlaceholderHint] = useState(RANDOM_PROMPTS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [parsedPreview, setParsedPreview] = useState<{
    priority?: Priority;
    tags: string[];
    dueDate?: string;
    cleanTitle: string;
  }>({ tags: [], cleanTitle: '' });

  useEffect(() => {
    setPlaceholderHint(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]);
  }, []);

  useEffect(() => {
    if (activeList && projects.includes(activeList)) {
      setSelectedProject(activeList);
    } else {
      setSelectedProject('Inbox');
    }
  }, [activeList, projects]);

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
    let priority: Priority | undefined;
    let tags: string[] = [];
    let dueDate: string | undefined;

    const priorityRegex = /!(high|medium|low)/i;
    const priorityMatch = text.match(priorityRegex);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as Priority;
    }

    const tagRegex = /#([^\s#@!]+)/gu;
    const tagMatches = Array.from(text.matchAll(tagRegex));
    if (tagMatches.length > 0) {
      tags = Array.from(new Set(tagMatches.map((match) => match[1].trim()).filter(Boolean)));
    }

    const projectRegex = /@([^\s#@!]+)/iu;
    const projectMatch = text.match(projectRegex);
    let projectFound: string | null = null;
    if (projectMatch) {
      const projectName = projectMatch[1];
      projectFound = projects.find((project) => project.toLowerCase() === projectName.toLowerCase()) || null;
    }

    const lowerText = text.toLowerCase();
    let dateLabel = '';
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

    const cleanTitle = text
      .replace(priorityRegex, '')
      .replace(tagRegex, '')
      .replace(/@([^\s#@!]+)/gu, '')
      .replace(/\b(today|tod|tomorrow|tmr|tom|next week)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return { priority, tags, dueDate, cleanTitle, dateLabel, projectFound };
  };

  useEffect(() => {
    const result = parseTaskInput(input);
    setParsedPreview({
      priority: result.priority,
      tags: result.tags,
      dueDate: result.dateLabel,
      cleanTitle: result.cleanTitle,
    });
    if (result.projectFound) {
      setSelectedProject(result.projectFound);
    }
  }, [input, projects]);

  const submit = () => {
    if (!input.trim()) return;

    const parsedData = parseTaskInput(input);
    const date = parsedData.dueDate || todayLocalIsoDate();

    onAddTask({
      title: parsedData.cleanTitle || input,
      description: '',
      completed: false,
      priority: parsedData.priority || Priority.MEDIUM,
      tags: parsedData.tags,
      subtasks: [],
      dueDate: date,
      list: selectedProject,
    });

    setInput('');
    setParsedPreview({ tags: [], cleanTitle: '' });
    setPlaceholderHint(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]);

    if (!activeList || !projects.includes(activeList)) {
      setSelectedProject('Inbox');
    }

    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  const getPlaceholder = () => {
    if (activeList === 'today') return `For today... e.g. ${placeholderHint}`;
    if (activeList && projects.includes(activeList) && activeList !== 'Inbox') return `Add to ${activeList}... e.g. ${placeholderHint}`;
    return `Add a task... e.g. ${placeholderHint}`;
  };

  const shouldAutoFocus = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div className="w-full relative z-30 max-w-[860px] mx-auto">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-[24px] border border-gray-200/90 dark:border-zinc-700/90 bg-[#f4f5f7]/96 dark:bg-zinc-900/95 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200"
      >
        <div className="px-4 md:px-6 pt-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="w-full h-10 bg-transparent text-[18px] leading-6 font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
            autoFocus={shouldAutoFocus}
          />
        </div>

        {(parsedPreview.priority || parsedPreview.tags.length > 0 || parsedPreview.dueDate) && (
          <div className="px-4 md:px-6 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {parsedPreview.dueDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-900/45 whitespace-nowrap">
                <Icons.Calendar />
                {parsedPreview.dueDate}
              </span>
            )}
            {parsedPreview.priority && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap ${
                  parsedPreview.priority === Priority.HIGH
                    ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/25 dark:text-red-300 dark:border-red-900/45'
                    : parsedPreview.priority === Priority.LOW
                      ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/25 dark:text-green-300 dark:border-green-900/45'
                      : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-900/45'
                }`}
              >
                !{parsedPreview.priority}
              </span>
            )}
            {parsedPreview.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border border-gray-200 bg-white/70 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 whitespace-nowrap"
              >
                <Icons.Tag />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="h-11 border-t border-gray-200/80 dark:border-zinc-700/80 px-3 md:px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Quick add hints"
              className="w-8 h-8 rounded-full text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-white/75 dark:hover:bg-zinc-800/75 transition-colors"
              title="Input supports !priority #tags today"
            >
              <Icons.Plus />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="h-8 px-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-[12px] font-semibold text-gray-700 dark:text-zinc-200 inline-flex items-center gap-1.5 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
                title="Select project"
              >
                <Icons.Folder />
                <span className="max-w-[112px] truncate">{selectedProject}</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 w-52 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl overflow-hidden py-1.5 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProject('Inbox');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedProject === 'Inbox' ? 'text-gray-900 dark:text-zinc-100 bg-gray-50/70 dark:bg-zinc-800/70' : 'text-gray-600 dark:text-zinc-300'}`}
                  >
                    <Icons.Inbox />
                    Inbox
                  </button>

                  <div className="my-1 mx-2 h-px bg-gray-100 dark:bg-zinc-800" />

                  <div className="max-h-48 overflow-y-auto">
                    {projects.map((project) => (
                      <button
                        key={project}
                        type="button"
                        onClick={() => {
                          setSelectedProject(project);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedProject === project ? 'text-gray-900 dark:text-zinc-100 bg-gray-50/70 dark:bg-zinc-800/70' : 'text-gray-600 dark:text-zinc-300'}`}
                      >
                        <Icons.Folder />
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={submit}
            type="button"
            aria-label="Add task"
            className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-all duration-200 ${
              input.trim().length > 0
                ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:scale-105'
                : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
            }`}
            disabled={input.trim().length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};
