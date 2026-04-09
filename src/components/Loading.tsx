import { memo, useEffect, useState, useRef } from 'react'
import { Salad } from 'lucide-react'

const MESSAGES = [
  "Reading your ingredients...",
  "Crafting balanced meals...",
  "Checking nutritional values...",
  "Almost ready...",
]

const Loading = memo(function Loading() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to center on mount
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-[80vh] px-4"
    >
      <style>{`
        @keyframes bowlFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .bowl-float { animation: bowlFloat 3s ease-in-out infinite; }
        .ripple-1 { animation: ripple 2.5s ease-out infinite; }
        .ripple-2 { animation: ripple 2.5s ease-out infinite 0.8s; }
      `}</style>

      {/* Modern Aesthetic Floating Card */}
      <div className="relative bg-white/70 backdrop-blur-2xl border border-white shadow-[0_32px_128px_rgba(0,0,0,0.08)] rounded-[52px] p-12 md:p-16 flex flex-col items-center gap-12 max-w-sm w-full mx-auto">
        
        {/* Animated Icon Section */}
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          {/* Ripple rings */}
          <div className="ripple-1 absolute w-32 h-32 rounded-full border-2 border-purple-200" />
          <div className="ripple-2 absolute w-32 h-32 rounded-full border-2 border-purple-100" />

          {/* Central Salad Icon */}
          <div
            className="bowl-float relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-2xl shadow-purple-500/30 flex items-center justify-center"
          >
            <Salad className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Section */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Generating your <br/> meal plan
          </h3>
          <p
            className="text-gray-400 text-sm font-semibold h-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'all 0.4s ease'
            }}
          >
            {MESSAGES[msgIndex]}
          </p>
        </div>

        {/* Bouncing Progress Dots */}
        <div className="flex gap-2.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-purple-500/20"
              style={{
                animation: 'bounce 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

export default Loading