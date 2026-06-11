import { useState, useMemo, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChefHat, Timer, ArrowLeft, CheckCircle2, Circle, Share2, Zap, Download, Heart, Lightbulb, Crown, FileText, Check } from 'lucide-react'
import type { Meal } from '../utils/types'
import Tabs, { Tab } from './Tabs'
import NutritionBadges from './NutritionBadges'
import type { ToastKind } from './Toast'
import { fetchMealImage } from '../lib/mealImages'
import CookingMode from './CookingMode'
import PricingModal from './PricingModal'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { saveSavedRecipe, deleteSavedRecipe, getUserSavedRecipes } from '../lib/db'
import { supabase } from '../lib/supabase'
import Tooltip from './Tooltip'
import { downloadElementAsPDF } from '../utils/pdfHelper'
import MealImagePlaceholder from './MealImagePlaceholder'
import logo from '../assets/favicon.png'

interface RecipeDetailProps {
    meal?: Meal
    mealType: 'Breakfast' | 'Lunch' | 'Dinner'
    dayName: string
    onBack: () => void
    backLabel?: string
    showToast?: (type: ToastKind, message: string) => void
}

const RecipeDetailSkeleton = ({ onBack, backLabel }: { onBack: () => void, backLabel?: string }) => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-lavender-50 pb-20 pt-[env(safe-area-inset-top)]">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-purple-100">
            <div className="w-full max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-purple-600 font-bold min-h-[44px]">
                    <ArrowLeft className="w-5 h-5" />
                    {backLabel || "Back to Meal Plan"}
                </button>
            </div>
        </div>

        <div className="w-full max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
                <div className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden mb-6 sm:mb-8 md:mb-12 border border-purple-100/50">
                <div className="h-[160px] sm:h-[200px] md:h-[300px] bg-gray-200" />
                <div className="p-4 sm:p-6 md:p-12">
                    <div className="flex gap-4 mb-6 md:mb-8">
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                        <div className="h-6 w-24 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-10 md:h-12 w-3/4 bg-gray-200 rounded-xl mb-8 md:mb-10" />
                    <div className="flex gap-6 md:gap-8 overflow-hidden">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-100" />
                                <div className="space-y-2">
                                    <div className="h-2 w-8 bg-gray-100 rounded" />
                                    <div className="h-4 w-12 bg-gray-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl p-6 md:p-10 mb-8 md:mb-12 border border-purple-100/50">
                <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6 md:mb-8" />
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-10 md:h-12 w-28 md:w-32 bg-gray-100 rounded-full flex-shrink-0" />
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden">
                <div className="flex border-b border-gray-100 bg-gray-50/50 h-14">
                    <div className="flex-1 bg-white border-b-2 border-purple-200" />
                    <div className="flex-1" />
                </div>
                <div className="p-6 md:p-8 space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-14 md:h-16 w-full bg-gray-50 rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    </div>
)

