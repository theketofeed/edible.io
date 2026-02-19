import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Timer as TimerIcon, Check } from 'lucide-react'

interface CookingModeProps {
    steps: string[]
    onClose: () => void
    mealTitle: string
    storageKey?: string
}

// Cooking Mode Component
export default function CookingMode({ steps, onClose, mealTitle, storageKey }: CookingModeProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

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
                const data = {
                    ...existing,
                    steps: Array.from(completedSteps)
                }
                localStorage.setItem(storageKey, JSON.stringify(data))
            } catch (e) {
                console.error('Failed to save cooking progress:', e)
            }
        }
    }, [completedSteps, storageKey])

    // Timer state
    const [timerSeconds, setTimerSeconds] = useState(0)
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [initialTimerSeconds, setInitialTimerSeconds] = useState(0)

    const currentStep = steps[currentStepIndex] || ''

    // Detect time in instruction (e.g., "10 minutes", "5 min", "1 hour")
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

    // Set timer when step changes or time is detected
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
        let interval: NodeJS.Timeout
        if (isTimerRunning && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev - 1)
            }, 1000)
        } else if (timerSeconds === 0) {
            setIsTimerRunning(false)
        }
        return () => clearInterval(interval)
    }, [isTimerRunning, timerSeconds])

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const nextStep = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            // Mark current step as complete before moving to next
            setCompletedSteps(prev => new Set(prev).add(currentStepIndex))
            setCurrentStepIndex((prev) => prev + 1)
        }
    }, [currentStepIndex, steps.length])

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1)
        }
    }, [currentStepIndex])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextStep()
            if (e.key === 'ArrowLeft') prevStep()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [nextStep, prevStep, onClose])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col font-sans"
        >
            {/* Header */}
            <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Cooking Mode</span>
                    <h2 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{mealTitle}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 hover:bg-white/10 rounded-full transition-colors focus:ring-2 focus:ring-white outline-none"
                    aria-label="Exit Cooking Mode"
                >
                    <X className="w-8 h-8" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-100 w-full overflow-hidden">
                <motion.div
                    className="h-full bg-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 text-center overflow-y-auto">
                <div className="max-w-4xl w-full">
                    <div className="relative mb-6">
                        <span className="text-purple-500 font-black text-xl block uppercase tracking-tighter">
                            Step {currentStepIndex + 1} of {steps.length}
                        </span>
                        {completedSteps.has(currentStepIndex) && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg"
                            >
                                <Check className="w-6 h-6" />
                            </motion.div>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentStepIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className={`text-4xl md:text-6xl font-black leading-tight md:leading-[1.1] mb-12 ${completedSteps.has(currentStepIndex)
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                                }`}
                        >
                            {currentStep}
                        </motion.p>
                    </AnimatePresence>

                    {/* Timer Integration */}
                    {initialTimerSeconds > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-purple-50 p-8 rounded-[2.5rem] border-2 border-purple-100 flex flex-col items-center mb-12 shadow-inner"
                        >
                            <div className="flex items-center gap-3 text-purple-600 mb-2">
                                <TimerIcon className="w-8 h-8" />
                                <span className="font-black uppercase tracking-widest text-lg">Timer Detection</span>
                            </div>
                            <div className={`text-7xl md:text-8xl font-black tabular-nums transition-colors duration-500 ${timerSeconds === 0 ? 'text-red-500 animate-pulse' : 'text-purple-700'}`}>
                                {formatTime(timerSeconds)}
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    className={`px-8 py-4 rounded-2xl font-black text-xl flex items-center gap-3 transition-all ${isTimerRunning
                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100'
                                        }`}
                                >
                                    {isTimerRunning ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                                    {isTimerRunning ? 'Pause' : 'Start Timer'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsTimerRunning(false)
                                        setTimerSeconds(initialTimerSeconds)
                                    }}
                                    className="p-4 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all focus:ring-2 focus:ring-purple-500 outline-none"
                                    aria-label="Reset Timer"
                                >
                                    <RotateCcw className="w-8 h-8" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 md:p-12 bg-white border-t border-gray-100 flex items-center justify-between gap-6 max-w-5xl mx-auto w-full">
                <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-6 md:py-8 rounded-3xl font-black text-2xl border-4 border-gray-100 text-gray-400 enabled:hover:border-purple-200 enabled:hover:text-purple-600 enabled:active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-8 h-8" />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {currentStepIndex === steps.length - 1 ? (
                    <button
                        onClick={onClose}
                        className="flex-[2] py-6 md:py-8 bg-green-600 text-white rounded-3xl font-black text-2xl md:text-3xl flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-xl shadow-green-100"
                    >
                        <Check className="w-10 h-10" />
                        Finish Cooking
                    </button>
                ) : (
                    <button
                        onClick={nextStep}
                        className="flex-[2] py-6 md:py-8 bg-purple-600 text-white rounded-3xl font-black text-2xl md:text-3xl flex items-center justify-center gap-3 hover:bg-purple-700 active:scale-95 transition-all shadow-xl shadow-purple-100"
                    >
                        Next Step
                        <ChevronRight className="w-10 h-10" />
                    </button>
                )}
            </div>
        </motion.div>
    )
}
