import { Camera, Download, FileArchive, FileText, FileUp, Receipt, Upload } from 'lucide-react'
import Loading from './Loading'
import DietSelector from './DietSelector'
import type { DietType } from '../utils/types'

export interface StoryStep {
	number: string
	label: string
	title: string
	description: string
}

export const STORY_STEPS: StoryStep[] = [
	{
		number: '01',
		label: 'UPLOAD',
		title: 'Upload your groceries',
		description: 'Snap a receipt or paste your grocery list. Edible figures out what you have.',
	},
	{
		number: '02',
		label: 'CHOOSE',
		title: 'Choose your plan',
		description: 'Pick a diet (keto, paleo, or your own) and how many days you want planned.',
	},
	{
		number: '03',
		label: 'GENERATE',
		title: 'AI builds your plan',
		description: 'Edible turns your groceries into a personalized meal plan in seconds, with zero food waste.',
	},
	{
		number: '04',
		label: 'COOK',
		title: 'Cook your week',
		description: 'See your full week at a glance, ready to cook. Every recipe, every ingredient, organized.',
	},
]

export const STATIC_PREVIEW_DAYS = [
	{
		day: 'Day 1',
		Breakfast: { title: 'Berry Almond Overnight Oats', imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=160&h=160&fit=crop' },
		Lunch: { title: 'Chicken and Quinoa Power Bowl', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=160&h=160&fit=crop' },
		Dinner: { title: 'Garlic Tomato Pasta', imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=160&h=160&fit=crop' },
	},
	{
		day: 'Day 2',
		Breakfast: { title: 'Bacon and Egg Breakfast Tacos with Avocado and Salsa', imageUrl: 'https://images.pexels.com/photos/37305407/pexels-photo-37305407.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Lunch: { title: 'Cheesy Chicken and Spinach Quesadilla', imageUrl: 'https://images.pexels.com/photos/14930606/pexels-photo-14930606.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Dinner: { title: 'Ground Turkey Meatballs with Spinach and Tomato Sauce', imageUrl: 'https://images.pexels.com/photos/36958915/pexels-photo-36958915.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
	},
	{
		day: 'Day 3',
		Breakfast: { title: 'Italian Chicken Sausage Penne', imageUrl: 'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Lunch: { title: 'Pan-Seared Chicken with Onion and Green Bean Medley', imageUrl: 'https://images.pexels.com/photos/36230654/pexels-photo-36230654.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Dinner: { title: 'Scrambled Eggs with Spinach and Cottage Cheese', imageUrl: 'https://images.pexels.com/photos/5639282/pexels-photo-5639282.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
	},
]

export type StoryPreviewDays = typeof STATIC_PREVIEW_DAYS

function DietSelectorPreview() {
	const previewDiet: DietType = 'Balanced'
	return (
		<div className="h-full w-full overflow-hidden bg-white px-7 pt-10 pb-6">
			<div className="origin-top-left" style={{ width: '133.33%', transform: 'scale(0.75)' }}>
				<DietSelector value={previewDiet} onChange={() => undefined} disabled dimDisabled={false} compact />
				<div className="border-t border-gray-200 pt-4">
					<h2 className="text-lg font-bold text-gray-900 mb-1.5">Select your plan duration</h2>
					<p className="text-sm text-gray-500 font-medium mb-3">Choose how long you want your meal plan to last</p>
					<select disabled value="3" aria-label="Plan duration" className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-900 bg-white disabled:bg-white disabled:text-gray-900 disabled:opacity-100">
						<option value="3">3 days</option>
					</select>
					<p className="text-xs text-gray-400 font-medium mt-2">Add more items to your list to unlock longer plans</p>
					<button type="button" disabled className="mt-4 px-6 py-3 rounded-lg text-base font-semibold bg-purple-600 text-white cursor-not-allowed">Generate Plan</button>
				</div>
			</div>
		</div>
	)
}

function MealPlanPreview({ days }: { days: StoryPreviewDays }) {
	const previewDays = days.slice(0, 3)
	return (
		<div className="h-full w-full overflow-hidden bg-white px-4 pt-14 pb-8">
			<div className="origin-top-left" style={{ width: '128.2%', transform: 'scale(0.78)' }}>
				<div className="mb-4 text-center">
					<p className="text-xl font-black uppercase tracking-[0.12em] text-purple-500">3-day plan</p>
					<h2 className="text-base font-black text-gray-900 mt-1">Your meal plan</h2>
				</div>
				<div className="flex gap-2 mb-4">
					<button type="button" disabled className="h-8 flex-1 rounded-xl bg-white/70 border border-gray-200 text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-sm">
						<Download className="w-3.5 h-3.5 text-purple-500" />
						Download Plan
					</button>
					<button type="button" disabled className="h-8 flex-1 rounded-xl bg-white/70 border border-gray-200 text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-sm">
						<FileArchive className="w-3.5 h-3.5 text-amber-500" />
						Download All Recipes PDF
					</button>
				</div>
				<div className="space-y-3">
					{previewDays.map((day, dayIndex) => (
						<div key={day.day}>
							<p className="mb-2 text-[13px] font-black uppercase tracking-wider text-gray-900">{day.day}</p>
							<div className="space-y-2">
								{(['Breakfast', 'Lunch', 'Dinner'] as const).filter((type) => dayIndex < 2 || type === 'Breakfast').map((type) => {
									const meal = day[type]
									return <div key={type} className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-2 shadow-[0_1px_5px_rgba(0,0,0,0.05)]">
										<img src={meal.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
										<div className="min-w-0">
											<p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">{type}</p>
											<p className="line-clamp-1 text-sm font-bold leading-tight text-gray-900">{meal.title}</p>
										</div>
									</div>
								})}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function UploadPreview() {
	return (
		<div className="h-full w-full overflow-hidden bg-purple-50 px-3 pt-12 pb-6">
			<div className="origin-top-left" style={{ width: '128.2%', transform: 'scale(0.78)' }}>
				<div className="rounded-3xl bg-white p-5 shadow-[0_8px_24px_rgba(124,58,237,0.08)]">
					<div className="flex items-center gap-2.5 mb-5">
						<FileText className="w-5 h-5 shrink-0 text-purple-400" strokeWidth={2} />
						<h2 className="text-base font-bold text-gray-900">Paste your grocery list:</h2>
					</div>
					<div className="h-28 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-sm leading-relaxed text-gray-400">
						e.g., chicken breast, quinoa, spinach, eggs, yogurt, berries...
					</div>
					<button type="button" disabled className="mt-4 h-10 w-full rounded-full bg-purple-300 text-sm font-bold text-gray-700 shadow-[0_6px_16px_rgba(168,85,247,0.2)]">
						Use this text
					</button>

					<div className="my-7 border-t border-gray-200" />

					<div className="flex items-center gap-2.5 mb-4">
						<Receipt className="w-5 h-5 shrink-0 text-purple-400" strokeWidth={2} />
						<h2 className="text-base font-bold text-gray-900">Or upload a receipt photo:</h2>
					</div>
					<div className="rounded-2xl border-2 border-dashed border-gray-300 px-4 py-6 text-center">
						<div className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
							<FileText className="h-7 w-7 text-purple-400" strokeWidth={1.8} />
							<Upload className="absolute h-4 w-4 translate-x-4 translate-y-4 rounded-full bg-purple-400 p-0.5 text-white" strokeWidth={2.5} />
						</div>
						<h3 className="text-sm font-bold leading-tight text-gray-900">Upload your grocery receipt or shopping list</h3>
						<p className="mt-1.5 text-[11px] font-medium leading-relaxed text-gray-500">JPG, PNG, PDF supported</p>
						<div className="mt-4 grid gap-3">
							<button type="button" disabled className="flex h-9 items-center justify-center gap-2 rounded-full bg-purple-300 text-xs font-bold text-gray-900">
								<FileUp className="h-4 w-4" /> Choose File
							</button>
							<button type="button" disabled className="flex h-9 items-center justify-center gap-2 rounded-full border-2 border-purple-200 text-xs font-bold text-gray-900">
								<Camera className="h-4 w-4" /> Take Photo
							</button>
						</div>
						<p className="mt-4 text-[11px] font-medium text-gray-500">Tip: Upload a clear photo</p>
					</div>
				</div>
			</div>
		</div>
	)
}

/** The phone screen shown for each how-it-works step (used on the live site
 *  AND in the Product Hunt gallery export so both always stay in sync). */
export function StepScreen({ step, previewDays }: { step: number; previewDays: StoryPreviewDays }) {
	if (step === 1) return <UploadPreview />
	if (step === 2) return <DietSelectorPreview />
	if (step === 3)
		return (
			<div className="h-full w-full flex items-center justify-center bg-purple-50 px-4 py-12">
				<div className="w-full h-[64%] rounded-3xl bg-white border border-purple-100 shadow-[0_12px_32px_rgba(124,58,237,0.12)] overflow-hidden">
					<Loading step={1} compact />
				</div>
			</div>
		)
	if (step === 4) return <MealPlanPreview days={previewDays} />
	return null
}