import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../constants';
import { UserProfile, Task } from '../types';
import { sanitizeTaskList } from '../utils/taskSanitizer';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsModalProps {
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  desktopFontSize: number;
  onChangeDesktopFontSize: (size: number) => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  tasks: Task[];
  onImportData: (tasks: Task[]) => void;
  onClearData: () => void;
  desktopAppVersion: string;
  canCheckDesktopUpdate: boolean;
  desktopUpdateStatus: string;
  isCheckingDesktopUpdate: boolean;
  onCheckDesktopUpdate: () => Promise<void>;
}

type SettingsTab = 'profile' | 'general' | 'data' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isDarkMode,
  onToggleTheme,
  desktopFontSize,
  onChangeDesktopFontSize,
  userProfile,
  onUpdateProfile,
  tasks,
  onImportData,
  onClearData,
  desktopAppVersion,
  canCheckDesktopUpdate,
  desktopUpdateStatus,
  isCheckingDesktopUpdate,
  onCheckDesktopUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [importError, setImportError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Local state for profile form to avoid constant re-renders on every keystroke
  const [localProfile, setLocalProfile] = useState(userProfile);
  useEffect(() => {
    setLocalProfile(userProfile);
  }, [userProfile]);

  const handleProfileSave = () => {
    onUpdateProfile(localProfile);
    // Visual feedback usually goes here, but we'll assume fast update
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Avatar must be an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar file is too large. Max size is 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result !== 'string') {
        setAvatarError('Failed to read avatar image.');
        return;
      }
      const nextProfile = { ...localProfile, avatarImage: result };
      setLocalProfile(nextProfile);
      onUpdateProfile(nextProfile);
      setAvatarError('');
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const nextProfile = { ...localProfile, avatarImage: '' };
    setLocalProfile(nextProfile);
    onUpdateProfile(nextProfile);
    setAvatarError('');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gitick-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const sanitizedTasks = sanitizeTaskList(json);
        if (sanitizedTasks.length === 0) {
          setImportError('No valid tasks found in this file');
          return;
        }
        onImportData(sanitizedTasks);
        setImportError('');
        onClose(); // Close modal on success
      } catch (err) {
        if (err instanceof Error) {
          setImportError(err.message);
        } else {
          setImportError('Invalid JSON file');
        }
      }
    };
    reader.readAsText(file);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'My Account', icon: <Icons.User /> },
    { id: 'general', label: 'Appearance', icon: <Icons.Monitor /> },
    { id: 'data', label: 'Data & Sync', icon: <Icons.Briefcase /> },
    { id: 'about', label: 'About', icon: <Icons.GitCommit /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-6">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-primary-50 dark:bg-dark-bg rounded-xl shadow-lg border border-primary-200/80 dark:border-dark-border overflow-hidden flex flex-col md:flex-row h-[96dvh] md:h-[min(780px,88vh)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar Nav - Horizontal on Mobile */}
        <div className="w-full md:w-72 bg-primary-100 dark:bg-dark-surface border-b md:border-b-0 md:border-r border-primary-200/80 dark:border-dark-border px-4 py-4 md:px-6 md:py-7 flex flex-col shrink-0 pt-safe md:pt-7">
          <div className="flex items-center justify-between mb-4 md:mb-7">
             <h2 className="text-lg font-bold text-primary-900 dark:text-dark-text">Settings</h2>
             <button onClick={onClose} aria-label="Close settings" className="md:hidden text-primary-500 p-1">
               <Icons.X />
             </button>
          </div>
          <nav className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-2.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-dark-border text-primary-900 dark:text-dark-text shadow-sm border border-transparent'
                    : 'text-primary-500 dark:text-dark-muted hover:text-primary-900 dark:hover:text-dark-text hover:bg-primary-200/50 dark:hover:bg-dark-border/50 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="mt-4 md:mt-auto hidden md:block">
             <div className="rounded-xl border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-bg/70 px-3 py-2 text-[10px] text-primary-500 dark:text-dark-muted font-mono">
                App Version: {desktopAppVersion || 'Web'}
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-primary-50 dark:bg-dark-bg pb-safe">
           <div className="hidden md:flex items-center justify-between px-10 py-7 border-b border-primary-200/80 dark:border-dark-border shrink-0">
              <h3 className="font-semibold text-xl text-primary-900 dark:text-dark-text">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <button onClick={onClose} aria-label="Close settings" className="text-primary-400 hover:text-primary-900 dark:hover:text-dark-text transition-colors">
                <Icons.X />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto px-5 py-5 md:px-10 md:py-8 space-y-10">
             
             {/* --- PROFILE TAB --- */}
             {activeTab === 'profile' && (
               <div className="space-y-7">
                 <div className="rounded-lg border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface p-5 md:p-6">
                   <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                   <button
                     type="button"
                     onClick={() => avatarInputRef.current?.click()}
                     aria-label={localProfile.avatarImage ? 'Replace avatar image' : 'Upload avatar image'}
                     title={localProfile.avatarImage ? 'Click to replace avatar' : 'Click to upload avatar'}
                     className={`group relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg overflow-hidden ${localProfile.avatarColor} shrink-0 ring-1 ring-black/5 dark:ring-white/10 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white`}
                   >
                      {localProfile.avatarImage ? (
                        <img
                          src={localProfile.avatarImage}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        localProfile.name.charAt(0).toUpperCase()
                      )}
                      <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 group-focus-visible:bg-black/10 transition-colors" />
                   </button>
                   <div className="space-y-1 pt-1 text-center md:text-left flex-1 min-w-0">
                     <p className="font-medium text-primary-900 dark:text-dark-text">Profile Photo</p>
                     <p className="text-xs text-primary-400 dark:text-dark-muted">Click your avatar to upload or replace image. You can also keep initials with a background color.</p>
                     <div className="mt-3 space-y-3">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                          {localProfile.avatarImage && (
                            <button
                              onClick={handleRemoveAvatar}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary-300 text-primary-600 hover:text-[var(--status-danger-text)] hover:border-[var(--status-danger-border)] dark:border-dark-border dark:text-dark-text transition-colors"
                            >
                              Remove photo
                            </button>
                          )}
                          {['bg-zinc-900', 'bg-neutral-700', 'bg-stone-600', 'bg-primary-700', 'bg-primary-600'].map(color => (
                            <button 
                              key={color}
                              onClick={() => {
                                const newProfile = { ...localProfile, avatarColor: color };
                                setLocalProfile(newProfile);
                                onUpdateProfile(newProfile);
                              }}
                              aria-label={`Set avatar color ${color.replace('bg-', '')}`}
                              className={`w-7 h-7 rounded-full ${color} transition-transform hover:scale-105 ${localProfile.avatarColor === color ? 'ring-2 ring-offset-2 ring-primary-400 dark:ring-dark-muted' : ''}`}
                            />
                          ))}
                        </div>
                     </div>
                     {avatarError && (
                       <p className="text-xs text-[var(--status-danger-text)] mt-2">{avatarError}</p>
                     )}
                   </div>
                 </div>
                 </div>

                 <div className="rounded-lg border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface p-5 md:p-6 space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-primary-500 dark:text-dark-muted uppercase tracking-wider">Full Name</label>
                       <input 
                         type="text" 
                         value={localProfile.name}
                         onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
                         onBlur={handleProfileSave}
                         className="w-full bg-primary-100 dark:bg-dark-border/50 border border-primary-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-primary-900 dark:text-dark-text outline-none focus:border-primary-900 dark:focus:border-dark-text transition-colors"
                       />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-primary-500 dark:text-dark-muted uppercase tracking-wider">Title / Role</label>
                        <input 
                          type="text" 
                          value={localProfile.jobTitle}
                          onChange={e => setLocalProfile({...localProfile, jobTitle: e.target.value})}
                          onBlur={handleProfileSave}
                          className="w-full bg-primary-100 dark:bg-dark-border/50 border border-primary-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-primary-900 dark:text-dark-text outline-none focus:border-primary-900 dark:focus:border-dark-text transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-primary-500 dark:text-dark-muted uppercase tracking-wider">Email</label>
                        <input
                          type="email"
                          value={localProfile.email}
                          onChange={e => setLocalProfile({...localProfile, email: e.target.value})}
                          onBlur={handleProfileSave}
                          className="w-full bg-primary-100 dark:bg-dark-border/50 border border-primary-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm text-primary-900 dark:text-dark-text outline-none focus:border-primary-900 dark:focus:border-dark-text transition-colors"
                        />
                      </div>
                    </div>
                 </div>
               </div>
             )}

             {/* --- GENERAL / APPEARANCE TAB --- */}
             {activeTab === 'general' && (
               <div className="space-y-7">
                 <div className="rounded-lg border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface p-5 md:p-6 space-y-5">
                    <h4 className="text-sm font-medium text-primary-900 dark:text-dark-text border-b border-primary-200/80 dark:border-dark-border pb-3">Theme</h4>
                    <div className="flex items-center justify-between p-4 bg-primary-100 dark:bg-dark-bg/70 rounded-lg border border-primary-200/80 dark:border-dark-border">
                      <div className="flex items-center gap-3">
                        <span className="p-2 bg-primary-50 dark:bg-dark-border rounded-lg text-primary-900 dark:text-dark-text shadow-sm">
                           {isDarkMode ? <Icons.Moon /> : <Icons.Sun />}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-primary-900 dark:text-dark-text">Dark Mode</p>
                          <p className="text-xs text-primary-500 dark:text-dark-muted">Switch between light and dark themes</p>
                        </div>
                      </div>
                      <button 
                        onClick={onToggleTheme}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-gray-200 dark:bg-black transition-transform ${isDarkMode ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'}`} />
                      </button>
                    </div>
                 </div>

                 <div className="rounded-lg border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-surface p-5 md:p-6 space-y-4">
                    <h4 className="text-sm font-medium text-primary-900 dark:text-dark-text border-b border-primary-200/80 dark:border-dark-border pb-3">Text Size (Desktop)</h4>
                    <div className="flex items-center justify-between p-4 bg-primary-100 dark:bg-dark-bg/70 rounded-lg border border-primary-200/80 dark:border-dark-border">
                      <div>
                        <p className="font-medium text-sm text-primary-900 dark:text-dark-text">Current: {desktopFontSize}px</p>
                        <p className="text-xs text-primary-500 dark:text-dark-muted">Affects desktop layout only</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[10, 12, 14, 16, 18].map((size) => (
                          <button
                            key={size}
                            onClick={() => onChangeDesktopFontSize(size)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              desktopFontSize === size
                                ? 'bg-primary-900 text-white dark:bg-primary-200 dark:text-primary-900'
                                : 'bg-primary-50 text-primary-600 border border-primary-200 hover:border-primary-900 dark:bg-dark-border dark:text-dark-text dark:border-dark-border dark:hover:border-dark-text'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                 </div>
               </div>
             )}

             {/* --- DATA TAB --- */}
             {activeTab === 'data' && (
               <div className="space-y-7">
                 <div className="p-4 md:p-5 bg-primary-100 dark:bg-dark-border/40 rounded-lg border border-primary-200/80 dark:border-dark-border">
                    <div className="flex gap-3">
                       <Icons.Briefcase />
                       <div className="space-y-1">
                          <h4 className="text-sm font-bold text-primary-900 dark:text-dark-text">Backup & Restore</h4>
                          <p className="text-xs text-primary-500 dark:text-dark-muted">Export your tasks to JSON or import from a backup.</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <button 
                      onClick={handleExport}
                      className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-primary-200 dark:border-dark-border hover:border-primary-900 dark:hover:border-dark-text hover:bg-primary-100 dark:hover:bg-dark-border transition-all text-sm font-medium text-primary-600 dark:text-dark-text hover:text-primary-900 dark:hover:text-dark-text"
                    >
                      <Icons.Download />
                      <span>Export JSON</span>
                    </button>
                    
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-lg border border-primary-200 dark:border-dark-border hover:border-primary-900 dark:hover:border-dark-text hover:bg-primary-100 dark:hover:bg-dark-border transition-all text-sm font-medium text-primary-600 dark:text-dark-text hover:text-primary-900 dark:hover:text-dark-text">
                      <Icons.Upload />
                      <span>Import JSON</span>
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                 </div>
                 
                 {importError && (
                   <p className="text-xs text-primary-600 dark:text-dark-text font-semibold">{importError}</p>
                 )}

                 <div className="pt-6 border-t border-primary-200/80 dark:border-dark-border">
                    <h4 className="text-sm font-bold text-primary-700 dark:text-dark-text mb-2">Danger Zone</h4>
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full flex items-center justify-between p-4 bg-primary-50 dark:bg-dark-surface border border-primary-200/80 dark:border-dark-border rounded-xl text-primary-700 dark:text-dark-text hover:bg-primary-100 dark:hover:bg-dark-border transition-colors"
                    >
                       <span className="text-sm font-medium">Reset All Local Data</span>
                       <Icons.Trash />
                    </button>
                 </div>
               </div>
             )}

             {/* --- ABOUT TAB --- */}
             {activeTab === 'about' && (
               <div className="space-y-7">
                 <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-primary-200/80 dark:border-dark-border">
                    <div className="p-4 bg-primary-900 dark:bg-primary-200 rounded-lg text-white dark:text-primary-900 mb-2">
                       <Icons.GitickLogo />
                    </div>
                    <h2 className="text-xl font-bold text-primary-900 dark:text-dark-text">Gitick</h2>
                    <p className="text-sm text-primary-500 dark:text-dark-muted max-w-sm">
                       A minimalist, privacy-first task manager inspired by developer workflows. No tracking, no servers, just productivity.
                    </p>
                 </div>

                <div className="space-y-5">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 dark:text-dark-muted">Desktop Updates</h4>

                    <div className="rounded-lg border border-primary-200 dark:border-dark-border p-5 bg-primary-50 dark:bg-dark-border/40 space-y-4">
                      {canCheckDesktopUpdate && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-primary-400 dark:text-dark-muted">Desktop Version</p>
                            <span className="text-xs font-mono text-primary-900 dark:text-dark-text">{desktopAppVersion || 'Unknown'}</span>
                          </div>
                          <button
                            onClick={() => { void onCheckDesktopUpdate(); }}
                            disabled={isCheckingDesktopUpdate}
                            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                              isCheckingDesktopUpdate
                                ? 'bg-primary-200 text-primary-500 dark:bg-dark-border dark:text-dark-muted cursor-not-allowed'
                                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] dark:bg-[var(--accent)] dark:text-white dark:hover:bg-[var(--accent-strong)]'
                            }`}
                          >
                            {isCheckingDesktopUpdate ? 'Checking...' : 'Check for Updates'}
                          </button>
                          {desktopUpdateStatus && (
                            <p className="text-xs text-primary-500 dark:text-dark-muted">{desktopUpdateStatus}</p>
                          )}
                        </div>
                      )}
                      {!canCheckDesktopUpdate && (
                        <p className="text-xs text-primary-500 dark:text-dark-muted">
                          Update checks are available in the desktop app runtime.
                        </p>
                      )}
                    </div>
                 </div>

                 <div className="p-5 rounded-lg bg-primary-100 dark:bg-dark-border/40 border border-primary-200/80 dark:border-dark-border">
                    <p className="text-xs text-primary-700 dark:text-dark-text font-medium">
                       🔒 <span className="font-bold">Local First:</span> Your data is stored locally on your current device. We don't see your tasks. Export backup before switching devices.
                    </p>
                 </div>
               </div>
             )}

           </div>
        </div>
      </div>
      <ConfirmDialog
        open={showClearConfirm}
        title="Reset all local data?"
        description="This will clear tasks, projects, profile and preferences on this device. This cannot be undone."
        confirmLabel="Reset Data"
        cancelLabel="Keep Data"
        confirmTone="danger"
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setShowClearConfirm(false);
          onClearData();
          onClose();
        }}
      />
    </div>
  );
};
