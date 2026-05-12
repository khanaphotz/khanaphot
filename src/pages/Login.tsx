import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Gem, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { loginWithGoogle, loginLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Small delay before redirecting if they just logged in
      const timer = setTimeout(() => {
        navigate('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 w-full max-w-md flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden"
      >
        {/* Abstract background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-900/20 blur-3xl rounded-full" />

        <div className="flex flex-col items-center gap-4 relative z-10 w-full px-4">
          <div className="w-full max-w-[360px] bg-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center justify-center border border-neutral-100/50">
            {/* Logo Layout matching 300x100 attachment */}
            <div className="flex items-center gap-5 w-full">
              {/* Official faceted diamond from BU assets */}
              <div className="w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://www.bu.ac.th/assets/img/logo-th.png" 
                  alt="BU" 
                  className="w-full h-full object-contain scale-[2.2] origin-left translate-x-[-5%]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Fallback to stylized faceted diamond icon if main logo fails
                    target.src = "https://admission.bu.ac.th/creative/assets/img/logo-bu.png";
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Typed Typography to match BU Branding */}
              <div className="flex flex-col text-left select-none -ml-4">
                <div className="text-[12px] text-neutral-800 font-bold leading-none tracking-tight mb-0.5">SCHOOL OF</div>
                <div className="text-[32px] text-neutral-900 font-black leading-[0.8] tracking-tighter">BUSINESS</div>
                <div className="text-[16px] text-neutral-900 font-black leading-[0.9] tracking-tighter mt-1">ADMINISTRATION</div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-t border-neutral-100 pt-1 mt-1">
                  Bangkok University
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-2 group">
            <h1 className="flex flex-col items-center gap-1 transition-transform group-hover:scale-105">
              <span className="text-xl md:text-2xl font-display font-bold text-neutral-300">สาขาวิชาการตลาดดิจิทัล</span>
              <span className="text-4xl md:text-5xl font-display font-black tracking-tight text-ai-gradient leading-tight">
                Room Reservation
              </span>
            </h1>
            <div className="flex flex-col items-center gap-1 mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900/50 border border-neutral-800 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <p className="text-neutral-400 text-xs font-medium">1. DEBI Lab A7-109</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900/50 border border-neutral-800 rounded-full">
                <span className="w-2 h-2 bg-red-500/50 rounded-full" />
                <p className="text-neutral-400 text-xs font-medium">2. AI Studio by DMK (A7-310)</p>
              </div>
            </div>
          </div>
        </div>

        {user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-green-500/10 border border-green-500/50 text-green-500 font-bold py-4 px-6 rounded-xl flex flex-col items-center justify-center gap-3 relative z-10 shadow-lg shadow-green-900/20"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 animate-bounce" />
              <span className="text-lg">Login Success!</span>
            </div>
            <p className="text-xs text-green-500/70 font-medium">Redirecting to Dashboard...</p>
          </motion.div>
        ) : (
          <button
            id="google-login-btn"
            onClick={loginWithGoogle}
            disabled={loginLoading}
            className="w-full bg-ai-gradient hover:opacity-90 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/20 relative z-10"
          >
            {loginLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loginLoading ? "Signing in..." : "Sign in with Google"}
          </button>
        )}

        <div className="flex flex-col items-center gap-1 relative z-10">
          <p className="text-[10px] text-neutral-500 text-center">
            * Authorized only for @bu.ac.th email accounts
          </p>
          <p className="text-[10px] text-neutral-600 font-medium text-center tracking-tight">
            © 2026 by VAKIM (studio DTDS). ALL Rights Reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
