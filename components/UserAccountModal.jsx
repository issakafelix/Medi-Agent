import React from 'react';
import { 
  XMarkIcon, 
  EnvelopeIcon, 
  HashtagIcon, 
  CalendarIcon, 
  UserCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  TrashIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function UserAccountModal({ isOpen, onClose }) {
  const { user } = useAuth();
  
  if (!user || !isOpen) return null;

  const creationDate = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  const provider = user.providerData[0]?.providerId || 'password';
  const providerName = provider === 'google.com' ? 'Google' : 'Email/Password';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-[var(--border)] shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-[var(--border)]/50 bg-[var(--brand-light)]/30">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--user-text)] tracking-tight">
                Health Account
              </h2>
              <p className="text-gray-600 text-sm mt-1">Manage your identity and security settings</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 sm:p-3 rounded-full hover:bg-black/5 text-gray-500 hover:text-[var(--user-text)] transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          
          {/* Profile Overview */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-[var(--brand-light)]/20 border border-[var(--brand-main)]/10">
            <div className="relative">
               <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[var(--brand-main)] to-[var(--brand-dark)] blur-sm opacity-20"></div>
               <div className="relative w-24 h-24 rounded-full border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-full h-full text-gray-200" />
                )}
               </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-xl font-bold text-[var(--user-text)]">{user.displayName || 'Anonymous User'}</h3>
              <p className="text-gray-600 text-sm mb-3">{user.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-[var(--brand-main)]/10 text-[var(--brand-main)] text-[10px] font-bold uppercase tracking-wider border border-[var(--brand-main)]/20">
                  Active Session
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                  {providerName}
                </span>
              </div>
            </div>
          </div>

          {/* Secure Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[var(--brand-main)]/10 text-[var(--brand-main)]">
                <EnvelopeIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Address</p>
                <p className="text-sm font-semibold text-[var(--user-text)] mt-1">{user.email}</p>
                <p className="text-[11px] text-[var(--brand-main)] mt-1 flex items-center gap-1">
                  <ShieldCheckIcon className="w-3 h-3" /> Verified
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[var(--brand-main)]/10 text-[var(--brand-main)]">
                <HashtagIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account ID</p>
                <p className="text-xs font-mono text-gray-600 mt-1 break-all">{user.uid}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[var(--brand-main)]/10 text-[var(--brand-main)]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Join Date</p>
                <p className="text-sm font-semibold text-[var(--user-text)] mt-1">{creationDate}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[var(--brand-main)]/10 text-[var(--brand-main)]">
                <KeyIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Auth Provider</p>
                <p className="text-sm font-semibold text-[var(--user-text)] mt-1">{providerName}</p>
              </div>
            </div>
          </div>

          {/* Settings Groups */}
          <div className="space-y-4">
             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] px-2">Account Settings</h4>
             <div className="flex flex-col divide-y divide-gray-100 bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                <button className="flex items-center justify-between p-5 hover:bg-[var(--brand-light)]/50 transition-all text-left group">
                   <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:text-[var(--brand-main)] transition-colors">
                        <UserCircleIcon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-[var(--user-text)] transition-colors">Personal Information</span>
                   </div>
                   <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-main)] transition-all" />
                </button>
                <button className="flex items-center justify-between p-5 hover:bg-[var(--brand-light)]/50 transition-all text-left group">
                   <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:text-[var(--brand-main)] transition-colors">
                        <DevicePhoneMobileIcon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-[var(--user-text)] transition-colors">Devices & Sessions</span>
                   </div>
                   <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-[var(--brand-main)] transition-all" />
                </button>
             </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4">
             <div className="p-6 rounded-[2rem] bg-red-50 border border-red-100">
                <h4 className="text-red-600 text-sm font-bold flex items-center gap-2 mb-2">
                  <TrashIcon className="w-4 h-4" /> Danger Zone
                </h4>
                <p className="text-red-400 text-xs mb-4">Permanently delete your account and all associated health data. This action cannot be undone.</p>
                <button className="px-6 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200">
                  Delete Account
                </button>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-[var(--brand-main)] hover:bg-[var(--brand-dark)] text-white text-sm font-bold transition-all shadow-lg shadow-[var(--brand-main)]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
