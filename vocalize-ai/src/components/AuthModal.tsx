import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Mail, Lock, User, AlertCircle, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../firebase/authService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'register';

// ─────────────────────────────────────────────────────────────────────────────
// Google Icon SVG
// ─────────────────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// AuthModal
// ─────────────────────────────────────────────────────────────────────────────
const AuthModal: React.FC = () => {
  const [mode, setMode]           = useState<AuthMode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const clearError = () => setError(null);

  // ── Google Sign-In ──────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setIsLoading(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Email Submit ────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your name.');
        await registerWithEmail(email, password, name);
      }
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':       'No account with this email. Please register.',
        'auth/wrong-password':       'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account already exists with this email.',
        'auth/weak-password':        'Password must be at least 6 characters.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/invalid-credential':   'Invalid email or password.',
      };
      const code = e.code as string;
      setError(msg[code] || e.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
        padding: '16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Animated background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Card wrapper — constrained width, centered */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          zIndex: 10,
        }}
      >
        {/* Glass card */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {/* Subtle inner glow */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg,rgba(99,102,241,0.06) 0%,transparent 60%,rgba(168,85,247,0.06) 100%)',
            borderRadius: '24px',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #9333ea)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(99,102,241,0.35)',
              border: '1px solid rgba(255,255,255,0.15)',
              marginBottom: '14px',
            }}>
              <Mic size={30} color="white" />
            </div>
            <h1 style={{
              fontSize: '26px', fontWeight: 700, letterSpacing: '-0.04em',
              background: 'linear-gradient(to right, #fff 0%, #fff 60%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0, lineHeight: 1.2,
            }}>
              Vocalize AI
            </h1>
            <p style={{
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.22em',
              color: '#475569', fontWeight: 700, marginTop: '6px',
            }}>
              Neural Speech Synthesis
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{
            display: 'flex', padding: '6px',
            background: 'rgba(0,0,0,0.40)', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px',
            boxSizing: 'border-box', width: '100%',
          }}>
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '13px',
                  fontWeight: 600, border: 'none', cursor: 'pointer',
                  transition: 'all 0.25s',
                  background: mode === m ? '#4f46e5' : 'transparent',
                  color: mode === m ? '#fff' : '#64748b',
                  boxShadow: mode === m ? '0 8px 24px rgba(79,70,229,0.25)' : 'none',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Google button */}
          <motion.button
            id="google-signin-btn"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogle}
            disabled={isLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '13px', borderRadius: '14px',
              background: '#fff', color: '#374151', fontWeight: 600, fontSize: '14px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              marginBottom: '20px', boxSizing: 'border-box',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <GoogleIcon />
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15} color="#64748b"
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === 'register'}
                      style={inputStyle}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ position: 'relative' }}>
              <Mail
                size={15} color="#64748b"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="auth-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock
                size={15} color="#64748b"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="auth-password"
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '10px 12px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                    color: '#f87171', fontSize: '12px', fontWeight: 500,
                  }}
                >
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              id="auth-submit-btn"
              type="submit"
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              style={{
                width: '100%', height: '48px', borderRadius: '14px',
                fontWeight: 700, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
                marginTop: '4px',
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center', fontSize: '10px', color: '#334155',
          marginTop: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          Powered by Google Gemini Neural API
        </p>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0f172a inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
};

// Shared input style — uses inline styles to avoid any Tailwind conflict
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.40)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  paddingLeft: '42px',
  paddingRight: '16px',
  paddingTop: '13px',
  paddingBottom: '13px',
  fontSize: '14px',
  color: '#e2e8f0',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export default AuthModal;
