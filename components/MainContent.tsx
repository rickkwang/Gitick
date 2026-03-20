import React, { Suspense, lazy } from 'react';
import { FocusMode } from './FocusMode';
import { TaskInput } from './TaskInput';
import { TaskItem } from './TaskItem';
import { SearchFilterBar } from './SearchFilterBar';
import { Task, FilterType } from '../types';

const Heatmap = lazy(() => import('./Heatmap').then((module) => ({ default: module.Heatmap })));
const GitGraph = lazy(() => import('./GitGraph').then((module) => ({ default: module.GitGraph })));

interface MainContentProps {
  filter: FilterType;
  focusTimeLeft: number;
  handleSetTimeLeft: (time: number) => void;
  isFocusActive: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  focusModeType: 'pomodoro' | 'stopwatch';
  handleFocusModeChange: (mode: 'pomodoro' | 'stopwatch') => void;
  tasks: Task[];
  filteredTasks: Task[];
  taskGroups: Record<string, Task[]> | null;
  selectedTask: Task | null;
  requestToggleTask: (task: Task) => void;
  setSelectedTask: (task: Task | null) => void;
  deleteTask: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPriority: 'all' | 'high' | 'medium' | 'low';
  setSearchPriority: (priority: 'all' | 'high' | 'medium' | 'low') => void;
  searchProject: 'all' | string;
  setSearchProject: (project: 'all' | string) => void;
  projects: string[];
  addTask: (newTaskData: Omit<Task, 'id' | 'createdAt'>) => void;
  showTaskInput: boolean;
  emptyState: { icon: React.ReactNode; title: string; sub: string };
  userProfile: {
    name: string;
    email: string;
    jobTitle: string;
    avatarColor: string;
    avatarImage: string;
  };
}

const renderEmptyState = (emptyState: { icon: React.ReactNode; title: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center pt-12 md:pt-14 text-center select-none opacity-60">
    <div className="w-20 h-20 rounded-xl bg-primary-50 dark:bg-dark-bg border border-primary-200/80 dark:border-dark-border/80 flex items-center justify-center text-primary-300 dark:text-dark-muted mb-6 shadow-sm">
      <div className="scale-150">{emptyState.icon}</div>
    </div>
    <p className="text-base font-medium text-primary-900 dark:text-dark-text">{emptyState.title}</p>
    <p className="text-xs font-mono text-primary-400 dark:text-dark-muted mt-2">{emptyState.sub}</p>
  </div>
);

const renderTaskList = (
  taskList: Task[],
  groupName: string | undefined,
  selectedTask: Task | null,
  requestToggleTask: (task: Task) => void,
  setSelectedTask: (task: Task | null) => void,
) => {
  if (taskList.length === 0) return null;

  let headerClass = 'text-primary-900 dark:text-dark-text';
  if (groupName === 'Overdue') headerClass = 'text-[var(--status-danger-text)]';
  if (groupName === 'Today') headerClass = 'text-[var(--status-info-text)]';

  return (
    <div className="mb-6">
      {groupName && (
        <div
          className={`sticky top-0 bg-[var(--app-bg)] z-10 py-3 mb-2 flex items-center gap-2.5 transition-colors ${headerClass} px-6`}
        >
          <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{groupName}</span>
          <span className="text-[10px] font-bold font-mono opacity-60 bg-primary-200/40 dark:bg-dark-border px-2 py-0.5 rounded-full text-primary-900 dark:text-dark-text min-w-[1.5rem] text-center">
            {taskList.length}
          </span>
        </div>
      )}
      <div className="space-y-2">
        {taskList.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={requestToggleTask}
            selected={selectedTask?.id === task.id}
            onSelect={setSelectedTask}
          />
        ))}
      </div>
    </div>
  );
};

