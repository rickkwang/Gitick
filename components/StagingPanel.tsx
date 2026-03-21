import React, { useState, useRef, useEffect, type SetStateAction } from 'react';
import { Task, Priority, Subtask } from '../types';
import { Icons } from '../constants';
import { DatePicker } from './DatePicker';

// Fallback for crypto.randomUUID in environments where it may not be available
const generateSubtaskId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

interface StagingPanelProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskUpdate: SetStateAction<Task>) => void;
  onDelete: (id: string) => void;
  onCommit: (task: Task) => void;
  projects: string[];
  isCompact?: boolean;
}

const StagingPanelComponent: React.FC<StagingPanelProps> = ({ task, onClose, onUpdate, onDelete, onCommit, projects, isCompact = false }) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isTagInputOpen, setIsTagInputOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const dateContainerRef = useRef<HTMLDivElement>(null);
  const titleDebounceRef = useRef<number | null>(null);
  const descriptionDebounceRef = useRef<number | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [descriptionDraft]);

  // Close DatePicker on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dateContainerRef.current && !dateContainerRef.current.contains(event.target as Node)) {
              setShowDatePicker(false);
          }
      };
      if (showDatePicker) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showDatePicker]);

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title);
    setDescriptionDraft(task.description || '');
  }, [task?.id, task?.title, task?.description]);

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) window.clearTimeout(titleDebounceRef.current);
      if (descriptionDebounceRef.current) window.clearTimeout(descriptionDebounceRef.current);
    };
  }, []);

  if (!task) return null;

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: generateSubtaskId(),
      title: newSubtaskTitle.trim(),
      completed: false
    };
    onUpdate({
      ...task,
      subtasks: [...task.subtasks, newSub]
    });
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks.filter(s => s.id !== subId);
    onUpdate({ ...task, subtasks: updatedSubtasks });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTag.trim().replace(/^#/, '');
    if (cleanTag && !task.tags.includes(cleanTag)) {
      onUpdate({ ...task, tags: [...task.tags, cleanTag] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate({ ...task, tags: task.tags.filter(t => t !== tagToRemove) });
  };

  // Cycle priority on click
  const cyclePriority = () => {
    const map: Record<Priority, Priority> = {
        [Priority.LOW]: Priority.MEDIUM,
        [Priority.MEDIUM]: Priority.HIGH,
        [Priority.HIGH]: Priority.LOW
    };
    onUpdate({ ...task, priority: map[task.priority] });
  };

  const cycleRecurrence = () => {
    const order: Array<Task['recurrence']> = [
      null,
      { type: 'daily' },
      { type: 'weekly' },
      { type: 'monthly' },
      { type: 'weekdays' },
    ];
    const current = task.recurrence?.type ?? null;
    const currentIndex =
      current === null ? 0 : order.findIndex((option) => option?.type === current);
    const next = order[(currentIndex + 1) % order.length] ?? null;
    onUpdate({ ...task, recurrence: next });
  };

  const recurrenceLabel = task.recurrence
    ? task.recurrence.type === 'daily'
      ? 'Daily'
      : task.recurrence.type === 'weekly'
        ? 'Weekly'
        : task.recurrence.type === 'monthly'
          ? 'Monthly'
          : 'Weekdays'
    : 'No Repeat';
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const hasDraftChanges = titleDraft !== task.title || descriptionDraft !== (task.description || '');

  const containerClasses = "h-full flex flex-col bg-primary-50/90 dark:bg-dark-surface/95 backdrop-blur-sm";
  const panelRadius = 'rounded-xl';
  const chipBase = `flex h-12 items-center gap-2 px-4 ${panelRadius} rounded-full border text-[0.95rem] font-medium transition-all duration-200`;
  const neutralChip = 'bg-white/78 dark:bg-dark-surface border-primary-300 dark:border-dark-border text-primary-700 dark:text-dark-text hover:border-primary-400 hover:bg-white dark:hover:border-dark-muted';
  const sectionInset = isCompact ? 'ml-0' : 'ml-9';

  const priorityColors = {
    [Priority.HIGH]: 'text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]',
    [Priority.MEDIUM]: 'text-[var(--status-warn-text)] bg-[var(--status-warn-bg)] border-[var(--status-warn-border)]',
    [Priority.LOW]: 'text-primary-700 dark:text-dark-text bg-primary-100/80 dark:bg-dark-border/70 border-primary-200 dark:border-dark-border',
  };

  return (
      <div className={containerClasses}>
        {/* Header */}
        <div className={`h-14 flex items-center justify-between ${isCompact ? 'px-5' : 'px-7'} bg-primary-50/95 dark:bg-dark-surface/95 shrink-0 border-b border-primary-200/65 dark:border-dark-border/75`}>
           <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-400 dark:text-dark-muted">
             <Icons.GitCommit />
             <span>Details</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="rounded-full border border-primary-200/90 dark:border-dark-border bg-white/60 dark:bg-dark-border/40 px-2 py-0.5 font-mono text-[10px] text-primary-300 dark:text-dark-muted">#{task.id.substring(0,6)}</span>
             <button onClick={onClose} className="p-2 hover:bg-primary-200/35 dark:hover:bg-dark-border/70 rounded-full text-primary-400 hover:text-primary-800 dark:text-dark-muted dark:hover:text-dark-text transition-colors">
                <Icons.X />
             </button>
           </div>
        </div>

        <div className={`relative flex-1 overflow-y-auto ${isCompact ? 'px-5 py-4 space-y-5' : 'px-7 py-5 space-y-6'} custom-scroll bg-primary-50/80 dark:bg-dark-surface`}>
          
          {/* Title - Clean & Large */}
          <div className="flex items-start gap-3">
             <button 
                onClick={() => onCommit(task)}
                className={`mt-1.5 transition-colors ${task.completed ? 'text-primary-900 dark:text-dark-text' : 'text-primary-300 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text'}`}
             >
                {task.completed ? <div className="scale-125"><Icons.Checked /></div> : <div className="scale-125"><Icons.Circle /></div>}
             </button>
             <div className="flex-1">
               <textarea
                  className={`w-full ${isCompact ? 'text-xl' : 'text-[1.75rem]'} font-semibold text-primary-900 dark:text-dark-text bg-transparent border-none p-0 outline-none resize-none focus:ring-0 placeholder:text-primary-300 dark:placeholder:text-dark-muted leading-[1.18] font-sans`}
                  value={titleDraft}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setTitleDraft(nextTitle);
                    if (titleDebounceRef.current) window.clearTimeout(titleDebounceRef.current);
                    titleDebounceRef.current = window.setTimeout(() => {
                      onUpdate((prevTask) => ({ ...prevTask, title: nextTitle }));
                    }, 150);
                  }}
                  onBlur={() => {
                    if (titleDebounceRef.current) {
                      window.clearTimeout(titleDebounceRef.current);
                      titleDebounceRef.current = null;
                    }
                    if (titleDraft !== task.title) {
                      onUpdate((prevTask) => ({ ...prevTask, title: titleDraft }));
                    }
                  }}
                  rows={2}
                  placeholder="Task title"
               />
               <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-primary-400/90 dark:text-dark-muted">
                 {hasDraftChanges ? 'Editing...' : `${completedSubtasks}/${task.subtasks.length} subtasks done`}
               </div>
             </div>
          </div>

          {/* Properties Flow - Horizontal Chips */}
          <div className={`${isCompact ? 'pl-0' : 'pl-9'} space-y-2.5`}>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Due Date Chip */}
              <div className="relative" ref={dateContainerRef}>
                  <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={`${chipBase} shadow-sm ${
                        task.dueDate
                          ? 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info-text)] shadow-[0_0_0_1px_rgba(60,128,255,.08)]'
                          : neutralChip
                      }`}
                  >
                      <Icons.Calendar />
                      <span>{task.dueDate || 'Set Date'}</span>
                  </button>
                  {showDatePicker && (
                      <DatePicker 
                          selectedDate={task.dueDate}
                          onSelect={(date) => onUpdate({...task, dueDate: date})}
                          onClose={() => setShowDatePicker(false)}
                      />
                  )}
              </div>

              {/* Priority Chip */}
              <button
                  onClick={cyclePriority}
                  className={`${chipBase} font-semibold uppercase tracking-wide shadow-sm ${priorityColors[task.priority]}`}
                  title="Click to cycle priority"
              >
                  <Icons.Flag />
                  <span>{task.priority}</span>
              </button>

              <button
                  onClick={cycleRecurrence}
                  className={`${chipBase} shadow-sm ${
                    task.recurrence
                      ? 'bg-primary-100 dark:bg-dark-border/60 border-primary-200 dark:border-dark-border text-primary-800 dark:text-dark-text'
                      : neutralChip
                  }`}
                  title="Click to cycle repeat frequency"
              >
                  <Icons.Refresh />
                  <span>{recurrenceLabel}</span>
              </button>

              {/* Project Chip */}
              <div className="relative group">
                  <div className={`${chipBase} ${neutralChip} text-primary-700 dark:text-dark-text shadow-sm`}>
                      <Icons.Folder />
                      <span>{task.list || 'Inbox'}</span>
                      <Icons.ChevronDown />
                      <select 
                        value={task.list || 'Inbox'} 
                        onChange={(e) => onUpdate({...task, list: e.target.value})}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      >
                        <option value="Inbox">Inbox</option>
                        {projects.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                  </div>
              </div>

              {/* Add Tag */}
              {isTagInputOpen ? (
                <form
                  onSubmit={(e) => {
                    handleAddTag(e);
                    if (newTag.trim()) setIsTagInputOpen(false);
                  }}
                  className={`${chipBase} ${neutralChip} min-w-[150px] shadow-sm`}
                >
                  <Icons.Tag />
                  <input
                    autoFocus
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onBlur={() => {
                      if (!newTag.trim()) setIsTagInputOpen(false);
                    }}
                    placeholder="Add tag"
                    className="w-full bg-transparent text-sm text-primary-700 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted outline-none"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTagInputOpen(true)}
                  className={`${chipBase} ${neutralChip} shadow-sm`}
                >
                  <Icons.Plus />
                  <span>Add tag</span>
                </button>
              )}
            </div>

            {/* Tags Chips */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {task.tags.map(tag => (
                   <span key={tag} className="flex h-9 items-center gap-1.5 px-3 rounded-full bg-primary-100/90 dark:bg-dark-border/60 border border-primary-200/90 dark:border-dark-border text-primary-700 dark:text-dark-text text-xs font-medium group cursor-default">
                      <Icons.Tag />
                      {tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="w-0 overflow-hidden group-hover:w-4 transition-all opacity-0 group-hover:opacity-100 hover:text-[var(--status-danger-text)]"
                      >
                        <Icons.X />
                      </button>
                   </span>
                 ))}
              </div>
            )}
          </div>

          <hr className={`${sectionInset} border-primary-300 dark:border-dark-border`} />

          {/* Description Section - Fluid */}
          <div className="flex gap-1 group">
             <div className="h-11 w-8 shrink-0 flex items-center justify-center text-primary-400 dark:text-dark-muted group-hover:text-primary-600 dark:group-hover:text-dark-text transition-colors">
<Icons.FileText />
             </div>
             <div className="flex-1 space-y-1">
                <textarea
                  ref={descRef}
                  className="w-full rounded-lg bg-white/55 dark:bg-dark-surface/55 px-3 py-2 text-sm text-primary-800 dark:text-dark-text outline-none min-h-[60px] max-h-[180px] overflow-y-auto resize-none placeholder:text-primary-500 dark:placeholder:text-dark-muted leading-relaxed font-sans border border-dashed border-primary-300 dark:border-dark-border/95 focus:border-primary-500 dark:focus:border-dark-muted focus:bg-white dark:focus:bg-dark-surface"
                  value={descriptionDraft}
                  onChange={(e) => {
                    const nextDescription = e.target.value;
                    setDescriptionDraft(nextDescription);
                    if (descriptionDebounceRef.current) window.clearTimeout(descriptionDebounceRef.current);
                    descriptionDebounceRef.current = window.setTimeout(() => {
                      onUpdate((prevTask) => ({ ...prevTask, description: nextDescription }));
                    }, 220);
                  }}
                  onBlur={() => {
                    if (descriptionDebounceRef.current) {
                      window.clearTimeout(descriptionDebounceRef.current);
                      descriptionDebounceRef.current = null;
                    }
                    const persistedDescription = task.description || '';
                    if (descriptionDraft !== persistedDescription) {
                      onUpdate((prevTask) => ({ ...prevTask, description: descriptionDraft }));
                    }
                  }}
                  placeholder="Add a description..."
                />
             </div>
          </div>

          {/* Subtasks Section - Fluid */}
          <div className="flex gap-1">
             <div className="h-11 w-8 shrink-0 flex items-center justify-center text-primary-400 dark:text-dark-muted">
<Icons.List />
             </div>
             <div className="flex-1 space-y-2">
                 {/* Progress Bar if tasks exist */}
                 {task.subtasks.length > 0 && (
                     <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-1 bg-primary-200/80 dark:bg-dark-border rounded-full overflow-hidden">
                           <div
                             className="h-full bg-primary-900 dark:bg-dark-text rounded-full transition-all duration-300"
                             style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                           />
                        </div>
                        <span className="text-[10px] font-mono text-primary-400">
                           {Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%
                        </span>
                     </div>
                 )}

                 <div className="space-y-1">
                   {task.subtasks.map(sub => (
                     <div key={sub.id} className="group flex items-start gap-3 py-1">
                        <button
                          onClick={() => toggleSubtask(sub.id)}
                          aria-label={sub.completed ? `Mark subtask "${sub.title}" as incomplete` : `Mark subtask "${sub.title}" as complete`}
                          className={`mt-0.5 text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text transition-colors ${sub.completed ? 'text-primary-900 dark:text-dark-text' : ''}`}
                        >
                          {sub.completed ? <div className="scale-90"><Icons.Checked /></div> : <div className="scale-90"><Icons.Circle /></div>}
                        </button>
                        <span className={`flex-1 text-sm font-medium transition-all ${sub.completed ? 'text-primary-400 dark:text-dark-muted line-through' : 'text-primary-800 dark:text-dark-text'}`}>
                          {sub.title}
                        </span>
                        <button
                          onClick={() => deleteSubtask(sub.id)}
                          aria-label={`Delete subtask "${sub.title}"`}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-primary-500 hover:text-[var(--status-danger-text)] transition-all"
                        >
                          <Icons.X />
                        </button>
                     </div>
                   ))}
                 </div>

                 <form onSubmit={addSubtask} className="relative opacity-80 focus-within:opacity-100 transition-opacity duration-200">
                   <input
                     type="text"
                     value={newSubtaskTitle}
                     onChange={(e) => setNewSubtaskTitle(e.target.value)}
                     placeholder="Add subtask"
                     aria-label="Add subtask"
                     className="w-full h-11 rounded-lg border border-dashed border-primary-300 dark:border-dark-border/95 bg-white/55 dark:bg-dark-surface/55 px-3 py-0 leading-[2.75rem] text-sm text-primary-900 dark:text-dark-text placeholder:text-primary-500 dark:placeholder:text-dark-muted outline-none focus:border-primary-500 dark:focus:border-dark-muted focus:bg-white dark:focus:bg-dark-surface"
                   />
                 </form>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`${isCompact ? 'p-4' : 'p-5'} sticky bottom-0 z-10 bg-primary-50/88 dark:bg-dark-surface/90 backdrop-blur-md flex gap-3 border-t border-primary-200/75 dark:border-dark-border/85 shadow-[0_-8px_18px_rgba(0,0,0,0.04)]`}>
           <button 
             onClick={() => onCommit(task)}
             className={`flex-1 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-200 shadow-sm
               ${task.completed
                  ? 'bg-primary-200/50 dark:bg-dark-border text-primary-900 dark:text-dark-text hover:bg-primary-200 dark:hover:bg-dark-border'
                  : 'bg-[var(--accent)] text-white hover:opacity-90 hover:shadow-lg hover:-translate-y-[1px]'}
             `}
           >
             {task.completed ? 'Reopen Task' : 'Complete Task'}
           </button>
           <button 
             onClick={() => onDelete(task.id)}
             className={`px-4 py-3 rounded-full border border-transparent text-primary-400 hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] transition-colors duration-200`}
             title="Delete Task"
           >
             <Icons.Trash />
           </button>
        </div>

      </div>
  );
};

export const StagingPanel = React.memo(StagingPanelComponent);
