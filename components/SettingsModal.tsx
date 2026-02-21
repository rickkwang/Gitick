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
    { id: 'about', label: 'About & Install', icon: <Icons.GitCommit /> },
  ];

  const runtimeLabel = isNativeApp
    ? `Native (${runtimePlatform})`
    : isStandaloneInstalled
      ? 'Installed PWA'
      : 'Browser';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-6">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row h-[96dvh] md:h-[min(780px,88vh)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar Nav - Horizontal on Mobile */}
        <div className="w-full md:w-72 bg-gray-50/70 dark:bg-black border-b md:border-b-0 md:border-r border-gray-100 dark:border-zinc-800 px-4 py-4 md:px-6 md:py-7 flex flex-col shrink-0 pt-safe md:pt-7">
          <div className="flex items-center justify-between mb-4 md:mb-7">
             <h2 className="text-lg font-bold text-black dark:text-white">Settings</h2>
             <button onClick={onClose} aria-label="Close settings" className="md:hidden text-gray-500 p-1">
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
                    ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm border border-gray-200 dark:border-zinc-700'
                    : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="mt-4 md:mt-auto hidden md:block">
             <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 px-3 py-2 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                App Version: {desktopAppVersion || 'Web'}
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 pb-safe">
           <div className="hidden md:flex items-center justify-between px-10 py-7 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h3 className="font-semibold text-xl text-black dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <button onClick={onClose} aria-label="Close settings" className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <Icons.X />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto px-5 py-5 md:px-10 md:py-8 space-y-10">
             
             {/* --- PROFILE TAB --- */}
             {activeTab === 'profile' && (
               <div className="space-y-7">
                 <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/20 p-5 md:p-6">
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
                     <p className="font-medium text-black dark:text-white">Profile Photo</p>
                     <p className="text-xs text-gray-400 dark:text-zinc-500">Click your avatar to upload or replace image. You can also keep initials with a background color.</p>
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
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-colors"
                            >
                              Remove photo
                            </button>
                          )}
                          {['bg-zinc-900', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-500'].map(color => (
                            <button 
                              key={color}
                              onClick={() => {
                                const newProfile = { ...localProfile, avatarColor: color };
                                setLocalProfile(newProfile);
                                onUpdateProfile(newProfile);
                              }}
                              aria-label={`Set avatar color ${color.replace('bg-', '')}`}
                              className={`w-7 h-7 rounded-full ${color} transition-transform hover:scale-105 ${localProfile.avatarColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-zinc-500' : ''}`}
                            />
                          ))}
                        </div>
                     </div>
                     {avatarError && (
                       <p className="text-xs text-red-500 mt-2">{avatarError}</p>
                     )}
                   </div>
                 </div>
                 </div>

                 <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 md:p-6 space-y-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
               <div className="space-y-7">
                 <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 md:p-6 space-y-5">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-3">Theme</h4>
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

                 <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 md:p-6 space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-3">Text Size (Desktop)</h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-200">Current: {desktopFontSize}px</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500">Affects desktop layout only</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[12, 13, 14, 15].map((size) => (
                          <button
                            key={size}
                            onClick={() => onChangeDesktopFontSize(size)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              desktopFontSize === size
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-black dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:border-white'
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
                 <div className="p-4 md:p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex gap-3">
                       <Icons.Briefcase />
                       <div className="space-y-1">
                          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">Backup & Restore</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Export your tasks to JSON or import from a backup.</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                 <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <h4 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h4>
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
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
                 <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-100 dark:border-zinc-800">
                    <div className="p-4 bg-black dark:bg-white rounded-2xl text-white dark:text-black mb-2">
                       <Icons.GitickLogo />
                    </div>
                    <h2 className="text-xl font-bold text-black dark:text-white">Gitick</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm">
                       A minimalist, privacy-first task manager inspired by developer workflows. No tracking, no servers, just productivity.
                    </p>
                 </div>

                <div className="space-y-5">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600">Install & Updates</h4>

                    <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-800/40 space-y-4">
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
                        <div className="pt-3 border-t border-gray-100 dark:border-zinc-700 space-y-3">
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
                    
                    <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-5 space-y-4 border border-gray-100 dark:border-zinc-800/50">
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

                 <div className="p-5 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                       🔒 <span className="font-bold">Local First:</span> Your data is stored locally on your current device (browser or app). We don't see your tasks. Export backup before switching devices.
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
