import React, { useState, useRef, useEffect } from 'react';
import { Task, Priority, Subtask } from '../types';
import { Icons } from '../constants';
import { DatePicker } from './DatePicker';

interface StagingPanelProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  onCommit: (task: Task) => void;
  projects: string[];
}

const StagingPanelComponent: React.FC<StagingPanelProps> = ({ task, onClose, onUpdate, onDelete, onCommit, projects }) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const dateContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [task?.description]);

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

  if (!task) return null;

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
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
    const currentIndex = order.findIndex((option) => option?.type === current);
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

  const containerClasses = "h-full flex flex-col bg-transparent";

  const priorityColors = {
    [Priority.HIGH]: 'text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]',
    [Priority.MEDIUM]: 'text-[var(--status-warn-text)] bg-[var(--status-warn-bg)] border-[var(--status-warn-border)]',
    [Priority.LOW]: 'text-[var(--status-success-text)] bg-[var(--status-success-bg)] border-[var(--status-success-border)]',
  };

  return (
      <div className={containerClasses}>
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-8 bg-primary-50 dark:bg-dark-surface shrink-0">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary-400 dark:text-dark-muted">
             <Icons.GitCommit />
             <span>Details</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="font-mono text-[10px] text-primary-300 dark:text-dark-muted">#{task.id.substring(0,6)}</span>
             <button onClick={onClose} className="p-2 hover:bg-primary-200/50 dark:hover:bg-dark-border rounded-full text-primary-400 hover:text-primary-900 dark:text-dark-muted dark:hover:text-dark-text transition-colors">
                <Icons.X />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scroll bg-primary-50 dark:bg-dark-surface">
          
          {/* Title - Clean & Large */}
          <div className="flex items-start gap-3">
             <button 
                onClick={() => onCommit(task)}
                className={`mt-1.5 transition-colors ${task.completed ? 'text-primary-900 dark:text-dark-text' : 'text-primary-300 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text'}`}
             >
                {task.completed ? <div className="scale-125"><Icons.Checked /></div> : <div className="scale-125"><Icons.Circle /></div>}
             </button>
             <textarea
                className="w-full text-2xl font-bold text-primary-900 dark:text-dark-text bg-transparent border-none p-0 outline-none resize-none focus:ring-0 placeholder:text-primary-300 dark:placeholder:text-dark-muted leading-snug font-sans"
                value={task.title}
                onChange={(e) => onUpdate({...task, title: e.target.value})}
                rows={2}
                placeholder="Task title"
             />
          </div>

          {/* Properties Flow - Horizontal Chips */}
          <div className="flex flex-wrap items-center gap-2 pl-9">
              {/* Due Date Chip */}
              <div className="relative" ref={dateContainerRef}>
                  <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                          ${task.dueDate 
                              ? 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info-text)]' 
                              : 'bg-primary-50 dark:bg-dark-surface border-primary-200 dark:border-dark-border text-primary-500 dark:text-dark-muted hover:border-primary-300 dark:hover:border-dark-muted'}
                      `}
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${priorityColors[task.priority]}`}
                  title="Click to cycle priority"
              >
                  <Icons.Flag />
                  <span>{task.priority}</span>
              </button>

              <button
                  onClick={cycleRecurrence}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    task.recurrence
                      ? 'bg-primary-100 dark:bg-dark-border/60 border-primary-200 dark:border-dark-border text-primary-800 dark:text-dark-text'
                      : 'bg-primary-50 dark:bg-dark-surface border-primary-200 dark:border-dark-border text-primary-500 dark:text-dark-muted'
                  }`}
                  title="Click to cycle repeat frequency"
              >
                  <Icons.Refresh />
                  <span>{recurrenceLabel}</span>
              </button>

              {/* Project Chip */}
              <div className="relative group">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-primary-50 dark:bg-dark-surface border-primary-200 dark:border-dark-border text-primary-700 dark:text-dark-text text-xs font-medium hover:border-primary-300 dark:hover:border-dark-muted transition-all">
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

              {/* Tags Chips */}
              {task.tags.map(tag => (
                 <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-dark-border/60 border border-primary-200/80 dark:border-dark-border/80 text-primary-600 dark:text-dark-muted text-xs font-medium group cursor-default">
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

              {/* Add Tag Input */}
              <form onSubmit={handleAddTag} className="flex items-center">
                 <input 
                   type="text" 
                   value={newTag}
                   onChange={(e) => setNewTag(e.target.value)}
                   placeholder="+Tag"
                   className="w-16 focus:w-24 px-2 py-1.5 bg-transparent text-xs text-primary-500 dark:text-dark-muted placeholder:text-primary-400 dark:placeholder:text-dark-muted outline-none border border-transparent focus:border-primary-200 dark:focus:border-dark-border rounded-lg transition-all hover:bg-primary-100 dark:hover:bg-dark-surface focus:bg-primary-50 dark:focus:bg-dark-surface"
                 />
               </form>
          </div>

          <hr className="border-primary-200/80 dark:border-dark-border ml-9" />

          {/* Description Section - Fluid */}
          <div className="flex gap-4 group">
             <div className="mt-1 text-primary-300 dark:text-dark-muted group-hover:text-primary-400 dark:group-hover:text-dark-muted transition-colors">
<Icons.FileText />
             </div>
             <div className="flex-1 space-y-1">
                <textarea 
                  ref={descRef}
                  className="w-full bg-transparent text-sm text-primary-700 dark:text-dark-text outline-none min-h-[80px] resize-none placeholder:text-primary-300 dark:placeholder:text-dark-muted leading-relaxed font-sans"
                  value={task.description || ''}
                  onChange={(e) => onUpdate({...task, description: e.target.value})}
                  placeholder="Add a description..."
                />
             </div>
          </div>

          {/* Subtasks Section - Fluid */}
          <div className="flex gap-4">
             <div className="mt-1 text-primary-300 dark:text-dark-muted">
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
                          className={`mt-0.5 text-primary-300 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text transition-colors ${sub.completed ? 'text-primary-900 dark:text-dark-text' : ''}`}
                        >
                          {sub.completed ? <div className="scale-90"><Icons.Checked /></div> : <div className="scale-90"><Icons.Circle /></div>}
                        </button>
                        <span className={`flex-1 text-sm font-medium transition-all ${sub.completed ? 'text-primary-400 dark:text-dark-muted line-through' : 'text-primary-800 dark:text-dark-text'}`}>
                          {sub.title}
                        </span>
                        <button 
                          onClick={() => deleteSubtask(sub.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-primary-300 hover:text-[var(--status-danger-text)] transition-all"
                        >
                          <Icons.X />
                        </button>
                     </div>
                   ))}
                 </div>

                 <form onSubmit={addSubtask} className="flex items-center gap-3 mt-2 opacity-60 focus-within:opacity-100 transition-opacity">
                   <div className="text-primary-300 dark:text-dark-muted"><Icons.Plus /></div>
                   <input
                     type="text"
                     value={newSubtaskTitle}
                     onChange={(e) => setNewSubtaskTitle(e.target.value)}
                     placeholder="Add subtask"
                     className="flex-1 bg-transparent text-sm text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted outline-none"
                   />
                 </form>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-transparent flex gap-3">
           <button 
             onClick={() => onCommit(task)}
             className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm
               ${task.completed
                  ? 'bg-primary-200/50 dark:bg-dark-border text-primary-900 dark:text-dark-text hover:bg-primary-200 dark:hover:bg-dark-border'
                  : 'bg-[var(--accent)] text-white hover:opacity-90 hover:shadow-lg'}
             `}
           >
             {task.completed ? 'Reopen Task' : 'Complete Task'}
           </button>
           <button 
             onClick={() => onDelete(task.id)}
             className="px-4 py-3 rounded-xl border border-transparent text-primary-400 hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] transition-colors"
             title="Delete Task"
           >
             <Icons.Trash />
           </button>
        </div>

      </div>
  );
};

export const StagingPanel = React.memo(StagingPanelComponent);
