import { memo, useEffect, useState, useRef } from 'react'
import { ChefHat, FileText, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    icon: ChefHat,
    label: 'Meals',
    message: 'Building your meal combinations...',
    pct: 20,
  },
  {
    icon: FileText,
    label: 'Recipes',
    message: 'Writing your recipes...',
    pct: 65,
  },
  {
    icon: CheckCircle,
    label: 'Done',
    message: 'Finalising your plan...',
    pct: 92,
  },
]

const Loading = memo(function Loading({ step }: { step?: number }) {
  const [msgVisible, setMsgVisible] = useState(true)
  const [displayPct, setDisplayPct] = useState(STEPS[0].pct)
  const prevStepRef = useRef<number>(step ?? 0)
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const activeStep = Math.min(step ?? 0, STEPS.length - 1)
  const current = STEPS[activeStep]
  const MainIcon = current.icon

  // Fade message on step change
  useEffect(() => {
    if (prevStepRef.current === activeStep) return
    prevStepRef.current = activeStep
    setMsgVisible(false)
    const t = setTimeout(() => setMsgVisible(true), 250)
    return () => clearTimeout(t)
  }, [activeStep])

  // Creep the progress bar forward while waiting, snap on real step change
  useEffect(() => {
    if (creepRef.current) clearInterval(creepRef.current)

    // Snap to the real step's starting pct immediately
    const startPct = STEPS[activeStep].pct
    setDisplayPct(startPct)

    // Creep ceiling: midpoint between this step and the next, minus a small buffer
    const nextPct = activeStep < STEPS.length - 1 ? STEPS[activeStep + 1].pct : 98
    const ceiling = startPct + (nextPct - startPct) * 0.75

    creepRef.current = setInterval(() => {
      setDisplayPct(prev => {
        if (prev >= ceiling) {
          if (creepRef.current) clearInterval(creepRef.current)
          return prev
        }
        // Slow down as it approaches ceiling (easing)
        const remaining = ceiling - prev
        const increment = Math.max(0.05, remaining * 0.008)
        return Math.min(prev + increment, ceiling)
      })
    }, 300)

    return () => {
      if (creepRef.current) clearInterval(creepRef.current)
    }
  }, [activeStep])

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-[80vh] px-4"
    >
      <style>{`
        @keyframes bowlFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes iconFade {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .bowl-float { animation: bowlFloat 2.5s ease-in-out infinite; }
        .ripple-1 { animation: ripple 2s ease-out infinite; }
        .ripple-2 { animation: ripple 2s ease-out infinite 0.7s; }
        .icon-fade { animation: iconFade 0.35s ease forwards; }
        .progress-fill { transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      <div className="relative bg-white/70 backdrop-blur-2xl border border-white shadow-[0_32px_128px_rgba(0,0,0,0.08)] rounded-[52px] p-12 md:p-16 flex flex-col items-center gap-8 max-w-sm w-full mx-auto">

        {/* Animated icon — changes with step */}
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          <div className="ripple-1 absolute w-32 h-32 rounded-full border-2 border-purple-200" />
          <div className="ripple-2 absolute w-32 h-32 rounded-full border-2 border-purple-100" />
          <div
            key={activeStep}
            className="bowl-float icon-fade relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-2xl shadow-purple-500/30 flex items-center justify-center"
          >
            <MainIcon className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title + step message */}
        <div className="text-center space-y-2 w-full">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Generating your <br /> meal plan
          </h3>
          <p
            className="text-gray-400 text-sm font-semibold h-5 transition-all duration-300"
            style={{
              opacity: msgVisible ? 1 : 0,
              transform: msgVisible ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {current.message}
          </p>
        </div>

        {/* Progress bar — creeps forward in real time */}
        <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="progress-fill h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
            style={{ width: `${displayPct}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between w-full px-1">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon
            const isDone = idx < activeStep
            const isActive = idx === activeStep
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-400 ${
                    isDone
                      ? 'bg-green-50 border-green-300'
                      : isActive
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-gray-50 border-gray-200 opacity-40'
                  }`}
                >
                  <StepIcon
                    className={`w-4 h-4 transition-colors duration-400 ${
                      isDone ? 'text-green-600' : isActive ? 'text-purple-600' : 'text-gray-400'
                    }`}
                    strokeWidth={1.8}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-400 ${
                    isActive ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
})

export default Loading
