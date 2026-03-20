import React, { Suspense, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StagingPanel } from './StagingPanel';
import { MainContent } from './MainContent';
import { CommandPalette } from './CommandPalette';
import { ConfirmDialog } from './ConfirmDialog';
import { SettingsModal } from './SettingsModal';
import type { UseAppStateReturn } from '../hooks/useAppState';

interface AppLayoutProps extends UseAppStateReturn {}

const normalizeDesktopFontSize = (value: number): number => {
  const DESKTOP_FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18] as const;
  if (!Number.isFinite(value)) return 12;
  return DESKTOP_FONT_SIZE_OPTIONS.reduce((nearest, candidate) =>
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest,
  );
};

export const AppLayout: React.FC<AppLayoutProps> = (props) => {
  const {
    tasks,
    filter,
    selectedTask,
    setSelectedTask,
    isSidebarCollapsed,
    handleSidebarToggleCollapse,
    taskCounts,
    handleOpenSettings,
    isFocusActive,
    focusTimeLeft,
    projects,
    addProject,
    deleteProject,
    userProfile,
    setUserProfile,
    isDesktopMac,
    isStartupStatic,
    isRightSidebarOpen,
    requestToggleTask,
    deleteTask,
    updateTask,
    showSettings,
    setShowSettings,
    isDarkMode,
    toggleThemeMode,
    desktopFontSize,
    setDesktopFontSize,
    clearAllLocalData,
    desktopAppVersion,
    isDesktopRuntime,
    desktopUpdateStatus,
    isCheckingDesktopUpdate,
    requestDesktopUpdateCheck,
    handleSidebarFilterChange,
    handleImportData,
    statusMessage,
    undoAction,
    confirmDialog,
    runConfirmAction,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    createTaskFromCommand,
    openTaskFromCommand,
    focusModeType,
    startTimer,
    pauseTimer,
    resetTimer,
    handleSetTimeLeft,
    handleFocusModeChange,
    resetFocusState,
    searchQuery,
    setSearchQuery,
    searchPriority,
    setSearchPriority,
    searchProject,
    setSearchProject,
    filteredTasks,
    taskGroups,
    addTask,
    showTaskInput,
    emptyState,
  } = props;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.closest('[contenteditable="true"]'));

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (props.showSettingsRef?.current) {
          setShowSettings(false);
        } else if (props.selectedTaskRef?.current) {
          setSelectedTask(null);
        }
        return;
      }

      if (!isTextField && e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen, setShowSettings, setSelectedTask]);

  return (
    <div
      className={`[--app-radius:0.75rem] flex flex-col h-dvh rounded-[var(--app-radius)] font-sans text-primary-900 dark:text-dark-text bg-[var(--app-bg)] overflow-hidden transition-colors duration-300 selection:bg-primary-900 selection:text-white dark:selection:bg-primary-100 dark:selection:text-primary-900 ${
        isStartupStatic ? 'startup-static' : ''
      }`}
    >
      {/* Main Layout Container */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* COL 1: Sidebar */}
        <Sidebar
          activeFilter={filter}
          onFilterChange={handleSidebarFilterChange}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={handleSidebarToggleCollapse}
          taskCounts={taskCounts}
          onOpenSettings={handleOpenSettings}
          isFocusActive={isFocusActive}
          focusTimeLeft={focusTimeLeft}
          projects={projects}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          userProfile={userProfile}
          isDesktopMac={isDesktopMac}
        />

        {/* COL 2: Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[var(--app-bg)] relative z-0 transition-colors duration-300">
          <MainContent
            filter={filter}
            focusTimeLeft={focusTimeLeft}
            handleSetTimeLeft={handleSetTimeLeft}
            isFocusActive={isFocusActive}
            startTimer={startTimer}
            pauseTimer={pauseTimer}
            resetTimer={resetTimer}
            focusModeType={focusModeType}
            handleFocusModeChange={handleFocusModeChange}
            tasks={tasks}
            filteredTasks={filteredTasks}
            taskGroups={taskGroups}
            selectedTask={selectedTask}
            requestToggleTask={requestToggleTask}
            setSelectedTask={setSelectedTask}
            deleteTask={deleteTask}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPriority={searchPriority}
            setSearchPriority={setSearchPriority}
            searchProject={searchProject}
            setSearchProject={setSearchProject}
            projects={projects}
            addTask={addTask}
            showTaskInput={showTaskInput}
            emptyState={emptyState}
            userProfile={userProfile}
          />
        </main>

        {/* COL 3: Staging Area */}
        <aside
          className={`
             flex flex-col h-full bg-primary-50 dark:bg-dark-surface overflow-hidden border-l border-primary-200/70 dark:border-dark-border
             transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
             ${isRightSidebarOpen && filter !== 'focus' ? 'w-96 lg:w-80 md:w-72 translate-x-0 opacity-100' : 'w-0 translate-x-10 opacity-0'}
          `}
        >
          <div className="w-96 lg:w-80 md:w-72 h-full flex flex-col min-w-[18rem] max-w-[24rem]">
            {selectedTask ? (
              <StagingPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onCommit={requestToggleTask}
                projects={projects}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                <svg
                  className="w-8 h-8 text-primary-400 dark:text-dark-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                <p className="mt-4 text-xs font-mono text-primary-400">Select a task to view staging details</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 z-[90] bg-primary-900/20" />}>
          <SettingsModal
            onClose={() => setShowSettings(false)}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleThemeMode}
            desktopFontSize={desktopFontSize}
            onChangeDesktopFontSize={(size) => setDesktopFontSize(normalizeDesktopFontSize(size))}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            tasks={tasks}
            onImportData={handleImportData}
            onClearData={clearAllLocalData}
            desktopAppVersion={desktopAppVersion}
            canCheckDesktopUpdate={isDesktopRuntime}
            desktopUpdateStatus={desktopUpdateStatus}
            isCheckingDesktopUpdate={isCheckingDesktopUpdate}
            onCheckDesktopUpdate={requestDesktopUpdateCheck}
          />
        </Suspense>
      )}

      <CommandPalette
        open={isCommandPaletteOpen}
        tasks={tasks}
        onClose={() => setIsCommandPaletteOpen(false)}
        onChangeFilter={handleSidebarFilterChange}
        onOpenSettings={handleOpenSettings}
        onOpenTask={openTaskFromCommand}
        onCreateTask={createTaskFromCommand}
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmTone={confirmDialog?.confirmTone}
        onCancel={() => {
          void runConfirmAction('cancel');
        }}
        onConfirm={() => {
          void runConfirmAction('confirm');
        }}
      />
    </div>
  );
};
