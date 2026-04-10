import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { StagingPanel } from './StagingPanel';
import { MainContent } from './MainContent';
import { CommandPalette } from './CommandPalette';
import { ConfirmDialog } from './ConfirmDialog';
import { SettingsModal } from './SettingsModal';
import type { UseAppStateReturn } from '../hooks/useAppState';
import { normalizeDesktopFontSize } from '../lib/utils';

interface AppLayoutProps extends UseAppStateReturn {}

export const AppLayout: React.FC<AppLayoutProps> = (props) => {
  const RIGHT_PANEL_BASE_MIN_WIDTH = 360;
  const RIGHT_PANEL_BASE_MAX_WIDTH = 560;
  const RIGHT_PANEL_BASE_DEFAULT_WIDTH = 420;
  const RIGHT_PANEL_COMPACT_ENTER = 418;
  const RIGHT_PANEL_COMPACT_EXIT = 442;
  const RIGHT_PANEL_STORAGE_KEY = 'gitick.rightPanelWidth';
  const getRightPanelBounds = useCallback((viewportWidth: number) => {
    const dynamicMin = Math.min(RIGHT_PANEL_BASE_MIN_WIDTH, Math.floor(viewportWidth * 0.42));
    const dynamicMax = Math.min(RIGHT_PANEL_BASE_MAX_WIDTH, Math.floor(viewportWidth * 0.62));
    const minWidth = Math.max(320, dynamicMin);
    const maxWidth = Math.max(minWidth + 36, dynamicMax);
    const defaultWidth = Math.min(maxWidth, Math.max(minWidth, RIGHT_PANEL_BASE_DEFAULT_WIDTH));
    return { minWidth, maxWidth, defaultWidth };
  }, []);

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
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return RIGHT_PANEL_BASE_DEFAULT_WIDTH;
    const { minWidth, maxWidth, defaultWidth } = getRightPanelBounds(window.innerWidth);
    const raw = window.localStorage.getItem(RIGHT_PANEL_STORAGE_KEY);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return defaultWidth;
    return Math.min(maxWidth, Math.max(minWidth, parsed));
  });
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const rightPanelActive = isRightSidebarOpen && filter !== 'focus';
  const [isRightPanelCompact, setIsRightPanelCompact] = useState(rightPanelWidth < RIGHT_PANEL_COMPACT_ENTER);

  const handleRightPanelResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!rightPanelActive) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingRightPanel(true);
  }, [rightPanelActive]);

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
        } else if (showSettings) {
          setShowSettings(false);
        } else if (selectedTask) {
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
  }, [isCommandPaletteOpen, showSettings, selectedTask, setIsCommandPaletteOpen, setShowSettings, setSelectedTask]);

  useEffect(() => {
    const { minWidth, maxWidth } = getRightPanelBounds(window.innerWidth);
    setRightPanelWidth((prevWidth) => Math.min(maxWidth, Math.max(minWidth, prevWidth)));
  }, [getRightPanelBounds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, String(rightPanelWidth));
  }, [rightPanelWidth]);

  useEffect(() => {
    const handleViewportResize = () => {
      const { minWidth, maxWidth } = getRightPanelBounds(window.innerWidth);
      setRightPanelWidth((prevWidth) => Math.min(maxWidth, Math.max(minWidth, prevWidth)));
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, [getRightPanelBounds]);

  useEffect(() => {
    setIsRightPanelCompact((prevCompact) => {
      if (prevCompact) return rightPanelWidth < RIGHT_PANEL_COMPACT_EXIT;
      return rightPanelWidth < RIGHT_PANEL_COMPACT_ENTER;
    });
  }, [rightPanelWidth]);

  useEffect(() => {
    if (!isResizingRightPanel) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handlePointerMove = (event: PointerEvent) => {
      const viewportWidth = window.innerWidth;
      const { minWidth, maxWidth } = getRightPanelBounds(viewportWidth);
      const proposedWidth = viewportWidth - event.clientX;
      const clampedWidth = Math.min(maxWidth, Math.max(minWidth, proposedWidth));
      setRightPanelWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      setIsResizingRightPanel(false);
    };
    const handlePointerCancel = () => {
      setIsResizingRightPanel(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [getRightPanelBounds, isResizingRightPanel]);

  return (
    <div
      style={{ borderRadius: 'var(--app-radius)' }}
      className={`[--app-radius:10px] flex flex-col h-dvh font-sans text-primary-900 dark:text-dark-text bg-[var(--app-bg)] overflow-hidden transition-colors duration-300 selection:bg-primary-900 selection:text-white dark:selection:bg-primary-100 dark:selection:text-primary-900 ${
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
             relative flex flex-col h-full bg-primary-50 dark:bg-dark-surface overflow-hidden border-l border-primary-200/70 dark:border-dark-border
             transition-[width,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]
             ${isResizingRightPanel ? 'duration-0' : ''}
          `}
          style={{
            width: rightPanelActive ? rightPanelWidth : 0,
            opacity: rightPanelActive ? 1 : 0,
            transform: rightPanelActive ? 'translateX(0)' : 'translateX(24px)',
          }}
        >
          {rightPanelActive && (
            <button
              type="button"
              aria-label="Resize details panel"
              onPointerDown={handleRightPanelResizeStart}
              className="absolute -left-1 top-0 h-full w-2 cursor-col-resize z-20 group"
            >
              <span className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-300/50 dark:bg-dark-muted/50 opacity-0 group-hover:opacity-100 group-hover:bg-accent/60 transition-all duration-150" />
            </button>
          )}
          <div className="w-full h-full flex flex-col min-w-0">
            {selectedTask ? (
              <StagingPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onCommit={requestToggleTask}
                projects={projects}
                isCompact={isRightPanelCompact}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-dark-bg border border-primary-200/60 dark:border-dark-border/60 flex items-center justify-center mb-4 opacity-50">
                  <svg
                    className="w-6 h-6 text-primary-400 dark:text-dark-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium text-primary-400 dark:text-dark-muted opacity-70">选择任务查看详情</p>
                <p className="mt-1 text-[10px] font-mono text-primary-300 dark:text-dark-muted/60 opacity-60">Click any task to inspect</p>
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
