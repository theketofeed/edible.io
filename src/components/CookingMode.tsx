import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Timer as TimerIcon, Check, Mic, MicOff } from 'lucide-react'

interface CookingModeProps {
    steps: string[]
    onClose: () => void
    mealTitle: string
    storageKey?: string
}

export default function CookingMode({ steps, onClose, mealTitle, storageKey }: CookingModeProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
    const stepRef = useRef<HTMLDivElement>(null)

    // Hands-free voice control state
    const [isVoiceActive, setIsVoiceActive] = useState(false)
    const [lastTranscript, setLastTranscript] = useState('')
    const recognitionRef = useRef<any>(null)

    // Load completed steps from localStorage
    useEffect(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey)
                if (saved) {
                    const { steps: savedSteps } = JSON.parse(saved)
                    if (Array.isArray(savedSteps)) {
                        setCompletedSteps(new Set(savedSteps))
                    }
                }
            } catch (e) {
                console.error('Failed to load cooking progress:', e)
            }
        }
    }, [storageKey])

    // Save completed steps to localStorage
    useEffect(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey)
                const existing = saved ? JSON.parse(saved) : {}
                const data = { ...existing, steps: Array.from(completedSteps) }
                localStorage.setItem(storageKey, JSON.stringify(data))
            } catch (e) {
                console.error('Failed to save cooking progress:', e)
            }
        }
    }, [completedSteps, storageKey])

    // Voice control setup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) return

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'
        recognitionRef.current = recognition

        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()
            setLastTranscript(transcript)

            if (transcript.includes('next') || transcript.includes('forward')) {
                handleNext()
            } else if (transcript.includes('previous') || transcript.includes('back')) {
                handlePrev()
            } else if (transcript.includes('close') || transcript.includes('exit') || transcript.includes('finish')) {
                onClose()
            }
        }

        recognition.onerror = () => {
            setIsVoiceActive(false)
        }

        recognition.onend = () => {
            if (isVoiceActive) {
                try { recognition.start() } catch { /* ignore */ }
            }
        }

        return () => {
            try { recognition.stop() } catch { /* ignore */ }
        }
    }, [isVoiceActive, onClose])

    // Voice control toggle
    useEffect(() => {
        if (!recognitionRef.current) return
        if (isVoiceActive) {
            try { recognitionRef.current.start() } catch { /* already running */ }
        } else {
            try { recognitionRef.current.stop() } catch { /* already stopped */ }
            setLastTranscript('')
        }
    }, [isVoiceActive])

    // Timer state
    const [timerSeconds, setTimerSeconds] = useState(0)
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [initialTimerSeconds, setInitialTimerSeconds] = useState(0)

    const currentStep = steps[currentStepIndex] || ''

    // Detect time in instruction
    const detectedTime = useMemo(() => {
        const timeRegex = /(\d+)\s*(min|minute|minutes|hr|hour|hours)/i
        const match = currentStep.match(timeRegex)
        if (match) {
            const val = parseInt(match[1])
            const unit = match[2].toLowerCase()
            if (unit.startsWith('h')) return val * 3600
            return val * 60
        }
        return null
    }, [currentStep])

    // Set timer when step changes
    useEffect(() => {
        if (detectedTime) {
            setTimerSeconds(detectedTime)
            setInitialTimerSeconds(detectedTime)
            setIsTimerRunning(false)
        } else {
            setTimerSeconds(0)
            setInitialTimerSeconds(0)
            setIsTimerRunning(false)
        }
    }, [currentStepIndex, detectedTime])

    // Timer logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (isTimerRunning && timerSeconds > 0) {
                setTimerSeconds(prev => prev - 1)
            } else if (timerSeconds === 0) {
                setIsTimerRunning(false)
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [isTimerRunning, timerSeconds])

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleNext = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            setCompletedSteps(prev => new Set(prev).add(currentStepIndex))
            setCurrentStepIndex(prev => prev + 1)
            stepRef.current?.scrollTo(0, 0)
        }
    }, [currentStepIndex, steps.length])

    const handlePrev = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1)
            stepRef.current?.scrollTo(0, 0)
        }
    }, [currentStepIndex])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext() }
            if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev() }
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNext, handlePrev, onClose])

    const progressPercent = ((currentStepIndex + 1) / steps.length) * 100

    return (
        <div className="fixed inset-0 z-[100] bg-neutral-50 flex flex-col" style={{ fontFamily: 'Geist, Geist Sans, -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif' }}>
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-purple-500">Cooking Mode</span>
                        <span className="text-neutral-300">|</span>
                        <span className="text-[10px] text-neutral-400">Step {currentStepIndex + 1}/{steps.length}</span>
                    </div>
                    <h2 className="text-sm md:text-base font-semibold text-neutral-900 truncate pr-4">{mealTitle}</h2>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 rounded-xl transition-colors flex-shrink-0"
                    aria-label="Exit Cooking Mode"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Voice Feedback Banner - Shows when voice is active and transcript is received */}
            {isVoiceActive && lastTranscript && (
                <div className="bg-purple-50 border-b border-purple-100 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                    <Mic className="w-4 h-4 text-purple-500 animate-pulse flex-shrink-0" />
                    <span className="text-sm text-purple-700 truncate">Heard: "{lastTranscript}"</span>
                </div>
            )}

            {/* Progress Bar */}
            <div className="h-1 bg-neutral-100 flex-shrink-0">
                <div
                    className="h-full bg-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain ios-scroll">
                <div className="min-h-full flex flex-col">
                    {/* Step Content - Centered and Bold */}
                    <div className="flex-1 flex flex-col justify-center px-5 md:px-8 lg:px-12 py-8 md:py-12">
                        <div
                            ref={stepRef}
                            className="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full text-center"
                        >
                            <p
                                className={`font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed md:leading-normal ${completedSteps.has(currentStepIndex)
                                    ? 'text-neutral-300 line-through'
                                    : 'text-neutral-900'
                                    }`}
                            >
                                {currentStep}
                            </p>
                        </div>
                    </div>

                    {/* Timer - Only show if time detected */}
                    {initialTimerSeconds > 0 && (
                        <div className="px-4 md:px-6 pb-4 md:pb-6 flex-shrink-0">
                            <div className="max-w-xl md:max-w-2xl mx-auto">
                                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5 flex items-center gap-3 md:gap-5">
                                    {/* Timer Circle */}
                                    <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                                            <circle
                                                cx="32" cy="32" r="28"
                                                className="fill-none stroke-neutral-100"
                                                strokeWidth="4"
                                            />
                                            <circle
                                                cx="32" cy="32" r="28"
                                                className="fill-none stroke-purple-500"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 28}`}
                                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerSeconds / initialTimerSeconds)}`}
                                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                                            />
                                        </svg>
                                        <TimerIcon className="absolute inset-0 m-auto w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                                    </div>

                                    {/* Timer Display */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-2xl md:text-3xl lg:text-4xl font-bold tabular-nums ${timerSeconds === 0 ? 'text-red-500' : 'text-neutral-900'}`}>
                                            {formatTime(timerSeconds)}
                                        </div>
                                        <div className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-wide">Timer</div>
                                    </div>

                                    {/* Timer Controls */}
                                    <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${isTimerRunning
                                                ? 'bg-neutral-100 text-neutral-600'
                                                : 'bg-purple-500 text-white'
                                                }`}
                                        >
                                            {isTimerRunning ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
                                        </button>
                                        <button
                                            onClick={() => { setIsTimerRunning(false); setTimerSeconds(initialTimerSeconds) }}
                                            className="w-10 h-10 md:w-12 md:h-12 bg-neutral-100 text-neutral-400 rounded-xl flex items-center justify-center hover:bg-neutral-200 hover:text-neutral-600 transition-colors"
                                            aria-label="Reset Timer"
                                        >
                                            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="bg-white border-t border-neutral-200 px-4 py-3 md:py-4 flex-shrink-0">
                <div className="max-w-xl md:max-w-2xl mx-auto flex items-center gap-2 md:gap-3">
                    {/* Hands-Free Mode Button */}
                    <button
                        onClick={() => setIsVoiceActive(!isVoiceActive)}
                        className={`group flex items-center gap-2 px-3 md:px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                            isVoiceActive
                                ? 'bg-purple-500 text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        {isVoiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isVoiceActive ? 'Listening' : 'Hands-Free'}</span>
                        {isVoiceActive && (
                            <span className="sm:hidden flex items-center gap-1">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handlePrev}
                        disabled={currentStepIndex === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-semibold border border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm md:text-base">Back</span>
                    </button>

                    {currentStepIndex === steps.length - 1 ? (
                        <button
                            onClick={onClose}
                            className="flex-[2] py-3.5 bg-neutral-900 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                            <span className="text-sm md:text-base">Finish</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex-[2] py-3.5 bg-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-purple-600 transition-colors"
                        >
                            <span className="text-sm md:text-base">Next</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Voice Commands Hint */}
                <div className="max-w-xl mx-auto mt-2 text-center">
                    <span className="text-[10px] text-neutral-400">
                        {isVoiceActive ? 'Say: "Next" • "Back" • "Close"' : 'Enable hands-free for voice control'}
                    </span>
                </div>
            </div>

            <style>{`
                .ios-scroll {
                    -webkit-overflow-scrolling: touch;
                }
            `}</style>
        </div>
    )
}
