import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChefHat, Timer, ArrowLeft, CheckCircle2, Circle, Share2, Zap, Download, Heart, Lightbulb } from 'lucide-react'
import type { Meal } from '../utils/types'
import Tabs, { Tab } from './Tabs'
import NutritionBadges from './NutritionBadges'
import type { ToastKind } from './Toast'
import { fetchMealImage } from '../lib/unsplashApi'
import CookingMode from './CookingMode'
import { useAuth } from '../context/AuthContext'

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
            <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-purple-600 font-bold min-h-[44px]">
                    <ArrowLeft className="w-5 h-5" />
                    {backLabel || "Back to Meal Plan"}
                </button>
            </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden mb-8 md:mb-12 border border-purple-100/50">
                <div className="h-[200px] md:h-[300px] bg-gray-200" />
                <div className="p-6 md:p-12">
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

export default function RecipeDetail({ meal, mealType, dayName, onBack, backLabel, showToast }: RecipeDetailProps) {
    if (!meal) return <RecipeDetailSkeleton onBack={onBack} backLabel={backLabel} />

    // Defensive checks for required properties
    const safeMeal = useMemo(() => ({
        ...meal,
        title: meal.title || 'Untitled Recipe',
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
        instructions: Array.isArray(meal.instructions) ? meal.instructions : [meal.instructions || 'No instructions provided.'],
        nutrition: meal.nutrition,
        prepTime: meal.prepTime || 0,
        cookTime: meal.cookTime || 0,
        totalTime: meal.totalTime || (meal.prepTime || 0) + (meal.cookTime || 0)
    }), [meal])

    // Storage key unique to this specific recipe in this meal plan
    const storageKey = useMemo(() => {
        return `edible-recipe-${dayName}-${mealType}-${safeMeal.title.replace(/\s+/g, '-').toLowerCase()}`
    }, [dayName, mealType, safeMeal.title])

    // Storage key for saved recipes
    const savedRecipeKey = useMemo(() => {
        return `edible-saved-recipes`
    }, [])

    // Check if recipe is saved on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(savedRecipeKey)
            if (saved) {
                const savedRecipes = new Set(JSON.parse(saved))
                const recipeId = `${dayName}-${mealType}-${safeMeal.title}`
                setIsSaved(savedRecipes.has(recipeId))
            }
        } catch (e) {
            console.error('Failed to load saved recipes:', e)
        }
    }, [savedRecipeKey, dayName, mealType, safeMeal.title])

    // Handle heart/save button click
    const handleSaveRecipe = () => {
        if (!user) {
            showToast?.('info', 'Sign in to save recipes')
            return
        }

        try {
            const saved = localStorage.getItem(savedRecipeKey)
            const savedRecipes = new Set(saved ? JSON.parse(saved) : [])
            const recipeId = `${dayName}-${mealType}-${safeMeal.title}`

            if (savedRecipes.has(recipeId)) {
                savedRecipes.delete(recipeId)
                setIsSaved(false)
                showToast?.('success', 'Recipe removed from saved')
            } else {
                savedRecipes.add(recipeId)
                setIsSaved(true)
                showToast?.('success', 'Recipe saved!')
            }

            localStorage.setItem(savedRecipeKey, JSON.stringify(Array.from(savedRecipes)))
        } catch (e) {
            console.error('Failed to save recipe:', e)
            showToast?.('error', 'Failed to save recipe')
        }
    }

    // Parse instructions into distinct steps
    const instructionSteps = useMemo(() => {
        return safeMeal.instructions
    }, [safeMeal.instructions])

    const handleShare = async () => {
        const ingredients = safeMeal.ingredients.map(i => `- ${i}`).join('\n')
        const steps = safeMeal.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')
        const nutra = safeMeal.nutrition as any
        const nutrition = nutra
            ? `\n📊 Nutrition (per serving):\n🔥 ${nutra.calories || 'N/A'} kcal | 🥩 ${nutra.protein || 'N/A'}g | 🍞 ${nutra.carbs || 'N/A'}g | 🥑 ${nutra.fat || 'N/A'}g`
            : ''

        const text = `🍽️ ${safeMeal.title}\n🍳 ${mealType} • ⏱️ ${safeMeal.totalTime} mins\n\n📋 Ingredients:\n${ingredients}\n\n👨‍🍳 Instructions:\n${steps}\n${nutrition}\n\nShared via Edible.io ✨`

        try {
            await navigator.clipboard.writeText(text)
            showToast?.('success', 'Recipe copied to clipboard!')
        } catch (err) {
            console.error('Failed to copy recipe:', err)
            showToast?.('error', 'Failed to copy recipe.')
        }
    }

    const { user } = useAuth()
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
    const [recipeImage, setRecipeImage] = useState<string | null>(null)
    const [isImageLoading, setIsImageLoading] = useState(true)
    const [isCookingModeOpen, setIsCookingModeOpen] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Fetch Unsplash Image
    useEffect(() => {
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
    }, [safeMeal.title])

    // Load initial state from localStorage
    useEffect(() => {
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

                <div className="grid gap-4 relative z-10">
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
            </motion.div>
        )
    }, [safeMeal.tips])

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
                <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
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
                            className="flex items-center gap-2 h-10 px-4 bg-[#C6A0F6] text-gray-900 rounded-full font-bold hover:shadow-[0_4px_16px_rgba(198,160,246,0.3)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 group"
                        >
                            <ChefHat className="w-4 h-4" />
                            <span className="text-[14px]">Start Cooking</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.print()}
                            className="hidden sm:flex items-center gap-2 h-10 px-4 bg-white text-gray-600 rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-[13px]">PDF</span>
                        </button>

                        <button
                            onClick={handleSaveRecipe}
                            aria-label={isSaved ? 'Remove from saved recipes' : 'Save this recipe'}
                            className="flex items-center gap-2 h-10 px-4 bg-rose-50 text-rose-600 rounded-full font-bold border border-rose-100/50 hover:bg-rose-100 hover:-translate-y-0.5 transition-all"
                        >
                            <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} aria-hidden="true" />
                            <span className="text-[13px]">{isSaved ? 'Saved' : 'Save'}</span>
                        </button>

                        <button
                            onClick={handleShare}
                            aria-label="Share this recipe"
                            className="flex items-center gap-2 h-10 px-4 bg-gray-50 text-gray-600 rounded-full font-bold border border-gray-100/50 hover:bg-gray-100 hover:-translate-y-0.5 transition-all"
                        >
                            <Share2 className="w-4 h-4" aria-hidden="true" />
                            <span className="text-[13px]">Share</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="recipe-content" className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden mb-8 md:mb-12 border border-gray-50/50"
                >
                    {/* Food Image Hero */}
                    <div className="h-[200px] md:h-[300px] bg-purple-100 flex items-center justify-center relative group">
                        {isImageLoading ? (
                            <div className="absolute inset-0 bg-purple-50 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                                <ChefHat className="w-24 h-24 md:w-32 md:h-32 text-purple-100" />
                            </div>
                        ) : recipeImage ? (
                            <>
                                <img
                                    src={recipeImage}
                                    alt={safeMeal.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                {/* Photo Attribution */}
                                <div className="absolute bottom-4 right-4 z-10">
                                    <a
                                        href="https://unsplash.com/?utm_source=Edible&utm_medium=referral"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] md:text-xs text-white/80 hover:text-white bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full transition-all border border-white/10"
                                    >
                                        Photo from <span className="font-bold underline">Unsplash</span>
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-purple-400 to-lavender-400 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="relative">
                                    <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full animate-pulse"></div>
                                    <ChefHat className="w-24 h-24 md:w-48 md:h-48 text-white/40 relative z-10" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meal Info */}
                    <div className="p-6 md:p-12">
                        {/* Day and Meal Type Badge */}
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{dayName}</span>
                            <span className="px-5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100 shadow-sm">
                                {mealType}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 md:mb-10 leading-[1.1] tracking-tight">
                            {safeMeal.title}
                        </h1>

                        {/* Time Information */}
                        <div className="flex flex-wrap gap-6 md:gap-10">
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
                        className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8 md:p-12 mb-8 md:mb-12 border border-gray-50/50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-50 rounded-full blur-[80px] -mr-24 -mt-24"></div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 flex items-center gap-4">
                            <div className="w-1.5 h-8 bg-[#C6A0F6] rounded-full shadow-[0_0_12px_rgba(198,160,246,0.5)]"></div>
                            Nutrition Guide
                        </h2>
                        <NutritionBadges nutrition={safeMeal.nutrition} />
                    </motion.div>
                )}

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
        </motion.div>
    )
}
