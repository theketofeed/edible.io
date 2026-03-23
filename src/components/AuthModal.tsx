import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Eye, EyeOff, ArrowRight, X } from 'lucide-react'
import logo from '../assets/Transparent logo.png'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

type AuthMode = 'signin' | 'signup' | 'forgot'
type AuthStatus = 'idle' | 'loading' | 'success' | 'error'

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const [mode, setMode] = useState<AuthMode>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [status, setStatus] = useState<AuthStatus>('idle')
    const [message, setMessage] = useState('')

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setMode('signin')
                setEmail('')
                setPassword('')
                setMessage('')
                setStatus('idle')
            }, 100)
        }
    }, [isOpen])

    // ESC to close
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        if (isOpen) document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose()
    }

    const handleGoogleSignIn = async () => {
        setStatus('loading')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        if (error) {
            setStatus('error')
            setMessage(error.message)
        }
    }

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setMessage('')

        try {
            if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                })
                if (error) throw error
                setStatus('success')
                setMessage('Check your inbox — we sent a reset link.')
                return
            }

            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                setStatus('success')
                setMessage('Almost there! Check your email to confirm your account.')
                return
            }

            // signin
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            setStatus('success')
            onClose()
        } catch (err: any) {
            setStatus('error')
            setMessage(err.message ?? 'Something went wrong. Please try again.')
        }
    }, [mode, email, password, onClose])

    if (!isOpen) return null

    const headings = {
        signin: { title: 'Welcome back!', sub: 'Sign in to access your meal plans.' },
        signup: { title: 'Create account', sub: 'Start planning meals from your receipts.' },
        forgot: { title: 'Reset password', sub: "We'll send a link to your inbox." },
    }

    const { title, sub } = headings[mode]

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ animation: 'fadeIn 0.15s ease' }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes float1 { 0%,100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-12px) rotate(5deg) } }
        @keyframes float2 { 0%,100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-8px) rotate(-4deg) } }
        @keyframes float3 { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-15px) } }
        .auth-modal { animation: slideUp 0.15s ease; font-family: 'DM Sans', sans-serif; }
        .auth-input:focus { outline: none; border-color: #C6A0F6; box-shadow: 0 0 0 3px rgba(198,160,246,0.15); }
        .float-1 { animation: float1 6s ease-in-out infinite; }
        .float-2 { animation: float2 8s ease-in-out infinite 1s; }
        .float-3 { animation: float3 7s ease-in-out infinite 2s; }
      `}</style>

            <div className="auth-modal relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[560px]">

                {/* ── LEFT: Form panel ── */}
                <div className="flex-1 flex flex-col justify-center px-10 py-12 relative z-10">

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center mb-8 mt-4">
                        <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden">
                            <img
                                src={logo}
                                alt="Edible.io logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-7">
                        <h2 className="heading text-3xl font-bold text-gray-900 mb-1">{title}</h2>
                        <p className="text-sm text-gray-500">{sub}</p>
                    </div>

                    {/* Google button */}
                    {mode !== 'forgot' && (
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={status === 'loading'}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 shadow-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    )}

                    {/* Divider */}
                    {mode !== 'forgot' && (
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="text-xs text-gray-400 font-medium">or continue with email</span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="auth-input w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        {mode !== 'forgot' && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        Password
                                    </label>
                                    {mode === 'signin' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="auth-input w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Feedback */}
                        {message && (
                            <p className={`text-xs px-3 py-2 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                                {message}
                            </p>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-60"
                        >
                            {status === 'loading' ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Mode toggle */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        {mode === 'signin' ? (
                            <>Don't have an account?{' '}
                                <button onClick={() => { setMode('signup'); setMessage('') }} className="text-purple-500 font-semibold hover:text-purple-700 transition-colors">
                                    Register here
                                </button>
                            </>
                        ) : mode === 'signup' ? (
                            <>Already have an account?{' '}
                                <button onClick={() => { setMode('signin'); setMessage('') }} className="text-purple-500 font-semibold hover:text-purple-700 transition-colors">
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <button onClick={() => { setMode('signin'); setMessage('') }} className="text-purple-500 font-semibold hover:text-purple-700 transition-colors">
                                ← Back to sign in
                            </button>
                        )}
                    </p>
                </div>

                {/* ── RIGHT: Decorative panel ── */}
                <div
                    className="hidden md:flex w-[420px] flex-col items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #C6A0F6 100%)' }}
                >
                    {/* Geometric shapes */}
                    <div className="float-1 absolute top-10 left-8 w-24 h-24 rounded-full opacity-40" style={{ background: '#A855F7' }} />
                    <div className="float-2 absolute top-8 right-6 w-16 h-16 rounded-full opacity-30" style={{ background: '#7E22CE' }} />
                    <div className="float-3 absolute bottom-16 left-6 w-20 h-20 rounded-full opacity-20" style={{ background: '#581C87' }} />
                    <div className="float-1 absolute bottom-10 right-10 w-28 h-28 rounded-3xl rotate-12 opacity-30" style={{ background: '#A855F7' }} />
                    <div className="absolute top-1/2 left-0 w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" style={{ background: '#A855F7' }} />

                    {/* Geometric grid accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                        <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => (
                                <rect key={`${r}-${c}`} x={c * 32 + 2} y={r * 32 + 2} width={28} height={28} rx={4} fill="#A855F7" />
                            )))}
                        </svg>
                    </div>

                    {/* Wavy lines accent */}
                    <div className="absolute bottom-0 left-0 w-full opacity-20">
                        <svg viewBox="0 0 420 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {[0, 1, 2].map(i => (
                                <path key={i} d={`M0 ${20 + i * 20} Q105 ${5 + i * 20} 210 ${20 + i * 20} T420 ${20 + i * 20}`} stroke="#A855F7" strokeWidth="2" fill="none" />
                            ))}
                        </svg>
                    </div>

                    {/* Center content */}
                    <div className="relative z-10 text-center px-10">
                        {/* Big icon */}
                        <div className="w-20 h-20 rounded-3xl bg-white/40 backdrop-blur flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/50">
                            <img src={logo} alt="Edible.io" className="w-12 h-12 object-contain" />
                        </div>

                        <h3 className="heading text-3xl font-bold text-gray-900 mb-3 leading-tight">
                            Your pantry,<br />your plan.
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed max-w-[240px] mx-auto font-medium">
                            Snap a receipt. Get a full week of meals tailored to exactly what you bought.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}