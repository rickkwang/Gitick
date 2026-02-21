import React, { useState } from 'react';
import { Icons } from '../constants';
import { UserProfile, Task, Priority } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  tasks: Task[];
  onImportData: (tasks: Task[]) => void;
  onClearData: () => void;
  isNativeApp: boolean;
  runtimePlatform: string;
  isStandaloneInstalled: boolean;
  canInstallApp: boolean;
  onRequestInstallApp: () => Promise<boolean>;
  desktopAppVersion: string;
  canCheckDesktopUpdate: boolean;
  desktopUpdateStatus: string;
  isCheckingDesktopUpdate: boolean;
  onCheckDesktopUpdate: () => Promise<void>;
}

type SettingsTab = 'profile' | 'general' | 'data' | 'about';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPriority = (value: unknown): value is Priority =>
  value === Priority.HIGH || value === Priority.MEDIUM || value === Priority.LOW;

const normalizeTask = (raw: unknown): Task | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return null;

  const completed = Boolean(item.completed);
  const createdAt = typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
    ? item.createdAt
    : Date.now();

  const completedAt = completed && typeof item.completedAt === 'number' && Number.isFinite(item.completedAt)
    ? item.completedAt
    : undefined;

  const dueDate = typeof item.dueDate === 'string' && ISO_DATE_RE.test(item.dueDate)
    ? item.dueDate
    : undefined;

  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean)
    : [];

  const subtasks = Array.isArray(item.subtasks)
    ? item.subtasks
        .map((sub): Task['subtasks'][number] | null => {
          if (!sub || typeof sub !== 'object') return null;
          const rawSub = sub as Record<string, unknown>;
          const subTitle = typeof rawSub.title === 'string' ? rawSub.title.trim() : '';
          if (!subTitle) return null;
          return {
            id: typeof rawSub.id === 'string' && rawSub.id.trim() ? rawSub.id : crypto.randomUUID(),
            title: subTitle,
            completed: Boolean(rawSub.completed),
          };
        })
        .filter((sub): sub is Task['subtasks'][number] => sub !== null)
    : [];

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : crypto.randomUUID(),
    title,
    description: typeof item.description === 'string' ? item.description : '',
    completed,
    completedAt,
    priority: isPriority(item.priority) ? item.priority : Priority.MEDIUM,
    dueDate,
    tags,
    list: typeof item.list === 'string' && item.list.trim() ? item.list.trim() : 'Inbox',
    subtasks,
    createdAt,
  };
};

