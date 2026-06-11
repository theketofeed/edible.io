import { memo } from 'react'
import { XCircle, CheckCircle, ArrowRight } from 'lucide-react'

const ComparisonSection = memo(function ComparisonSection() {
    return (
        <section className="py-8 sm:py-12 md:py-20 lg:py-24 bg-white">
            <div className="w-full max-w-5xl sm:max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
                {/* Section Header */}
                <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 mb-2 sm:mb-3 md:mb-4 leading-tight">
                        Stop Wasting Food, <span className="text-purple-600">Start Eating Better</span>
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-2">
                        Ditch the stress of planning and expensive waste. Let Edible organize your kitchen instantly.
                    </p>
                </div>

                {/* Comparison Grid */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center">

                    {/* Desktop Arrow (Absolute Centered) */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-col items-center justify-center text-purple-400">
                        <ArrowRight size={32} strokeWidth={2.5} />
                    </div>

                    {/* LEFT CARD - "WITHOUT EDIBLE" (Problems) */}
                    <div className="relative bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-sm hover:scale-[1.01] transition-transform duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-700">Without Edible</h3>
                        </div>
                        <p className="text-gray-500 text-[12px] sm:text-xs md:text-sm font-medium mb-4 sm:mb-6 md:mb-8">The daily struggle with meal planning</p>

                        <div className="space-y-3 sm:space-y-5 md:space-y-7">
                            {/* Problem 1 */}
                            <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Food Waste & Guilt</h4>
                                    <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                        Groceries spoil before you use them. <span className="font-bold text-gray-900">$200+/month</span> wasted on food that goes bad.
                                    </p>
                                </div>
                            </div>

                            {/* Problem 2 */}
                            <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Decision Fatigue</h4>
                                    <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                        Spend <span className="font-bold text-gray-900">30+ minutes</span> daily wondering 'What's for dinner?'.
                                    </p>
                                </div>
                            </div>

                            {/* Problem 3 */}
                            <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Expensive Recipe Apps</h4>
                                    <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                        Meal planners tell you to buy <span className="font-bold text-gray-900">20 new ingredients</span> you'll never use again.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT CARD - "WITH EDIBLE" (Solutions) */}
                    <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-[0_8px_16px_rgba(167,139,250,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(167,139,250,0.25)] transition-all duration-300">
                        {/* Subtle Glow */}
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-[0_0_40px_rgba(167,139,250,0.15)] pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-700">With Edible</h3>
                            </div>
                            <p className="text-purple-600 text-[12px] sm:text-xs md:text-sm font-medium mb-4 sm:mb-6 md:mb-8">Transform your meal planning experience</p>

                            <div className="space-y-3 sm:space-y-5 md:space-y-7">
                                {/* Solution 1 */}
                                <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Zero Food Waste</h4>
                                        <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                            Use exactly what you bought. Save <span className="font-bold text-purple-600">$200+/month</span> and reduce guilt.
                                        </p>
                                    </div>
                                </div>

                                {/* Solution 2 */}
                                <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Instant Meal Plans</h4>
                                        <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                            Know what's for dinner in <span className="font-bold text-purple-600">30 seconds</span>. No thinking, no stress.
                                        </p>
                                    </div>
                                </div>

                                {/* Solution 3 */}
                                <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">Simple & Realistic</h4>
                                        <p className="text-[12px] sm:text-xs md:text-sm lg:text-[15px] text-gray-600 leading-relaxed">
                                            No complicated recipes or missing ingredients. Cook what you actually have.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
})

export default ComparisonSection
