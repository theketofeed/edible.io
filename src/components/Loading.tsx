import { memo, useEffect, useState } from 'react'

const MESSAGES = [
  "Reading your ingredients...",
  "Crafting balanced meals...",
  "Checking nutritional values...",
  "Almost ready...",
]

const Loading = memo(function Loading() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
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
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="flex flex-col items-center gap-10">

        {/* Animated orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <div className="absolute w-32 h-32 rounded-full bg-purple-200 opacity-30 animate-ping" 
               style={{ animationDuration: '2s' }} />
          {/* Middle ring */}
          <div className="absolute w-24 h-24 rounded-full bg-purple-300 opacity-20 animate-ping"
               style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          {/* Core orb */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-300/50 flex items-center justify-center"
               style={{ animation: 'float 3s ease-in-out infinite' }}>
            <span className="text-2xl">🥗</span>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Generating your meal plan
          </h3>
          <p
            className="text-gray-400 text-sm font-medium transition-all duration-400"
            style={{ 
              opacity: visible ? 1 : 0, 
              transform: visible ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease'
            }}
          >
            {MESSAGES[msgIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400"
              style={{
                animation: 'bounce 1.2s ease-in-out infinite',
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