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

  // Mobile Variant acts as Bottom Sheet
  const containerClasses = variant === 'modal' 
    ? "fixed inset-x-0 bottom-0 z-50 h-[85dvh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-bottom-full pb-safe"
    : "h-full flex flex-col bg-transparent";

  const Backdrop = () => variant === 'modal' ? (
    <div 
      className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      onClick={onClose}
    />
  ) : null;

  return (
    <>
      <Backdrop />
      
      <div className={containerClasses}>
        
        {/* Mobile Handle (Visual Indication) */}
        {variant === 'modal' && (
           <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
           </div>
        )}

        {/* Header - Frameless */}
        <div className={`h-12 flex items-center justify-between px-6 ${variant === 'modal' ? '' : 'bg-white dark:bg-zinc-950'} shrink-0`}>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
             <Icons.GitCommit />
             <span>Task Details</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="font-mono text-[10px] text-gray-300 dark:text-zinc-700">#{task.id.substring(0,6)}</span>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-black dark:text-zinc-500 dark:hover:text-white transition-colors" title="Close Details">
                <Icons.X />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scroll bg-white dark:bg-zinc-950/50">
          
          {/* Title Block */}
          <div className="group">
             <div className="relative">
                <button 
                  onClick={() => onCommit(task)}
                  className={`absolute top-1 left-0 transition-colors ${task.completed ? 'text-black dark:text-white' : 'text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white'}`}
                >
                  {task.completed ? <Icons.Checked /> : <Icons.Circle />}
                </button>
                <textarea 
                  className="w-full text-lg font-bold text-black dark:text-white bg-transparent border-none p-0 pl-8 outline-none resize-none focus:ring-0 placeholder:text-gray-300 dark:placeholder:text-zinc-700 leading-normal font-mono"
                  value={task.title}
                  onChange={(e) => onUpdate({...task, title: e.target.value})}
                  rows={2}
                  placeholder="Task title"
                />
             </div>
          </div>

          {/* Properties Card */}
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-1 border border-transparent dark:border-zinc-800">
             {/* Due Date - Custom DatePicker */}
             <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800 relative" ref={dateContainerRef}>
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 flex items-center gap-2">
                  <Icons.Calendar /> Due Date
                </label>
                
                <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="relative group text-right"
                >
                   <span className="text-xs font-mono text-black dark:text-white border-b border-dashed border-gray-300 dark:border-zinc-700 group-hover:border-black dark:group-hover:border-white transition-colors pb-0.5">
                     {task.dueDate || "No Date"}
                   </span>
                </button>

                {showDatePicker && (
                    <DatePicker 
                        selectedDate={task.dueDate}
                        onSelect={(date) => onUpdate({...task, dueDate: date})}
                        onClose={() => setShowDatePicker(false)}
                    />
                )}
             </div>

             {/* Priority */}
             <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800">
               <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 flex items-center gap-2">
                 <Icons.Activity /> Priority
               </label>
               <div className="flex gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-gray-100 dark:border-transparent">
                 {(Object.values(Priority) as Priority[]).map((p) => (
                   <button
                    key={p}
                    onClick={() => onUpdate({ ...task, priority: p })}
                    className={`
                      px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all
                      ${task.priority === p 
                        ? 'bg-black dark:bg-zinc-600 text-white shadow-sm' 
                        : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}
                    `}
                   >
                     {p}
                   </button>
                 ))}
               </div>
             </div>

             {/* Project */}
             <div className="flex items-center justify-between p-3">
                <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 flex items-center gap-2">
                  <Icons.Folder /> Project
                </label>
                <div className="relative">
                  <select 
                    value={task.list || 'Inbox'} 
                    onChange={(e) => onUpdate({...task, list: e.target.value})}
                    className="appearance-none bg-transparent text-xs font-bold text-black dark:text-white text-right pr-4 outline-none cursor-pointer z-10 relative"
                  >
                    <option value="Inbox" className="text-black bg-white">Inbox</option>
                    {projects.map(p => (
                      <option key={p} value={p} className="text-black bg-white">{p}</option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
             </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 flex items-center gap-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
               {task.tags.map(tag => (
                 <span key={tag} className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-100 dark:hover:border-red-900/20 hover:text-red-500 transition-colors cursor-default">
                    <Icons.Tag />
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                    >
                      <Icons.X />
                    </button>
                 </span>
               ))}
               
               <form onSubmit={handleAddTag} className="inline-flex">
                 <input 
                   type="text" 
                   value={newTag}
                   onChange={(e) => setNewTag(e.target.value)}
                   placeholder="+ Tag"
                   className="w-24 focus:w-32 px-2 py-1 bg-transparent text-[10px] text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none border border-transparent focus:border-gray-200 dark:focus:border-zinc-700 rounded-md transition-all hover:bg-gray-50 dark:hover:bg-zinc-900"
                 />
               </form>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 flex items-center gap-2">
                  Subtasks
                </label>
                <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-600">
                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                </span>
             </div>
             
             <div className="space-y-1">
               {task.subtasks.map(sub => (
                 <div key={sub.id} className="group flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                    <button 
                      onClick={() => toggleSubtask(sub.id)}
                      className={`text-gray-300 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors ${sub.completed ? 'text-black dark:text-white' : ''}`}
                    >
                      {sub.completed ? <Icons.Checked /> : <Icons.Circle />}
                    </button>
                    <span className={`flex-1 text-xs font-medium font-mono ${sub.completed ? 'text-gray-400 dark:text-zinc-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                      {sub.title}
                    </span>
                    <button 
                      onClick={() => deleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Icons.Trash />
                    </button>
                 </div>
               ))}
             </div>

             <form onSubmit={addSubtask} className="relative mt-2">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600">
                 <Icons.Plus />
               </div>
               <input 
                 type="text" 
                 value={newSubtaskTitle}
                 onChange={(e) => setNewSubtaskTitle(e.target.value)}
                 placeholder="Add subtask..."
                 className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-xs outline-none border border-transparent focus:bg-white dark:focus:bg-zinc-800 focus:border-gray-200 dark:focus:border-zinc-700 transition-all text-black dark:text-white font-mono"
               />
             </form>
          </div>

          {/* Description */}
          <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Description</label>
             <textarea 
               ref={descRef}
               className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none min-h-[100px] resize-none placeholder:text-gray-300 dark:placeholder:text-zinc-700 leading-relaxed p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-mono"
               value={task.description || ''}
               onChange={(e) => onUpdate({...task, description: e.target.value})}
               placeholder="No description provided."
             />
          </div>
        </div>

        {/* Footer Actions - Frameless */}
        <div className={`p-4 ${variant === 'modal' ? 'bg-white dark:bg-zinc-900 border-t border-gray-50 dark:border-zinc-800' : 'bg-transparent'} flex gap-3`}>
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