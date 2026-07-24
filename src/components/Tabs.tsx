import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Tab {
    id: string
    label: string
    content: ReactNode
}

interface TabsProps {
    tabs: Tab[]
    defaultTabId?: string
    className?: string
}

export default function Tabs({ tabs, defaultTabId, className = '' }: TabsProps) {
    const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id)

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let newIndex = index
        if (e.key === 'ArrowRight') {
            newIndex = (index + 1) % tabs.length
        } else if (e.key === 'ArrowLeft') {
            newIndex = (index - 1 + tabs.length) % tabs.length
        } else if (e.key === 'Home') {
            newIndex = 0
        } else if (e.key === 'End') {
            newIndex = tabs.length - 1
        } else {
            return
        }

        e.preventDefault()
        setActiveTabId(tabs[newIndex].id)
        const tabList = e.currentTarget.parentElement
        const nextTab = tabList?.children[newIndex] as HTMLElement
        nextTab?.focus()
    }

    return (
        <div className={`bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-50/50 overflow-hidden ${className}`}>
            {/* Tab Headers — segmented pill switcher */}
            <div className="p-3 sm:p-4 bg-white border-b border-gray-50">
                <div
                    role="tablist"
                    aria-label="Recipe details"
                    className="flex items-center gap-1 bg-gray-50 rounded-full p-1 overflow-x-auto"
                >
                    {tabs.map((tab, index) => {
                        const isActive = activeTabId === tab.id
                        return (
                            <button
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => setActiveTabId(tab.id)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className={`relative flex-1 min-w-max px-4 sm:px-5 py-2.5 text-[11px] sm:text-[12px] font-bold tracking-wide rounded-full transition-colors duration-300 outline-none
									${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div
                id={`panel-${activeTabId}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTabId}`}
                className="p-4 sm:p-6 md:p-8 outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-b-2xl"
                tabIndex={0}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTabId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        {activeTab.content}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
