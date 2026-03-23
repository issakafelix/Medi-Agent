import React, { useEffect, useState } from 'react';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/outline';

export default function AboutModal({ isOpen, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setTimeout(() => setIsVisible(false), 300); // Wait for exit animation
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
        isOpen ? 'bg-black/60 backdrop-blur-md opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-3xl transition-all duration-500 transform shadow-2xl ${
          isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#808080',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-600/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-fuchsia-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>

        <div className="relative p-8 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/30">
                <HeartIcon className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-100 tracking-tight">
                About HealthBot
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 text-base sm:text-lg leading-relaxed text-indigo-100/80 font-medium">
            <p className="text-xl text-white font-semibold leading-snug">
              Meet Your Personal AI Health Companion.
            </p>
            <p>
              This app is a smart, 24/7 personal health assistant designed to help you understand your symptoms and navigate your healthcare journey with confidence. Whether you're dealing with a midnight fever, a sudden sports injury, or just have questions about a new medication, this assistant is here to guide you.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">🔍</div>
                <h3 className="text-white font-bold mb-1">Symptom Checking</h3>
                <p className="text-sm text-indigo-200/70">Instant, reliable triage and clarification for peace of mind.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">🩺</div>
                <h3 className="text-white font-bold mb-1">Expert Advice</h3>
                <p className="text-sm text-indigo-200/70">Specialized guidance spanning pediatrics, neurology, and pharmacy.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">🏥</div>
                <h3 className="text-white font-bold mb-1">Local Hospitals</h3>
                <p className="text-sm text-indigo-200/70">Tailored recommendations for top-rated clinics in your area.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">🩹</div>
                <h3 className="text-white font-bold mb-1">Home Care</h3>
                <p className="text-sm text-indigo-200/70">Actionable step-by-step remedies and safe OTC dosages.</p>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-purple-900/30 border border-purple-500/20 text-sm text-purple-200/80 text-center">
              * Note: This app is designed to provide highly educated guidance and triage, but is not a replacement for a real doctor in emergencies!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
