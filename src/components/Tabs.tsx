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
        // Focus the new tab
        const tabList = e.currentTarget.parentElement
        const nextTab = tabList?.children[newIndex] as HTMLElement
        nextTab?.focus()
    }

    return (
        <div className={`bg-white rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden ${className}`}>
            {/* Tab Headers */}
            <div
                role="tablist"
                aria-label="Recipe details"
                className="flex border-b border-gray-100 bg-gray-50/50"
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
                            className={`relative flex-1 px-3 md:px-6 py-4 text-[10px] sm:text-xs md:text-sm font-bold tracking-wide uppercase transition-all duration-300 outline-none
                                focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset focus-visible:z-10
								${isActive ? 'text-purple-600 bg-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}`}
                        >
                            {tab.label}

                            {/* Active Indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-lavender-500 rounded-t-full"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div
                id={`panel-${activeTabId}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTabId}`}
                className="p-6 md:p-8 outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-b-2xl"
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
