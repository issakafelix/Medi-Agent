import React from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

/**
 * Toast/Notification Component - For system messages
 */
export default function Toast({ message, type = 'info', onClose, isDarkMode }) {
  const styles = {
    info: {
      bg: isDarkMode ? 'bg-primary-900/90' : 'bg-primary-50',
      text: isDarkMode ? 'text-primary-100' : 'text-primary-900',
      border: isDarkMode ? 'border-primary-700/50' : 'border-primary-200',
      icon: InformationCircleIcon,
      iconColor: isDarkMode ? 'text-primary-400' : 'text-primary-500',
    },
    success: {
      bg: isDarkMode ? 'bg-emerald-900/90' : 'bg-emerald-50',
      text: isDarkMode ? 'text-emerald-100' : 'text-emerald-900',
      border: isDarkMode ? 'border-emerald-700/50' : 'border-emerald-200',
      icon: CheckCircleIcon,
      iconColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-500',
    },
    error: {
      bg: isDarkMode ? 'bg-red-900/90' : 'bg-red-50',
      text: isDarkMode ? 'text-red-100' : 'text-red-900',
      border: isDarkMode ? 'border-red-700/50' : 'border-red-200',
      icon: XCircleIcon,
      iconColor: isDarkMode ? 'text-red-400' : 'text-red-500',
    },
    warning: {
      bg: isDarkMode ? 'bg-amber-900/90' : 'bg-amber-50',
      text: isDarkMode ? 'text-amber-100' : 'text-amber-900',
      border: isDarkMode ? 'border-amber-700/50' : 'border-amber-200',
      icon: ExclamationTriangleIcon,
      iconColor: isDarkMode ? 'text-amber-400' : 'text-amber-500',
    },
  }[type];

  const IconComponent = styles.icon;

  return (
    <div
      role="alert"
      className={`${styles.bg} ${styles.text} border ${styles.border} px-4 py-3 rounded-xl flex items-center gap-3 animate-slideInRight shadow-lg backdrop-blur-sm`}
    >
      <IconComponent className={`w-5 h-5 flex-shrink-0 ${styles.iconColor}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-all ${styles.text}`}
        aria-label="Close notification"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
