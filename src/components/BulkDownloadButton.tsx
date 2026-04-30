import { useState, useRef } from 'react'
import { Download, FileArchive } from 'lucide-react'
import { motion } from 'framer-motion'
import JSZip from 'jszip'
import type { MealPlanResult, Meal } from '../utils/types'
import { getElementAsPDFBlob } from '../utils/pdfHelper'
import { createPortal } from 'react-dom'
import { Clock, ChefHat, Timer } from 'lucide-react'
import logo from '../assets/Transparent logo.png'
import { usePlan } from '../hooks/usePlan'

interface Props {
    result: MealPlanResult
    showToast: (type: 'success' | 'error' | 'info', message: string) => void
    onUpgradeRequired?: (trigger: string) => void
}

export default function BulkDownloadButton({ result, showToast, onUpgradeRequired }: Props) {
    const { canSeeChefTips, canBulkDownloadRecipes } = usePlan()
    const [isExporting, setIsExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentMeal, setCurrentMeal] = useState<{ meal: Meal, dayName: string, mealType: string } | null>(null)
    const pdfRef = useRef<HTMLDivElement>(null)

    const handleBulkDownload = async () => {
        if (!canBulkDownloadRecipes) {
            onUpgradeRequired?.('bulk_download_recipes')
            return
        }

        setIsExporting(true)
        setProgress(0)
        showToast('info', 'Preparing all recipe PDFs. This may take a moment...')

        const zip = new JSZip()
        const allMeals: { meal: Meal, dayName: string, mealType: string }[] = []

        result.days.forEach((day, dayIdx) => {
            const dayName = day.day
            allMeals.push({ meal: day.Breakfast, dayName, mealType: 'Breakfast' })
            allMeals.push({ meal: day.Lunch, dayName, mealType: 'Lunch' })
            allMeals.push({ meal: day.Dinner, dayName, mealType: 'Dinner' })
        })

        const total = allMeals.length

        try {
            for (let i = 0; i < allMeals.length; i++) {
                const item = allMeals[i]
                setCurrentMeal(item)
                setProgress(Math.round(((i) / total) * 100))

                // Wait for render
                await new Promise(r => setTimeout(r, 600))

                if (pdfRef.current) {
                    pdfRef.current.classList.add('pdf-export-mode')
                    const filename = `${item.dayName.replace(/\s+/g, '-')}-${item.mealType}-${item.meal.title.replace(/\s+/g, '-').toLowerCase()}.pdf`
                    const blob = await getElementAsPDFBlob(pdfRef.current, filename)
                    pdfRef.current.classList.remove('pdf-export-mode')
                    if (blob) {
                        zip.file(filename, blob)
                    }
                }
            }

            setProgress(100)
            const content = await zip.generateAsync({ type: 'blob' })
            const url = window.URL.createObjectURL(content)
            const link = document.createElement('a')
            link.href = url
            link.download = `${result.diet.toLowerCase()}-meal-plan-recipes.zip`
            link.click()
            window.URL.revokeObjectURL(url)

            showToast('success', 'All recipes downloaded successfully!')
        } catch (err) {
            console.error('Bulk Export Error:', err)
            showToast('error', 'Failed to download recipes.')
        } finally {
            setIsExporting(false)
            setCurrentMeal(null)
        }
    }

    return (
        <>
            <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                className="h-12 px-6 rounded-2xl bg-white/40 backdrop-blur-md text-gray-700 text-[14px] font-bold border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:bg-white/60 transition-all flex items-center"
                onClick={handleBulkDownload}
                disabled={isExporting}
            >
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mr-3 border border-amber-100/50">
                    {isExporting ? (
                        <div className="text-[10px] font-bold text-amber-600">{progress}%</div>
                    ) : (
                        <FileArchive className="w-4 h-4 text-amber-500" />
                    )}
                </div>
                {isExporting ? 'Preparing Recipes...' : 'Download All Recipes'}
            </motion.button>

            {/* Hidden Renderer Portal */}
            {isExporting && currentMeal && createPortal(
                <div ref={pdfRef} className="pdf-only pdf-export-container p-12 bg-white text-gray-900 w-[800px]">
                    <div className="pdf-avoid-break mb-12">
                        <div className="flex items-end justify-between border-b-2 border-purple-100 pb-6 mb-8 w-full">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight leading-none flex whitespace-nowrap items-baseline">Edible<span className="text-purple-500">.io</span></h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Personalized AI Chef</p>
                                </div>
                            <div className="text-right">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{currentMeal.dayName}</p>
                                <p className="text-sm font-black text-purple-600 uppercase tracking-tight">{currentMeal.mealType}</p>
                            </div>
                        </div>

                        <h1 className="text-4xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
                            {currentMeal.meal.title}
                        </h1>
                    </div>

                    <div className="mb-10 pdf-avoid-break">
                        <div className="flex gap-8 mb-10 pb-8 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-orange-500" />
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prep</p>
                                    <p className="text-sm font-bold">{currentMeal.meal.prepTime} min</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <ChefHat className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cook</p>
                                    <p className="text-sm font-bold">{currentMeal.meal.cookTime} min</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Timer className="w-5 h-5 text-purple-600" />
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                                    <p className="text-sm font-bold">{currentMeal.meal.totalTime || (currentMeal.meal.prepTime || 0) + (currentMeal.meal.cookTime || 0)} min</p>
                                </div>
                            </div>
                        </div>

                        {currentMeal.meal.nutrition && (
                            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mb-10 w-full box-border">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Nutrition Guide (per serving)</p>
                                <div className="grid grid-cols-4 gap-8 w-full">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-gray-900 leading-none mb-1">{currentMeal.meal.nutrition.calories}</p>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Calories</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-gray-900 leading-none mb-1">{currentMeal.meal.nutrition.protein}g</p>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Protein</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-gray-900 leading-none mb-1">{currentMeal.meal.nutrition.carbs}g</p>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Carbs</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-gray-900 leading-none mb-1">{currentMeal.meal.nutrition.fat}g</p>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Fat</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                                Ingredients
                            </h2>
                            <ul className="space-y-3">
                                {currentMeal.meal.ingredients?.map((ing, i) => (
                                    <li key={i} className="flex gap-4 items-center py-2 border-b border-gray-50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
                                        <span className="text-gray-700 font-medium">{ing}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                                Instructions
                            </h2>
                            <div className="space-y-6">
                                {(Array.isArray(currentMeal.meal.instructions) ? currentMeal.meal.instructions : [currentMeal.meal.instructions]).map((step, i) => (
                                    <div key={i} className="flex gap-5">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-black text-sm flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-gray-700 leading-relaxed font-medium pt-1">
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {canSeeChefTips && currentMeal.meal.tips && currentMeal.meal.tips.length > 0 && (
                            <div className="pt-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                                    Chef Tips
                                </h2>
                                <div className="space-y-4">
                                    {currentMeal.meal.tips.map((tip, i) => (
                                        <div key={i} className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100/50 italic text-gray-700 font-medium">
                                            "{tip}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-400 font-medium italic">
                            Made with love by Edible.io — Your Personal AI Chef
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