function getDifficulty(steps: number, totalTime: number): { label: 'Easy' | 'Medium' | 'Hard'; color: string; bg: string; border: string; bar: string } {
  if (totalTime <= 20 && steps <= 4) return { label: 'Easy', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e' }
  if (totalTime <= 40 && steps <= 7) return { label: 'Medium', color: '#b45309', bg: '#fefce8', border: '#fde68a', bar: '#f59e0b' }
  return { label: 'Hard', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', bar: '#ef4444' }
}

export default function RecipeDetail({ meal, mealType, dayName, onBack, backLabel, showToast }: RecipeDetailProps) {
    const { user } = useAuth()
    const { canSeeChefTips, checkRecipeLimit } = usePlan()
    
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
    const [recipeImage, setRecipeImage] = useState<string | null>(null)
    const [isImageLoading, setIsImageLoading] = useState(true)
    const [isCookingModeOpen, setIsCookingModeOpen] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [pricingOpen, setPricingOpen] = useState(false)
    const [pricingTrigger, setPricingTrigger] = useState('')
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [pdfImageDataUrl, setPdfImageDataUrl] = useState<string | null>(null)
    const pdfRef = useRef<HTMLDivElement>(null)

    // Defensive checks for required properties
    const safeMeal = useMemo(() => {
        if (!meal) return null
        return {
            ...meal,
            title: meal.title || 'Untitled Recipe',
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            instructions: Array.isArray(meal.instructions) ? meal.instructions : [meal.instructions || 'No instructions provided.'],
            nutrition: meal.nutrition,
            prepTime: meal.prepTime || 0,
            cookTime: meal.cookTime || 0,
            totalTime: meal.totalTime || (meal.prepTime || 0) + (meal.cookTime || 0)
        }
    }, [meal])

    // Storage key unique to this specific recipe in this meal plan
    const storageKey = useMemo(() => {
        if (!safeMeal) return ''
        return `edible-recipe-${dayName}-${mealType}-${safeMeal.title.replace(/\s+/g, '-').toLowerCase()}`
    }, [dayName, mealType, safeMeal])

    // Check if recipe is saved on mount
    useEffect(() => {
        if (!user || !safeMeal) return
        let cancelled = false

        // Fetch saved status — use a simple select instead of full list
        supabase
            .from('saved_recipes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('recipe_title', safeMeal.title)
            .then(({ count, error }) => {
                if (cancelled || error) return
                setIsSaved((count ?? 0) > 0)
            })

        return () => { cancelled = true }
    }, [user?.id, safeMeal?.title]) // Only re-run if user or recipe changes

    // Fetch Unsplash Image
    useEffect(() => {
        if (!safeMeal) return
        let isMounted = true
        const loadImage = async () => {
            setIsImageLoading(true)
            const imageUrl = await fetchMealImage(safeMeal.title)
            if (isMounted) {
                setRecipeImage(imageUrl)
                setIsImageLoading(false)
            }
        }
        loadImage()
        return () => { isMounted = false }
    }, [safeMeal])

    // Load initial state from localStorage
    useEffect(() => {
        if (!storageKey) return
        try {
            const saved = localStorage.getItem(storageKey)
            if (saved) {
                const { ingredients, steps } = JSON.parse(saved)
                if (Array.isArray(ingredients)) setCheckedIngredients(new Set(ingredients))
                if (Array.isArray(steps)) setCompletedSteps(new Set(steps))
            }
        } catch (e) {
            console.error('Failed to load recipe progress:', e)
        }
    }, [storageKey])

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        if (!storageKey) return
        try {
            const data = {
                ingredients: Array.from(checkedIngredients),
                steps: Array.from(completedSteps)
            }
            localStorage.setItem(storageKey, JSON.stringify(data))
        } catch (e) {
            console.error('Failed to save recipe progress:', e)
        }
    }, [checkedIngredients, completedSteps, storageKey])

    // Handle heart/save button click
    const handleSaveRecipe = async () => {
        if (!user || !safeMeal) {
            showToast?.('info', user ? 'Loading recipe...' : 'Sign in to save recipes')
            return
        }

        const wasAlreadySaved = isSaved

        // Flip instantly — optimistic update
        setIsSaved(!wasAlreadySaved)

        try {
            if (wasAlreadySaved) {
                await deleteSavedRecipe(safeMeal.title)
                showToast?.('success', 'Recipe removed from saved')
            } else {
                // Only check limit for genuinely new saves
                const { allowed } = await checkRecipeLimit()
                if (!allowed) {
                    setIsSaved(false) // revert — limit reached
                    setPricingTrigger('recipe_limit')
                    setPricingOpen(true)
                    return
                }
                await saveSavedRecipe(safeMeal.title, mealType, safeMeal)
                showToast?.('success', 'Recipe saved!')
            }
        } catch (e: any) {
            // Revert optimistic update on real error
            setIsSaved(wasAlreadySaved)
            if (e.name === 'AbortError' || e.message?.includes('Lock')) {
                showToast?.('error', 'Please try again.')
                return
            }
            console.error('[RecipeDetail] Save error:', e)
            showToast?.('error', 'Failed to update saved recipe')
        }
    }




    const handleShare = () => {
        setIsShareMenuOpen(!isShareMenuOpen)
    }

    const copyRecipeText = async () => {
        if (!safeMeal) return
        
        const recipeSummary = `${safeMeal.title}


${mealType} - ${dayName}

 Prep: ${safeMeal.prepTime} min | Cook: ${safeMeal.cookTime} min | Total: ${safeMeal.totalTime} min
 ⚡ Difficulty: ${difficulty.label} · ${safeMeal.totalTime} min · ${instructionSteps.length} steps

 INGREDIENTS
${safeMeal.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

 INSTRUCTIONS
${safeMeal.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---
Made with Edible`

        try {
            await navigator.clipboard.writeText(recipeSummary)
            showToast?.('success', 'Recipe summary copied!')
            setIsShareMenuOpen(false)
        } catch (err) {
            console.error('Copy error:', err)
            showToast?.('error', 'Failed to copy text.')
        }
    }



    const handleDownloadPDF = async () => {
        if (!pdfRef.current || !safeMeal) return
        
        setIsDownloading(true)
        showToast?.('info', 'Preparing your PDF...')
        
        try {
            // Convert recipe image to base64 to avoid CORS issues in html2canvas
            let imageDataUrl: string | null = null
            if (recipeImage) {
              try {
                const response = await fetch(recipeImage)
                const blob = await response.blob()
                imageDataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(reader.result as string)
                  reader.readAsDataURL(blob)
                })
              } catch {
                console.warn('[PDF] Could not convert image to base64, skipping')
              }
            }
            setPdfImageDataUrl(imageDataUrl)

            // Add helper class for capture
            const el = pdfRef.current
            el.classList.add('pdf-export-mode')
            
            // Short delay for layout to stabilize
            await new Promise(r => setTimeout(r, 500))
            
            const filename = `${safeMeal.title.replace(/\s+/g, '-').toLowerCase()}-recipe.pdf`
            const success = await downloadElementAsPDF(el, { filename })
            
            if (success) {
                showToast?.('success', 'Recipe PDF downloaded!')
                posthog.capture('pdf_downloaded', { recipe: safeMeal.title })
            } else {
                showToast?.('error', 'Failed to generate PDF. Please try again.')
            }
        } catch (err) {
            console.error('PDF Error:', err)
            showToast?.('error', 'An error occurred while generating PDF.')
        } finally {
            setIsDownloading(false)
            pdfRef.current?.classList.remove('pdf-export-mode')
        }
    }

    const toggleIngredient = (index: number) => {
        const newChecked = new Set(checkedIngredients)
        if (newChecked.has(index)) {
            newChecked.delete(index)
        } else {
            newChecked.add(index)
        }
        setCheckedIngredients(newChecked)
    }

    const toggleStep = (index: number) => {
        const newSteps = new Set(completedSteps)
        if (newSteps.has(index)) {
            newSteps.delete(index)
        } else {
            newSteps.add(index)
        }
        setCompletedSteps(newSteps)
    }

    const getMealTypeColor = () => {
        switch (mealType) {
            case 'Breakfast':
                return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'Lunch':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'Dinner':
                return 'bg-purple-100 text-purple-800 border-purple-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    if (!meal || !safeMeal) return <RecipeDetailSkeleton onBack={onBack} backLabel={backLabel} />

    const instructionSteps = safeMeal.instructions || []
    const difficulty = getDifficulty(instructionSteps.length, safeMeal.totalTime)


    const tabs: Tab[] = [
        {
            id: 'ingredients',
            label: `Ingredients (${safeMeal.ingredients.length})`,
            content: (
                <div className="grid gap-3">
                    {safeMeal.ingredients.length > 0 ? (
                        safeMeal.ingredients.map((ingredient, index) => (
                            <label
                                key={index}
                                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 group cursor-pointer min-h-[44px]
									${checkedIngredients.has(index) ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-50 hover:border-purple-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.02)]'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checkedIngredients.has(index)}
                                    onChange={() => toggleIngredient(index)}
                                />
                                <div className="flex-shrink-0">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {checkedIngredients.has(index) ? (
                                            <motion.div
                                                key="checked"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            >
                                                <CheckCircle2 className="w-6 h-6 text-purple-600" aria-hidden="true" />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="unchecked"
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                            >
                                                <Circle className="w-6 h-6 text-purple-200 group-hover:text-purple-400 transition-colors" aria-hidden="true" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <span
                                    className={`text-gray-800 font-medium transition-all duration-300 ${checkedIngredients.has(index) ? 'line-through text-gray-400 grayscale italic' : ''
                                        }`}
                                >
                                    {ingredient}
                                </span>
                            </label>
                        ))
                    ) : (
                        <p className="text-gray-500 italic text-center py-8">No ingredients listed</p>
                    )}
                </div>
            )
        },
        {
            id: 'instructions',
            label: 'Cooking Steps',
            content: (
                <div className="space-y-4 md:space-y-6">
                    {instructionSteps.length > 0 ? (
                        instructionSteps.map((step, index) => (
                            <label
                                key={index}
                                className={`flex items-start gap-5 p-6 md:p-8 rounded-[2rem] border transition-all duration-300 group cursor-pointer min-h-[44px]
									${completedSteps.has(index) ? 'bg-gray-50 border-gray-100 shadow-inner' : 'bg-white border-gray-50 hover:border-purple-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)]'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={completedSteps.has(index)}
                                    onChange={() => toggleStep(index)}
                                />
                                <div className="flex-shrink-0 mt-1">
                                    <div className="relative">
                                        <AnimatePresence mode="wait" initial={false}>
                                            {completedSteps.has(index) ? (
                                                <motion.div
                                                    key="checked"
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                >
                                                    <CheckCircle2 className="w-8 h-8 text-purple-600" aria-hidden="true" />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="unchecked"
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                >
                                                    <Circle className="w-8 h-8 text-purple-100 group-hover:text-purple-300 transition-colors" aria-hidden="true" />
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-400 group-hover:text-purple-600 transition-colors" aria-hidden="true">
                                                        {index + 1}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p
                                        className={`text-gray-900 leading-relaxed font-bold text-lg md:text-xl transition-all duration-300 ${completedSteps.has(index) ? 'line-through text-gray-400 grayscale italic' : ''
                                            }`}
                                    >
                                        {step}
                                    </p>
                                </div>
                            </label>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold italic text-lg">{safeMeal.instructions}</p>
                        </div>
                    )}
                </div>
            )
        }
    ]

    const tipsContent = useMemo(() => {
        if (!safeMeal.tips || safeMeal.tips.length === 0) return null
        
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(198,160,246,0.12)] p-8 md:p-12 mb-12 border border-purple-100/50 relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-50 rounded-full blur-[100px] -mr-40 -mt-40 transition-transform duration-700 group-hover:scale-110"></div>
                
                <h2 className="text-xl md:text-2xl font-bold mb-8 flex items-center gap-4 relative z-10 text-gray-900">
                    <div className="w-1.5 h-8 bg-[#C6A0F6] rounded-full shadow-[0_0_12px_rgba(198,160,246,0.5)]"></div>
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100/50 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ml-1">
                        <ChefHat className="w-6 h-6 text-purple-600" />
                    </div>
                    Chef Tips
                </h2>

                <div className={`grid gap-4 relative z-10 ${!canSeeChefTips ? 'blur-[2px]' : ''}`}>
                    {safeMeal.tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-5 items-start bg-purple-50/20 backdrop-blur-sm p-6 rounded-2xl border border-purple-100/30 hover:bg-white hover:border-purple-200 hover:shadow-[0_4px_20px_rgba(198,160,246,0.06)] transition-all duration-300">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5 border border-purple-100/20">
                                <Lightbulb className="w-4 h-4 text-purple-500" />
                            </div>
                            <p className="text-gray-700 text-lg font-medium leading-relaxed italic">
                                "{tip}"
                            </p>
                        </div>
                    ))}
                </div>
                
                {!canSeeChefTips && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-[2.5rem] flex flex-col items-center justify-center z-20 pointer-events-none">
                        <div className="bg-white/98 backdrop-blur-md rounded-2xl p-8 text-center shadow-2xl pointer-events-auto cursor-pointer hover:shadow-xl transition-shadow" onClick={() => { setPricingTrigger('chef_tips'); setPricingOpen(true) }}>
                            <Crown className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                            <h3 className="text-lg font-black text-gray-900 mb-2">Pro Feature</h3>
                            <p className="text-gray-600 text-sm mb-5 max-w-xs">Professional chef tips to elevate your cooking technique</p>
                            <button
                                onClick={() => { setPricingTrigger('chef_tips'); setPricingOpen(true) }}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-[0_4px_12px_rgba(147,51,234,0.3)]"
                            >
                                Unlock Pro
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        )
    }, [safeMeal.tips, canSeeChefTips, setPricingOpen, setPricingTrigger])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-lavender-50 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:pb-20 pt-[env(safe-area-inset-top)]"
        >
            <a
                href="#recipe-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-purple-600 focus:font-bold focus:shadow-xl focus:rounded-b-xl focus:left-1/2 focus:-translate-x-1/2"
            >
                Skip to recipe content
            </a>

            {/* Back Button */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
                <div className="w-full max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        aria-label="Back to meal plan"
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all duration-300 font-bold group min-h-[44px] px-2 -ml-2 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} aria-hidden="true" />
                        <span className="hidden sm:inline text-[15px]">{backLabel || "Back to Meal Plan"}</span>
                        <span className="sm:hidden text-[15px]">Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsCookingModeOpen(true)}
                            className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 bg-[#C6A0F6] text-gray-900 rounded-full font-bold hover:shadow-[0_4px_16px_rgba(198,160,246,0.3)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 group"
                        >
                            <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="text-[13px] sm:text-[14px]">Start Cooking</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3">
                        <Tooltip content="Download PDF">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isDownloading}
                                className={`flex items-center gap-2 h-10 px-3 sm:px-4 bg-white text-gray-600 rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isDownloading ? (
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline text-[13px]">{isDownloading ? 'Generating...' : 'PDF'}</span>
                            </button>
                        </Tooltip>

                        <Tooltip content={isSaved ? "Saved" : "Save Recipe"}>
                            <button
                                onClick={handleSaveRecipe}
                                aria-label={isSaved ? 'Remove from saved recipes' : 'Save this recipe'}
                                className="flex items-center gap-2 h-10 px-3 sm:px-4 bg-rose-50 text-rose-600 rounded-full font-bold border border-rose-100/50 hover:bg-rose-100 hover:-translate-y-0.5 transition-all"
                            >
                                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} aria-hidden="true" />
                                <span className="hidden sm:inline text-[13px]">{isSaved ? 'Saved' : 'Save'}</span>
                            </button>
                        </Tooltip>

                        <Tooltip content="Share Recipe" disabled={isShareMenuOpen}>
                            <div className="relative">
                                <button
                                    onClick={handleShare}
                                    aria-label="Share this recipe"
                                    className={`flex items-center gap-2 h-10 px-3 sm:px-4 rounded-full font-bold border transition-all duration-300 ${isShareMenuOpen ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-gray-50 text-gray-600 border-gray-100/50 hover:bg-gray-100'} hover:-translate-y-0.5`}
                                >
                                    <Share2 className={`w-4 h-4 transition-transform duration-300 ${isShareMenuOpen ? 'rotate-12 scale-110' : ''}`} aria-hidden="true" />
                                    <span className="hidden sm:inline text-[13px]">Share</span>
                                </button>
                                
                                <AnimatePresence>
                                    {isShareMenuOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setIsShareMenuOpen(false)}
                                                className="fixed inset-0 z-40 bg-black/[0.02] md:bg-transparent"
                                            />
                                            
                                            {/* Options Menu */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                                                className="absolute top-full mt-3 right-0 w-[260px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-2.5 z-50 flex flex-col gap-1.5"
                                            >
                                                <button
                                                    onClick={copyRecipeText}
                                                    className="flex items-center gap-3.5 p-3 hover:bg-purple-50 rounded-xl transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-gray-900 leading-none mb-1">Copy Summary</p>
                                                        <p className="text-[11px] text-gray-400 font-medium tracking-tight">Full layout with ingredients</p>
                                                    </div>
                                                </button>

                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <div id="recipe-content" className="w-full max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden mb-6 sm:mb-8 md:mb-12 border border-gray-50/50"
                >
                    {/* Food Image Hero */}
                    <div className="h-[200px] md:h-[300px] bg-purple-100 flex items-center justify-center relative group">
                        {recipeImage ? (
                                <>
                                <img
                                    src={recipeImage}
                                    alt={safeMeal.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                            </>
                        ) : (
                            <div className={`absolute inset-0 flex items-center justify-center ${
                                mealType === 'Breakfast' ? 'bg-gradient-to-br from-amber-50 via-amber-100/80 to-orange-50' :
                                mealType === 'Lunch' ? 'bg-gradient-to-br from-emerald-50 via-green-100/80 to-teal-50' :
                                'bg-gradient-to-br from-purple-50 via-violet-100/80 to-lavender-50'
                            }`}>
                                <div className="w-28 h-28 md:w-36 md:h-36 opacity-80">
                                    <MealImagePlaceholder mealType={mealType} />
                                </div>
                                {isImageLoading && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                        <span className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                                            mealType === 'Breakfast' ? 'text-amber-500/70 bg-amber-100/50' :
                                            mealType === 'Lunch' ? 'text-emerald-500/70 bg-emerald-100/50' :
                                            'text-purple-400/70 bg-purple-100/50'
                                        }`}>Finding the perfect photo…</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Meal Info */}
                    <div className="p-4 sm:p-6 md:p-12">
                        {/* Day and Meal Type Badge */}
                        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{dayName}</span>
                            <span className="px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100 shadow-sm">
                                {mealType}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-6 sm:mb-8 md:mb-10 leading-[1.1] tracking-tight">
                            {safeMeal.title}
                        </h1>

                        {/* Time Information */}
                        <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] flex items-center justify-center border border-orange-100/50">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Prep</p>
                                    <p className="text-[17px] font-bold text-gray-900 leading-none">{safeMeal.prepTime}m</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] flex items-center justify-center border border-emerald-100/50">
                                    <ChefHat className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Cook</p>
                                    <p className="text-[17px] font-bold text-gray-900 leading-none">{safeMeal.cookTime}m</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] flex items-center justify-center border border-purple-100/50">
                                    <Timer className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Total</p>
                                    <p className="text-[17px] font-bold text-gray-900 leading-none">{safeMeal.totalTime}m</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Nutrition Section */}
                {safeMeal.nutrition && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-5 sm:p-8 md:p-12 mb-6 sm:mb-8 md:mb-12 border border-gray-50/50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-50 rounded-full blur-[80px] -mr-24 -mt-24"></div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-[#C6A0F6] rounded-full shadow-[0_0_12px_rgba(198,160,246,0.5)]"></div>
                            Nutrition Guide
                        </h2>
                        <NutritionBadges nutrition={safeMeal.nutrition} />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.4 }}
                    className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-5 sm:p-8 md:p-12 mb-6 sm:mb-8 md:mb-12 border border-gray-50/50"
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 flex items-center gap-4">
                        <div className="w-1.5 h-8 rounded-full shadow-sm" style={{ background: difficulty.bar }}></div>
                        Difficulty
                    </h2>
                    <div className="flex items-center gap-4">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
                            style={{ background: difficulty.bg, borderColor: difficulty.border }}
                        >
                            <ChefHat className="w-5 h-5" style={{ color: difficulty.color }} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline mb-2.5">
                                <span className="text-base font-bold" style={{ color: difficulty.color }}>{difficulty.label}</span>
                                <span className="text-xs text-gray-400">{safeMeal.totalTime} min · {instructionSteps.length} steps</span>
                            </div>
                            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                {['Easy', 'Medium', 'Hard'].map((lvl, i) => {
                                    const filled = ['Easy', 'Medium', 'Hard'].indexOf(difficulty.label) >= i
                                    return (
                                        <div
                                            key={lvl}
                                            className="h-1.5 rounded-full"
                                            style={{ background: filled ? difficulty.bar : 'rgba(0,0,0,0.08)' }}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Tips Section */}
                {tipsContent}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                >
                    <Tabs tabs={tabs} />
                </motion.div>
            </div>

            {/* Cooking Mode Modal */}
            <AnimatePresence>
                {isCookingModeOpen && (
                    <CookingMode
                        steps={instructionSteps}
                        mealTitle={safeMeal.title}
                        onClose={() => setIsCookingModeOpen(false)}
                        storageKey={storageKey}
                    />
                )}
            </AnimatePresence>

            {/* Pricing Modal */}
            <PricingModal 
                isOpen={pricingOpen}
                onClose={() => setPricingOpen(false)}
                trigger={pricingTrigger}
            />

            {/* Hidden PDF Template */}
            <div ref={pdfRef} className="pdf-only pdf-export-container p-12 bg-white text-gray-900 w-[800px]">
                <div className="pdf-avoid-break mb-12">
                    <div className="flex items-end justify-between border-b-2 border-purple-100 pb-6 mb-8 w-full">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none flex whitespace-nowrap items-baseline">Edible</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Personalized AI Chef</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{dayName}</p>
                            <p className="text-sm font-black text-purple-600 uppercase tracking-tight">{mealType}</p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
                        {safeMeal.title}
                    </h1>

                    {(pdfImageDataUrl || recipeImage) && (
                        <div className="mb-8 rounded-[2rem] overflow-hidden h-[350px] border border-gray-100 shadow-sm">
                            <img src={pdfImageDataUrl || recipeImage!} alt={safeMeal.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="mb-10 pdf-avoid-break">
                    <div className="flex gap-8 mb-10 pb-8 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prep</p>
                                <p className="text-sm font-bold">{safeMeal.prepTime} min</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cook</p>
                                <p className="text-sm font-bold">{safeMeal.cookTime} min</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Timer className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                                <p className="text-sm font-bold">{safeMeal.totalTime} min</p>
                            </div>
                        </div>
                    </div>

                    {safeMeal.nutrition && (
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mb-10 w-full box-border">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Nutrition Guide (per serving)</p>
                            <div className="grid grid-cols-4 gap-8 w-full">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900 leading-none mb-1">{safeMeal.nutrition.calories}</p>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Calories</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900 leading-none mb-1">{safeMeal.nutrition.protein}g</p>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Protein</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900 leading-none mb-1">{safeMeal.nutrition.carbs}g</p>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Carbs</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900 leading-none mb-1">{safeMeal.nutrition.fat}g</p>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Fat</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-12">
                    <div className="pdf-avoid-break">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                            Ingredients
                        </h2>
                        <ul className="space-y-3">
                            {safeMeal.ingredients.map((ing, i) => (
                                <li key={i} className="flex gap-4 items-center py-2 border-b border-gray-50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
                                    <span className="text-gray-700 font-medium">{ing}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="pdf-page-break pt-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                            Instructions
                        </h2>
                        <div className="space-y-6">
                            {instructionSteps.map((step, i) => (
                                <div key={i} className="flex gap-5 pdf-avoid-break">
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

                    {canSeeChefTips && safeMeal.tips && safeMeal.tips.length > 0 && (
                        <div className="pdf-page-break pt-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                                Chef Tips
                            </h2>
                            <div className="space-y-4">
                                {safeMeal.tips.map((tip, i) => (
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
                        Made with love by Edible — Your Personal AI Chef
                    </p>
                </div>
            </div>
        </motion.div>
    )
}