const sanitizeImportedTasks = (value: unknown): Task[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid format: Expected an array of tasks');
  }
  return value
    .map(normalizeTask)
    .filter((task): task is Task => task !== null);
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isDarkMode,
  onToggleTheme,
  userProfile,
  onUpdateProfile,
  tasks,
  onImportData,
  onClearData,
  isNativeApp,
  runtimePlatform,
  isStandaloneInstalled,
  canInstallApp,
  onRequestInstallApp,
  desktopAppVersion,
  canCheckDesktopUpdate,
  desktopUpdateStatus,
  isCheckingDesktopUpdate,
  onCheckDesktopUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [importError, setImportError] = useState('');

  // Local state for profile form to avoid constant re-renders on every keystroke
  const [localProfile, setLocalProfile] = useState(userProfile);

  const handleProfileSave = () => {
    onUpdateProfile(localProfile);
    // Visual feedback usually goes here, but we'll assume fast update
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zendo-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const sanitizedTasks = sanitizeImportedTasks(json);
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
    { id: 'about', label: 'About & Install', icon: <Icons.GitCommit /> },
  ];

  const runtimeLabel = isNativeApp
    ? `Native (${runtimePlatform})`
    : isStandaloneInstalled
      ? 'Installed PWA'
      : 'Browser';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 md:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-none md:border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row h-full md:h-[500px] max-h-[100dvh] md:max-h-[85vh]">
        
        {/* Sidebar Nav - Horizontal on Mobile */}
        <div className="w-full md:w-64 bg-gray-50/50 dark:bg-black border-b md:border-b-0 md:border-r border-gray-100 dark:border-zinc-800 p-4 md:p-6 flex flex-col shrink-0 pt-safe md:pt-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
             <h2 className="text-lg font-bold text-black dark:text-white">Settings</h2>
             <button onClick={onClose} className="md:hidden text-gray-500 p-1">
               <Icons.X />
             </button>
          </div>
          <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar md:overflow-visible">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800/50'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="mt-auto hidden md:block">
             <div className="text-[10px] text-gray-400 font-mono">
                Version {desktopAppVersion || 'Web'}
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 pb-safe">
           <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h3 className="font-bold text-lg text-black dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <Icons.X />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
             
             {/* --- PROFILE TAB --- */}
             {activeTab === 'profile' && (
               <div className="space-y-6">
                 <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                   <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg ${localProfile.avatarColor} shrink-0`}>
                      {localProfile.name.charAt(0).toUpperCase()}
                   </div>
                   <div className="space-y-1 pt-2 text-center md:text-left">
                     <p className="font-medium text-black dark:text-white">Profile Photo</p>
                     <p className="text-xs text-gray-400 dark:text-zinc-500">Pick a background color for your avatar.</p>
                     <div className="flex justify-center md:justify-start gap-2 mt-2">
                        {['bg-zinc-900', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500'].map(color => (
                          <button 
                            key={color}
                            onClick={() => {
                              const newProfile = { ...localProfile, avatarColor: color };
                              setLocalProfile(newProfile);
                              onUpdateProfile(newProfile);
                            }}
                            className={`w-6 h-6 rounded-full ${color} ${localProfile.avatarColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-zinc-600' : ''}`}
                          />
                        ))}
                     </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Full Name</label>
                       <input 
                         type="text" 
                         value={localProfile.name}
                         onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
                         onBlur={handleProfileSave}
                         className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                       />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Title / Role</label>
                        <input 
                          type="text" 
                          value={localProfile.jobTitle}
                          onChange={e => setLocalProfile({...localProfile, jobTitle: e.target.value})}
                          onBlur={handleProfileSave}
                          className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Email</label>
                        <input 
                          type="email" 
                          value={localProfile.email}
                          onChange={e => setLocalProfile({...localProfile, email: e.target.value})}
                          onBlur={handleProfileSave}
                          className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                      </div>
                    </div>
                 </div>
               </div>
             )}

             {/* --- GENERAL / APPEARANCE TAB --- */}
             {activeTab === 'general' && (
               <div className="space-y-6">
                 <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-2">Theme</h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <span className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-black dark:text-white shadow-sm">
                           {isDarkMode ? <Icons.Moon /> : <Icons.Sun />}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-200">Dark Mode</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-500">Switch between light and dark themes</p>
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
               </div>
             )}

             {/* --- DATA TAB --- */}
             {activeTab === 'data' && (
               <div className="space-y-6">
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex gap-3">
                       <Icons.Briefcase />
                       <div className="space-y-1">
                          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">Backup & Restore</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Export your tasks to JSON or import from a backup.</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={handleExport}
                      className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                    >
                      <Icons.Download />
                      <span>Export JSON</span>
                    </button>
                    
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">
                      <Icons.Upload />
                      <span>Import JSON</span>
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                 </div>
                 
                 {importError && (
                   <p className="text-xs text-red-500 font-bold">{importError}</p>
                 )}

                 <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                    <h4 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h4>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete all tasks? This cannot be undone.')) {
                          onClearData();
                          onClose();
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                       <span className="text-sm font-medium">Clear All Data</span>
                       <Icons.Trash />
                    </button>
                 </div>
               </div>
             )}

             {/* --- ABOUT TAB --- */}
             {activeTab === 'about' && (
               <div className="space-y-6">
                 <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-100 dark:border-zinc-800">
                    <div className="p-4 bg-black dark:bg-white rounded-2xl text-white dark:text-black mb-2">
                       <Icons.GitickLogo />
                    </div>
                    <h2 className="text-xl font-bold text-black dark:text-white">Gitick</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
                       A minimalist, privacy-first task manager inspired by developer workflows. No tracking, no servers, just productivity.
                    </p>
                 </div>

                <div className="space-y-4">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600">Install & Updates</h4>

                    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500">Current Runtime</p>
                        <span className="text-xs font-mono text-black dark:text-white">{runtimeLabel}</span>
                      </div>
                      {!isNativeApp && !isStandaloneInstalled && (
                        <button
                          onClick={() => { void onRequestInstallApp(); }}
                          disabled={!canInstallApp}
                          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                            canInstallApp
                              ? 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                              : 'bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed'
                          }`}
                        >
                          {canInstallApp ? 'Install Gitick App' : 'Open in Chrome/Safari to install'}
                        </button>
                      )}
                      {!isNativeApp && isStandaloneInstalled && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Gitick is already installed on this device.
                        </p>
                      )}
                      {isNativeApp && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          You are using the native Capacitor shell.
                        </p>
                      )}
                      {canCheckDesktopUpdate && (
                        <div className="pt-2 border-t border-gray-100 dark:border-zinc-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500">Desktop Version</p>
                            <span className="text-xs font-mono text-black dark:text-white">{desktopAppVersion || 'Unknown'}</span>
                          </div>
                          <button
                            onClick={() => { void onCheckDesktopUpdate(); }}
                            disabled={isCheckingDesktopUpdate}
                            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                              isCheckingDesktopUpdate
                                ? 'bg-gray-200 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                            }`}
                          >
                            {isCheckingDesktopUpdate ? 'Checking...' : 'Check for Updates'}
                          </button>
                          {desktopUpdateStatus && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400">{desktopUpdateStatus}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-xl p-4 space-y-4 border border-gray-100 dark:border-zinc-800/50">
                        <div className="flex gap-3 items-start">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shrink-0">1</span>
                            <div>
                               <p className="text-sm font-bold text-black dark:text-white">On Mobile (iOS/Android)</p>
                               <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Tap the <span className="font-bold">Share</span> or <span className="font-bold">Menu</span> button in your browser, then select <span className="font-bold">"Add to Home Screen"</span>.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shrink-0">2</span>
                            <div>
                               <p className="text-sm font-bold text-black dark:text-white">On Desktop (Chrome/Edge)</p>
                               <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Click the <span className="font-bold">Install icon</span> in the right side of the URL bar.</p>
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                       🔒 <span className="font-bold">Local First:</span> Your data is stored locally on your current device (browser or app). We don't see your tasks. Export backup before switching devices.
                    </p>
                 </div>
               </div>
             )}

           </div>
        </div>
      </div>
    </div>
  );
};
