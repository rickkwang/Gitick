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
  variant: 'modal' | 'sidebar';
  projects: string[];
}

export const StagingPanel: React.FC<StagingPanelProps> = ({ task, onClose, onUpdate, onDelete, onCommit, variant, projects }) => {
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

  // Mobile Variant acts as Bottom Sheet
  const containerClasses = variant === 'modal' 
    ? "fixed inset-x-0 bottom-0 z-50 h-[85dvh] bg-white dark:bg-[#2b3038] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-bottom-full pb-safe"
    : "h-full flex flex-col bg-transparent";

  const Backdrop = () => variant === 'modal' ? (
    <div 
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      onClick={onClose}
    />
  ) : null;

  const priorityColors = {
    [Priority.HIGH]: 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400',
    [Priority.MEDIUM]: 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-400',
    [Priority.LOW]: 'text-green-600 bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400',
  };

  return (
    <>
      <Backdrop />
      
      <div className={containerClasses}>
        
        {/* Mobile Handle */}
        {variant === 'modal' && (
           <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
           </div>
        )}

        {/* Minimal Header */}
        <div className={`h-14 flex items-center justify-between px-6 md:px-8 ${variant === 'modal' ? '' : 'bg-white dark:bg-[#2b3038]'} shrink-0`}>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
             <Icons.GitCommit />
             <span>Details</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="font-mono text-[10px] text-gray-300 dark:text-zinc-700">#{task.id.substring(0,6)}</span>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-black dark:text-zinc-500 dark:hover:text-white transition-colors">
                <Icons.X />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-6 custom-scroll bg-white dark:bg-[#2b3038]">
          
          {/* Title - Clean & Large */}
          <div className="flex items-start gap-3">
             <button 
                onClick={() => onCommit(task)}
                className={`mt-1.5 transition-colors ${task.completed ? 'text-black dark:text-white' : 'text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white'}`}
             >
                {task.completed ? <div className="scale-125"><Icons.Checked /></div> : <div className="scale-125"><Icons.Circle /></div>}
             </button>
             <textarea 
                className="w-full text-xl md:text-2xl font-bold text-black dark:text-white bg-transparent border-none p-0 outline-none resize-none focus:ring-0 placeholder:text-gray-300 dark:placeholder:text-zinc-700 leading-snug font-sans"
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
                              ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'bg-white dark:bg-[#252a33] border-gray-200 dark:border-[#3a404c] text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-500'}
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
                  <Icons.Activity />
                  <span>{task.priority}</span>
              </button>

              {/* Project Chip */}
              <div className="relative group">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-[#252a33] border-gray-200 dark:border-[#3a404c] text-gray-700 dark:text-zinc-300 text-xs font-medium hover:border-gray-300 dark:hover:border-zinc-500 transition-all">
                      <Icons.Folder />
                      <span>{task.list || 'Inbox'}</span>
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
                 <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#252a33] border border-zinc-200 dark:border-[#3a404c] text-zinc-600 dark:text-zinc-400 text-xs font-medium group cursor-default">
                    <Icons.Tag />
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)}
                      className="w-0 overflow-hidden group-hover:w-4 transition-all opacity-0 group-hover:opacity-100 hover:text-red-500"
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
                   className="w-16 focus:w-24 px-2 py-1.5 bg-transparent text-xs text-gray-500 dark:text-zinc-400 placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none border border-transparent focus:border-gray-200 dark:focus:border-[#3a404c] rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-[#252a33] focus:bg-white dark:focus:bg-[#252a33]"
                 />
               </form>
          </div>

          <hr className="border-gray-100 dark:border-[#3a404c] ml-9" />

          {/* Description Section - Fluid */}
          <div className="flex gap-4 group">
             <div className="mt-1 text-gray-300 dark:text-zinc-600 group-hover:text-gray-400 dark:group-hover:text-zinc-500 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             </div>
             <div className="flex-1 space-y-1">
                <textarea 
                  ref={descRef}
                  className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none min-h-[80px] resize-none placeholder:text-gray-300 dark:placeholder:text-zinc-700 leading-relaxed font-sans"
                  value={task.description || ''}
                  onChange={(e) => onUpdate({...task, description: e.target.value})}
                  placeholder="Add a description..."
                />
             </div>
          </div>

          {/* Subtasks Section - Fluid */}
          <div className="flex gap-4">
             <div className="mt-1 text-gray-300 dark:text-zinc-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><polyline points="3 6 3.01 6"></polyline><polyline points="3 12 3.01 12"></polyline><polyline points="3 18 3.01 18"></polyline></svg>
             </div>
             <div className="flex-1 space-y-2">
                 {/* Progress Bar if tasks exist */}
                 {task.subtasks.length > 0 && (
                     <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-1 bg-gray-100 dark:bg-[#3a404c] rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-black dark:bg-white rounded-full transition-all duration-300"
                             style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                           />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                           {Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%
                        </span>
                     </div>
                 )}

                 <div className="space-y-1">
                   {task.subtasks.map(sub => (
                     <div key={sub.id} className="group flex items-start gap-3 py-1">
                        <button 
                          onClick={() => toggleSubtask(sub.id)}
                          className={`mt-0.5 text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors ${sub.completed ? 'text-black dark:text-white' : ''}`}
                        >
                          {sub.completed ? <div className="scale-90"><Icons.Checked /></div> : <div className="scale-90"><Icons.Circle /></div>}
                        </button>
                        <span className={`flex-1 text-sm font-medium transition-all ${sub.completed ? 'text-gray-400 dark:text-zinc-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                          {sub.title}
                        </span>
                        <button 
                          onClick={() => deleteSubtask(sub.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Icons.X />
                        </button>
                     </div>
                   ))}
                 </div>

                 <form onSubmit={addSubtask} className="flex items-center gap-3 mt-2 opacity-60 focus-within:opacity-100 transition-opacity">
                   <div className="scale-90 text-gray-300 dark:text-zinc-600"><Icons.Plus /></div>
                   <input 
                     type="text" 
                     value={newSubtaskTitle}
                     onChange={(e) => setNewSubtaskTitle(e.target.value)}
                     placeholder="Add subtask"
                     className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none"
                   />
                 </form>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 md:p-6 ${variant === 'modal' ? 'bg-white dark:bg-[#2b3038] border-t border-gray-50 dark:border-[#3a404c]' : 'bg-transparent'} flex gap-3`}>
           <button 
             onClick={() => onCommit(task)}
             className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm
               ${task.completed 
                  ? 'bg-gray-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700' 
                  : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 hover:shadow-lg'}
             `}
           >
             {task.completed ? 'Reopen Task' : 'Complete Task'}
           </button>
           <button 
             onClick={() => onDelete(task.id)}
             className="px-4 py-3 rounded-xl border border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
             title="Delete Task"
           >
             <Icons.Trash />
           </button>
        </div>

      </div>
    </>
  );
};
