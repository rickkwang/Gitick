import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from '../constants';
import { FilterType, Task } from '../types';
import { searchTasks } from '../utils/taskView';
import { cn } from '../lib/utils';

type CommandAction =
  | { id: string; label: string; kind: 'view'; filter: FilterType }
  | { id: string; label: string; kind: 'settings' }
  | { id: string; label: string; kind: 'create'; title: string }
  | { id: string; label: string; kind: 'task'; task: Task };

interface CommandPaletteProps {
  open: boolean;
  tasks: Task[];
  onClose: () => void;
  onChangeFilter: (filter: FilterType) => void;
  onOpenSettings: () => void;
  onOpenTask: (task: Task) => void;
  onCreateTask: (title: string) => void;
}

const BASE_COMMANDS: CommandAction[] = [
  { id: 'view-dashboard', label: 'Go to Dashboard', kind: 'view', filter: 'next7days' },
  { id: 'view-today', label: 'Go to Today', kind: 'view', filter: 'today' },
  { id: 'view-inbox', label: 'Go to Inbox', kind: 'view', filter: 'inbox' },
  { id: 'view-repository', label: 'Go to Repository', kind: 'view', filter: 'completed' },
  { id: 'view-focus', label: 'Go to Focus Mode', kind: 'view', filter: 'focus' },
  { id: 'open-settings', label: 'Open Settings', kind: 'settings' },
];

// Command kind icons
const CommandIcon: React.FC<{ kind: CommandAction['kind'] }> = ({ kind }) => {
  switch (kind) {
    case 'view':
      return <Icons.Calendar />;
    case 'settings':
      return <Icons.Settings />;
    case 'create':
      return <Icons.Plus />;
    case 'task':
      return <Icons.FileText />;
    default:
      return null;
  }
};

// Command kind colors
const commandKindStyles: Record<CommandAction['kind'], string> = {
  view: 'text-primary-500 dark:text-dark-muted',
  settings: 'text-[var(--accent)]',
  create: 'text-[var(--status-success-text)]',
  task: 'text-primary-400 dark:text-dark-muted',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  tasks,
  onClose,
  onChangeFilter,
  onOpenSettings,
  onOpenTask,
  onCreateTask,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      // Restore focus when closing
      previousActiveElement.current?.focus();
      previousActiveElement.current = null;
    } else {
      // Save current focus and trap focus in palette
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  const commands = useMemo(() => {
    const q = query.trim().toLowerCase();
    const viewCommands = BASE_COMMANDS.filter((command) =>
      command.label.toLowerCase().includes(q),
    );
    const taskMatches =
      q.length > 0
        ? searchTasks(tasks, q)
            .slice(0, 6)
            .map(
              (task): CommandAction => ({
                id: `task-${task.id}`,
                label: `Open task: ${task.title}`,
                kind: 'task',
                task,
              }),
            )
        : [];

    const createCommand =
      q.length > 0
        ? [
            {
              id: 'create-task',
              label: `Create task: "${query.trim()}"`,
              kind: 'create' as const,
              title: query.trim(),
            },
          ]
        : [];

    return [...createCommand, ...viewCommands, ...taskMatches];
  }, [query, tasks]);

  useEffect(() => {
    if (activeIndex >= commands.length) {
      setActiveIndex(commands.length > 0 ? commands.length - 1 : 0);
    }
  }, [activeIndex, commands.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) =>
          commands.length === 0 ? 0 : (prev + 1) % commands.length,
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) =>
          commands.length === 0 ? 0 : (prev - 1 + commands.length) % commands.length,
        );
        return;
      }
      if (event.key === 'Enter') {
        const command = commands[activeIndex];
        if (!command) return;
        event.preventDefault();
        if (command.kind === 'view') onChangeFilter(command.filter);
        if (command.kind === 'settings') onOpenSettings();
        if (command.kind === 'create') onCreateTask(command.title);
        if (command.kind === 'task') onOpenTask(command.task);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeIndex,
    commands,
    onChangeFilter,
    onClose,
    onCreateTask,
    onOpenSettings,
    onOpenTask,
    open,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl mt-12 rounded-2xl border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface shadow-2xl overflow-hidden animate-view-breathe">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-primary-200/80 dark:border-dark-border">
          <span className="text-primary-400 dark:text-dark-muted">
            <Icons.Search />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command, search tasks, or create a new task…"
            autoFocus
            aria-label="Command palette search"
            className="flex-1 bg-transparent outline-none text-sm text-primary-900 dark:text-dark-text placeholder:text-primary-400 dark:placeholder:text-dark-muted"
          />
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-primary-100 dark:bg-dark-bg text-primary-500 dark:text-dark-muted">
            esc
          </span>
        </div>

        {/* Command List */}
        <div className="max-h-[55vh] overflow-y-auto py-2">
          {commands.length === 0 ? (
            <div className="px-4 py-6 text-sm text-primary-500 dark:text-dark-muted">
              No matching command.
            </div>
          ) : (
            commands.map((command, index) => (
              <div key={command.id} className="relative">
                {/* Left Indicator Bar */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full transition-all duration-200',
                    index === activeIndex
                      ? 'bg-[var(--accent)] opacity-100'
                      : 'bg-transparent opacity-0',
                  )}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (command.kind === 'view') onChangeFilter(command.filter);
                    if (command.kind === 'settings') onOpenSettings();
                    if (command.kind === 'create') onCreateTask(command.title);
                    if (command.kind === 'task') onOpenTask(command.task);
                    onClose();
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 pl-5 text-sm transition-colors duration-150 flex items-center gap-3',
                    index === activeIndex
                      ? 'bg-primary-200/60 dark:bg-dark-border/60 text-primary-900 dark:text-dark-text'
                      : 'text-primary-700 dark:text-dark-muted hover:bg-primary-100 dark:hover:bg-dark-border/50',
                  )}
                >
                  {/* Command Type Icon */}
                  <span className={cn('shrink-0', commandKindStyles[command.kind])}>
                    <CommandIcon kind={command.kind} />
                  </span>

                  {/* Label */}
                  <span className="flex-1 truncate">{command.label}</span>

                  {/* Enter hint on active */}
                  {index === activeIndex && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-200 dark:bg-dark-border text-primary-500 dark:text-dark-muted shrink-0">
                      Enter
                    </span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2.5 border-t border-primary-200/80 dark:border-dark-border text-[10px] text-primary-500 dark:text-dark-muted flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Icons.Command /> <span id="command-palette-title">Command palette</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded bg-primary-100 dark:bg-dark-border font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-primary-100 dark:bg-dark-border font-mono">↓</kbd>
              <span className="ml-1">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-primary-100 dark:bg-dark-border font-mono">Enter</kbd>
              <span>run</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
