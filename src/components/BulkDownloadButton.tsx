import { useState, useRef } from 'react'
import { Download, FileArchive } from 'lucide-react'
import { motion } from 'framer-motion'
import JSZip from 'jszip'
import type { MealPlanResult, Meal } from '../utils/types'
import { getElementAsPDFBlob } from '../utils/pdfHelper'
import { createPortal } from 'react-dom'
import { fetchMealImage } from '../lib/mealImages'
import { usePlan } from '../hooks/usePlan'
import RecipePDFTemplate from './RecipePDFTemplate'

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
    const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null)
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
                setCurrentImageDataUrl(null)

                let imageDataUrl: string | null = null
                try {
                    const imageUrl = await fetchMealImage(item.meal.title)
                    if (imageUrl) {
                        const response = await fetch(imageUrl)
                        if (response.ok) {
                            const blob = await response.blob()
                            imageDataUrl = await new Promise<string>((resolve) => {
                                const reader = new FileReader()
                                reader.onloadend = () => resolve(reader.result as string)
                                reader.readAsDataURL(blob)
                            })
                        }
                    }
                } catch (err) {
                    console.warn(`[BulkExport] Could not fetch image for "${item.meal.title}":`, err)
                }
                setCurrentImageDataUrl(imageDataUrl)

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
            setCurrentImageDataUrl(null)
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
                <RecipePDFTemplate
                    ref={pdfRef}
                    meal={currentMeal.meal}
                    dayName={currentMeal.dayName}
                    mealType={currentMeal.mealType}
                    imageSrc={currentImageDataUrl}
                    canSeeChefTips={canSeeChefTips}
                />,
                document.body
            )}
        </>
    )
}
