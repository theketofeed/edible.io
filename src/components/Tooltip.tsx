import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
    children: ReactNode
    content: string
    disabled?: boolean
}

export default function Tooltip({ children, content, disabled }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false)

    return (
        <div 
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
            onTouchStart={() => setIsVisible(true)}
            onTouchEnd={() => {
                // Keep visible for a moment on mobile so user can actually read it
                setTimeout(() => setIsVisible(false), 1500)
            }}
        >
            {children}
            <AnimatePresence>
                {isVisible && !disabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900/95 backdrop-blur-md text-white text-[11px] font-bold rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.2)] whitespace-nowrap z-[100] pointer-events-none border border-white/10"
                    >
                        {content}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