export const MainContent: React.FC<MainContentProps> = ({
  filter,
  focusTimeLeft,
  handleSetTimeLeft,
  isFocusActive,
  startTimer,
  pauseTimer,
  resetTimer,
  focusModeType,
  handleFocusModeChange,
  tasks,
  filteredTasks,
  taskGroups,
  selectedTask,
  requestToggleTask,
  setSelectedTask,
  deleteTask,
  searchQuery,
  setSearchQuery,
  searchPriority,
  setSearchPriority,
  searchProject,
  setSearchProject,
  projects,
  addTask,
  showTaskInput,
  emptyState,
  userProfile,
}) => {
  return (
    <div className="h-full flex flex-col">
      {filter === 'focus' ? (
        <FocusMode
          timeLeft={focusTimeLeft}
          setTimeLeft={handleSetTimeLeft}
          isActive={isFocusActive}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          mode={focusModeType}
          setMode={handleFocusModeChange}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full relative">
          {/* Scrollable List Area */}
          <div className="flex-1 overflow-y-auto main-scroll scroll-smooth">
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-6 lg:px-8 py-6">
              {filter !== 'focus' && (
                <SearchFilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPriority={searchPriority}
                  onPriorityChange={setSearchPriority}
                  searchProject={searchProject}
                  onProjectChange={setSearchProject}
                  projects={projects}
                />
              )}

              {/* Heatmap Section */}
              {filter === 'next7days' && (
                <div className="mb-6">
                  <div className="w-full max-w-[1200px] mx-auto p-4 md:p-5 bg-primary-50 dark:bg-dark-surface rounded-xl shadow-sm border border-primary-200/85 dark:border-dark-border/85">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-bold text-primary-900 dark:text-dark-text uppercase tracking-wider flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                          />
                        </svg>
                        Contributions
                      </h3>
                    </div>
                    <Suspense
                      fallback={
                        <div className="h-24 animate-pulse rounded-lg bg-primary-200/50 dark:bg-dark-surface/70" />
                      }
                    >
                      <Heatmap tasks={tasks} />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* LIST RENDERING */}
              <div className="w-full max-w-[1200px] mx-auto">
                {filter === 'completed' ? (
                  <Suspense
                    fallback={
                      <div className="h-40 animate-pulse rounded-xl bg-primary-200/50 dark:bg-dark-border/60" />
                    }
                  >
                    <GitGraph
                      tasks={filteredTasks}
                      onDelete={deleteTask}
                      userProfile={userProfile}
                    />
                  </Suspense>
                ) : (
                  <div className="pb-28">
                    {/* Grouped View for Dashboard (TickTick Style) */}
                    {filter === 'next7days' && taskGroups ? (
                      Object.values(taskGroups).flat().length === 0 ? (
                        renderEmptyState(emptyState)
                      ) : (
                        <>
                          {renderTaskList(
                            taskGroups['Overdue'],
                            'Overdue',
                            selectedTask,
                            requestToggleTask,
                            setSelectedTask,
                          )}
                          {renderTaskList(
                            taskGroups['Today'],
                            'Today',
                            selectedTask,
                            requestToggleTask,
                            setSelectedTask,
                          )}
                          {renderTaskList(
                            taskGroups['Tomorrow'],
                            'Tomorrow',
                            selectedTask,
                            requestToggleTask,
                            setSelectedTask,
                          )}
                          {renderTaskList(
                            taskGroups['Next 7 Days'],
                            'Next 7 Days',
                            selectedTask,
                            requestToggleTask,
                            setSelectedTask,
                          )}
                        </>
                      )
                    ) : filteredTasks.length > 0 ? (
                      <div className="space-y-2.5">
                        {filteredTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={requestToggleTask}
                            selected={selectedTask?.id === task.id}
                            onSelect={setSelectedTask}
                          />
                        ))}
                      </div>
                    ) : (
                      renderEmptyState(emptyState)
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL COMMAND BAR (Floating Bottom with Gradient Mask) */}
          {showTaskInput && (
            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
              {/* Gradient Mask */}
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-[var(--app-bg)]/92 dark:bg-[var(--app-bg)]/88" />

              {/* Input Container - Padded from bottom including Safe Area */}
              <div className="relative z-10 w-full flex justify-center px-4 md:px-6 lg:px-8 pt-8 pb-3">
                <div className="max-w-[1200px] w-full pointer-events-auto">
                  <TaskInput onAddTask={addTask} activeList={filter} projects={projects} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
