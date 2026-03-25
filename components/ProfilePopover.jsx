import React from 'react';
import { 
  XMarkIcon, 
  ArrowRightOnRectangleIcon, 
  UserPlusIcon, 
  Cog6ToothIcon, 
  ShieldCheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePopover({ isOpen, onClose, onOpenAccount }) {
  const { user, logout } = useAuth();
  
  if (!user || !isOpen) return null;

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-[100] sm:absolute sm:inset-auto sm:top-16 sm:right-4 w-full sm:w-[360px] animate-fadeInUp">
      {/* Backdrop for Mobile */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm sm:hidden" 
        onClick={onClose}
      />
      
      {/* Popover Card */}
      <div className="relative mt-auto sm:mt-0 bg-white/95 backdrop-blur-2xl border border-[var(--border)] shadow-2xl rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]/50 bg-[var(--brand-light)]/30">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] pl-2">
            Account Session
          </span>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-gray-500 hover:text-[var(--user-text)] transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Section */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="relative mb-4 group cursor-pointer">
            {/* Stunning Rotating Border */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[var(--brand-main)] via-[var(--brand-dark)] to-[var(--brand-main)] opacity-75 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500 animate-[spin_6s_linear_infinite]"></div>
            
            {/* Profile Avatar */}
            <div className="relative w-24 h-24 rounded-full border-2 border-white overflow-hidden shadow-xl bg-gray-100 flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold bg-gradient-to-br from-[var(--brand-main)] to-[var(--brand-dark)] bg-clip-text text-transparent italic">
                  {initial}
                </span>
              )}
            </div>
            
            {/* Plus Icon Overlay */}
            <div className="absolute bottom-1 right-1 bg-[var(--brand-main)] border-2 border-white rounded-full p-1.5 shadow-lg shadow-[var(--brand-main)]/40 text-white">
              <UserPlusIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[var(--user-text)] tracking-tight leading-tight">
            Hi, {displayName}!
          </h3>
          <p className="text-sm font-medium text-gray-600 mt-1 mb-6">
            {user.email}
          </p>

          <button 
            onClick={() => {
              onOpenAccount();
              onClose();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-[var(--brand-main)] text-white font-bold text-[13px] sm:text-sm hover:bg-[var(--brand-dark)] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--brand-main)]/20 flex items-center justify-center gap-2"
          >
            Manage Health Account
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-3 pb-3 space-y-1">
          <button className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-[var(--brand-light)] group transition-all text-gray-600 hover:text-[var(--user-text)]">
            <Cog6ToothIcon className="w-5 h-5 text-[var(--brand-main)] group-hover:rotate-45 transition-transform duration-500" />
            <span className="text-sm font-semibold flex-1 text-left">Preferences</span>
            <ChevronRightIcon className="w-4 h-4 opacity-30 px-1" />
          </button>
          
          <button className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-[var(--brand-light)] group transition-all text-gray-600 hover:text-[var(--user-text)]">
            <ShieldCheckIcon className="w-5 h-5 text-[var(--brand-main)]" />
            <span className="text-sm font-semibold flex-1 text-left">Security & Privacy</span>
            <ChevronRightIcon className="w-4 h-4 opacity-30 px-1" />
          </button>

          <div className="h-px bg-[var(--border)]/50 my-2 mx-1" />

          <button 
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-red-50 group transition-all text-gray-600 hover:text-red-600"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="text-sm font-bold flex-1 text-left">Sign out of Assistant</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 flex items-center justify-center gap-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-t border-[var(--border)]/50 bg-[var(--brand-light)]/20">
          <a href="#" className="hover:text-[var(--brand-main)] transition-colors">Privacy</a>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <a href="#" className="hover:text-[var(--brand-main)] transition-colors">Terms</a>
        </div>
      </div>
    </div>
  );
}
