import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/solid';

export default function AuthPage() {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-gradient-to-b from-[var(--brand-main)] via-[var(--brand-dark)] to-[#022c22] p-4 sm:p-6">
      {/* Background Silhouettes & Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Stars */}
        <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full opacity-70"></div>
        <div className="absolute top-[25%] left-[80%] w-1.5 h-1.5 bg-white rounded-full opacity-80"></div>
        <div className="absolute top-[15%] left-[50%] w-2 h-2 bg-white rounded-full opacity-30 shadow-[0_0_10px_white]"></div>
        <div className="absolute top-[35%] left-[10%] w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="absolute top-[5%] left-[90%] w-1 h-1 bg-white rounded-full opacity-60"></div>
        
        {/* Landscape/Mountains (Abstract CSS shapes) */}
        <div className="absolute bottom-0 left-[-10%] w-[60%] h-[40%] bg-[#064e3b] rounded-tr-full opacity-80 blur-sm mix-blend-multiply"></div>
        <div className="absolute bottom-[-5%] right-[-10%] w-[70%] h-[50%] bg-[#022c22] rounded-tl-full opacity-90 blur-sm mix-blend-multiply"></div>
        
        {/* Tree Silhouettes (Abstract jagged shapes) */}
        <svg className="absolute bottom-0 left-0 w-full h-[30%] opacity-40 mix-blend-multiply" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polygon fill="#064e3b" points="0,100 0,60 5,40 10,70 15,30 25,60 30,20 40,80 45,50 55,80 60,30 70,60 75,10 85,70 95,40 100,60 100,100" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[420px] group">
        
        {/* Animated Border Glow Wrapper */}
        <div className="absolute -inset-[2px] rounded-[2.5rem] bg-gradient-to-r from-[var(--brand-main)] via-[#fbbf24] to-[#0ea5e9] opacity-70 blur-xl group-hover:opacity-100 transition duration-1000 animate-[gradient-shift_3s_ease_infinite]" style={{ backgroundSize: '200% 200%' }}></div>
        
        {/* Rotating Border Beam */}
        <div className="absolute -inset-[1.5px] rounded-[2.5rem] overflow-hidden opacity-90">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(from_0deg,transparent_0_300deg,var(--brand-main)_310deg,#fbbf24_340deg,white_360deg)] animate-[spin_4s_linear_infinite]"></div>
        </div>

        {/* Glassmorphic Card */}
        <div className="relative rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl border border-white/20"
          style={{ 
            background: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--user-text)] text-center mb-2 tracking-wide">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-center text-gray-600 text-sm sm:text-[15px] mb-8 sm:mb-10 max-w-sm mx-auto font-medium">
            {isLogin ? 'Sign in to your AI Health Assistant to continue.' : 'Join AI Health Assistant and start your journey today.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Email Input */}
            <div className="relative group">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white border border-gray-200 rounded-full px-5 sm:px-6 py-3 sm:py-4 text-[var(--user-text)] placeholder-gray-500 text-sm outline-none focus:border-[var(--brand-main)] focus:ring-2 focus:ring-[var(--brand-main)]/10 transition-all duration-300"
              />
              <UserIcon className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </div>
            
            {/* Password Input */}
            <div className="relative group">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                minLength={6}
                className="w-full bg-white border border-gray-200 rounded-full px-5 sm:px-6 py-3 sm:py-4 text-[var(--user-text)] placeholder-gray-500 text-sm outline-none focus:border-[var(--brand-main)] focus:ring-2 focus:ring-[var(--brand-main)]/10 transition-all duration-300"
              />
              <LockClosedIcon className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            </div>

            {/* Remember Me & Forgot Password (Visible only on Login) */}
            {isLogin && (
              <div className="flex items-center justify-between text-gray-600 text-xs sm:text-[13px] px-1 sm:px-2">
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
                  <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md border border-gray-300 bg-white group-hover:bg-gray-50 transition-colors flex items-center justify-center overflow-hidden shrink-0">
                    <input type="checkbox" className="absolute opacity-0 cursor-pointer" />
                    {/* Fake checkmark for aesthetic */}
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--brand-main)] hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  Remember me
                </label>
                <button type="button" className="hover:text-[var(--brand-main)] transition-colors hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error Message */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="text-center text-red-600 text-xs sm:text-sm bg-red-50 rounded-xl py-2 px-3 sm:px-4 border border-red-100">
                {error}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-4 rounded-full font-bold text-sm sm:text-[15px] text-white bg-[var(--brand-main)] hover:bg-[var(--brand-dark)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-[var(--brand-main)]/20 hover:-translate-y-0.5"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center mt-5 sm:mt-6 text-xs sm:text-[13px] text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-bold text-[var(--brand-main)] hover:underline ml-1"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 sm:gap-4 my-6 sm:my-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-gray-100">Or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-3.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs sm:text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            <div className="bg-white p-1 rounded-full border border-gray-100 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/operation-not-allowed': 'Google Sign-In is not enabled in your Firebase console.',
    'auth/unauthorized-domain': 'This domain is not authorized for Firebase Auth. Please check your Firebase authorized domains list.',
  };
  if (code && !map[code]) {
    return `${map[code] ?? 'Something went wrong.'} (Error code: ${code})`;
  }
  return map[code] ?? 'Something went wrong. Please try again.';
}
