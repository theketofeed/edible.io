import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import BlogBreadcrumb from '../components/BlogBreadcrumb'
import ShareButtons from '../components/ShareButtons'
import JsonLd from '../components/JsonLd'

const TITLE = 'The Healthy Grocery List: What to Buy & Build Your Own'
const DESCRIPTION = 'A complete healthy grocery list organized by food category, with a free printable checklist, budget tips, and keto and low-carb swaps.'
const ARTICLE_TITLE = 'The Healthy Grocery List: What to Buy and How to Build Your Own'
const FAQ_ITEMS = [
	{
		question: 'What should be on a healthy grocery list?',
		answer: "A mix of vegetables, fruits, protein sources, whole grains, healthy fats, and dairy or alternatives, plus a few pantry staples to tie meals together. Variety within each category matters more than any single 'superfood.'",
	},
	{
		question: 'What foods should I avoid at the grocery store?',
		answer: "You don't need to eliminate anything completely, but it's worth watching out for foods with added sugar listed in the first few ingredients, refined vegetable oils, and heavily processed snacks that are more filler than nutrition. Reading the ingredient list, not just the front-of-package claims, is the simplest way to catch these.",
	},
	{
		question: 'How can I eat healthy on a budget?',
		answer: 'Buying produce in season, choosing frozen over fresh when it\'s cheaper, checking unit prices instead of sticker prices, and stocking up on proteins like beans and lentils all help keep a healthy list affordable. See the budget tips above for the full breakdown.',
	},
]

const STRUCTURED_DATA = [
	{
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: ARTICLE_TITLE,
		image: 'https://www.tryediblee.com/blog/healthy-grocery-list-hero.png',
		author: { '@type': 'Person', name: 'Praise' },
		publisher: {
			'@type': 'Organization',
			name: 'Edible',
			logo: { '@type': 'ImageObject', url: 'https://www.tryediblee.com/logo.png' },
		},
		datePublished: '2026-08-23T09:00:00-05:00',
		mainEntityOfPage: 'https://www.tryediblee.com/blog/healthy-grocery-list',
	},
	{
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: FAQ_ITEMS.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answer },
		})),
	},
]

export default function HealthyGroceryList() {
	useEffect(() => {
		document.title = TITLE
		const meta = document.querySelector('meta[name="description"]')
		if (meta) meta.setAttribute('content', DESCRIPTION)
		const ogTitle = document.querySelector('meta[property="og:title"]')
		if (ogTitle) ogTitle.setAttribute('content', TITLE)
		const ogDesc = document.querySelector('meta[property="og:description"]')
		if (ogDesc) ogDesc.setAttribute('content', DESCRIPTION)
		const twTitle = document.querySelector('meta[name="twitter:title"]')
		if (twTitle) twTitle.setAttribute('content', TITLE)
		const twDesc = document.querySelector('meta[name="twitter:description"]')
		if (twDesc) twDesc.setAttribute('content', DESCRIPTION)
		const ogImg = document.querySelector('meta[property="og:image"]')
		if (ogImg) ogImg.setAttribute('content', 'https://tryediblee.com/blog/healthy-grocery-list-hero.png')
		const twImg = document.querySelector('meta[name="twitter:image"]')
		if (twImg) twImg.setAttribute('content', 'https://tryediblee.com/blog/healthy-grocery-list-hero.png')
	}, [])

	return (
		<article className="w-full max-w-[760px] mx-auto px-5 sm:px-6 py-10 md:py-16">
			<JsonLd data={STRUCTURED_DATA} />
			<BlogBreadcrumb title="The Healthy Grocery List" />

			<picture>
				<source srcSet="/blog/healthy-grocery-list-hero.webp" type="image/webp" />
				<img
					src="/blog/healthy-grocery-list-hero.png"
					alt="Healthy grocery list staples including fresh produce, proteins, grains, and pantry items"
					width={1600}
					height={900}
					loading="eager"
					className="w-full rounded-2xl shadow-sm mb-6"
				/>
			</picture>

			<span className="inline-block text-xs font-semibold uppercase tracking-wide text-purple-600 bg-purple-100 rounded-full px-3 py-1 mb-3">
				Free Printable
			</span>

			<h1 className="text-[1.65rem] sm:text-4xl md:text-5xl font-bold text-purple-600 leading-tight mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
				The Healthy Grocery List: What to Buy and How to Build Your Own
			</h1>

			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-6">
				<p className="text-sm text-gray-400 break-words">
					By Praise · August 23, 2026 · 5 min read
				</p>
				<ShareButtons title="The Healthy Grocery List: What to Buy and How to Build Your Own" />
			</div>

			<p className="text-gray-700 leading-relaxed mb-6">
				Most 'healthy grocery list' articles just hand you a wall of ingredients and call it a day. That's useful if you already know why those foods matter, less useful if you don't. This one covers both: what to actually put in your cart, why each category earns a spot, and a free printable checklist you can take to the store with you.
			</p>

			<div className="bg-gray-50 rounded-2xl border border-gray-200 px-6 sm:px-8 py-8 mb-10">
				<h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
					Get the printable checklist
				</h3>
				<p className="text-gray-500 text-sm mb-6 leading-relaxed">
					Print it, stick it on the fridge, or keep it on your phone. Either way, you'll always know what to grab.
				</p>
				<a
					href="/blog/healthy-grocery-list.pdf"
					download
					className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all duration-200"
				>
					Download the PDF
				</a>
			</div>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<p className="text-gray-700 leading-relaxed mb-8">
				Here's what to stock up on, organized by category.
			</p>

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Vegetables</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				Aim for a mix of leafy greens and colorful produce, they're where most of your fiber and micronutrients come from.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Reliable staples to keep on hand: spinach, broccoli, bell peppers, carrots, onions, garlic, tomatoes, cucumber, zucchini, sweet potatoes, kale, and green beans. Buy what's in season when you can, it's usually cheaper and fresher.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Fruits</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				Fruit covers your sweeter cravings while still bringing fiber and vitamins to the table.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Apples, bananas, berries, oranges, avocados, lemons or limes, grapes, pears, pineapple, and watermelon are all good staples to rotate through depending on the season.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Proteins</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				This is the category worth being most intentional about, protein keeps you fuller for longer and matters for basically every goal, whether that's muscle, weight management, or just steady energy through the day.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Good options: chicken breast, eggs, salmon or white fish, ground turkey, tofu or tempeh, Greek yogurt, canned beans, lentils, canned tuna, and chickpeas.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Whole Grains &amp; Carbs</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				Carbs aren't the enemy, the type matters more than avoiding them entirely. Whole grains keep more fiber and nutrients intact than refined versions.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Stock up on brown rice, oats, quinoa, whole wheat bread, whole wheat pasta, potatoes, sourdough bread, and barley.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Healthy Fats</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				Fat is essential, not something to minimize across the board.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Olive oil, nuts like almonds and walnuts, nut butter, chia or flax seeds, avocado oil, coconut oil, and sesame oil are all solid, versatile picks for cooking and snacking.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Dairy &amp; Alternatives</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				Whether or not you eat dairy, this category is mostly about protein and calcium.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Milk or a plant-based alternative, plain yogurt, cheese, cottage cheese, kefir, parmesan, and almond milk cover most needs.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Pantry &amp; Condiments</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				The stuff that makes everything else actually taste good.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Canned tomatoes, low-sodium broth, vinegar, herbs and spices, whole grain mustard, low-sugar salsa, honey, and apple cider vinegar are worth always having stocked.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Beverages</h2>

			<p className="text-gray-700 leading-relaxed mb-4">
				What you drink matters as much as what you eat.
			</p>

			<p className="text-gray-700 leading-relaxed mb-6">
				Water (still or sparkling), unsweetened tea, black coffee, unsweetened plant milk, green tea, herbal tea, and sparkling water keep added sugar out of the equation without making things boring.
			</p>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Healthy Eating on a Budget</h2>

			<ul className="list-disc pl-5 space-y-3 text-gray-700 leading-relaxed mb-10">
				<li>Produce prices swing with the seasons, buying what's in season instead of what's out of season usually means paying less for something that tastes better too.</li>
				<li>Frozen fruits and vegetables get flash-frozen at peak ripeness, so you're not actually losing nutrition by choosing them, and they last far longer than fresh produce sitting in the fridge.</li>
				<li>The sticker price doesn't tell the whole story. Checking the unit price (cost per ounce or pound) often reveals that the larger size is the better deal, even when the upfront number looks higher.</li>
				<li>Meat and fish prices fluctuate a lot week to week. When chicken, turkey, or fish go on sale, buying extra and freezing individual portions means you're not paying full price every time you cook.</li>
				<li>Canned and dried beans are some of the cheapest protein around, and because they store for months, there's no pressure to use them before they go bad.</li>
			</ul>

			<hr className="border-t border-gray-200 my-8 md:my-10" />

			<div className="border-l-4 border-purple-400 bg-purple-50 rounded-r-lg px-4 sm:px-6 py-6 mb-10">
				<h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Keto &amp; Low-Carb Swaps</h2>

				<p className="text-gray-700 leading-relaxed mb-4">
					If you're following a lower-carb approach, most of the list above still applies, you'll just want to swap a few categories:
				</p>

				<ul className="list-disc pl-5 space-y-3 text-gray-700 leading-relaxed mb-4">
					<li>Instead of whole grains: cauliflower rice, shirataki noodles, or a smaller portion of a lower-carb grain like quinoa</li>
					<li>Instead of regular bread: a low-carb or almond flour bread, or skip it and lean on lettuce wraps</li>
					<li>Fruit: stick to lower-sugar options like berries, and treat higher-sugar fruits like bananas and pineapple as occasional rather than staples</li>
					<li>Lean further into the healthy fats category than you would otherwise, olive oil, avocado, nuts, and fatty fish become more central rather than supporting players</li>
					<li>Dairy stays mostly the same, just watch flavored yogurts for added sugar, plain is the safer default</li>
				</ul>

				<p className="text-gray-700 leading-relaxed">
					The rest of the list, vegetables, proteins, pantry staples, works as-is for keto and low-carb eating without much adjustment.
				</p>
			</div>

			<div className="bg-purple-50 rounded-2xl border border-purple-100 px-6 sm:px-8 py-8 mb-12">
				<h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
					Already got your list together?
				</h3>
				<p className="text-gray-500 text-sm mb-6 leading-relaxed">
					Paste it into Edible and get a full weekly meal plan built around exactly what you bought, no extra shopping required.
				</p>
				<Link
					to="/"
					className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all duration-200"
				>
					Try Edible Free
				</Link>
			</div>

			<h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>Frequently Asked Questions</h2>

			<div className="space-y-5 mb-12">
				<div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100">
					<h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{FAQ_ITEMS[0].question}</h3>
					<p className="text-gray-800 leading-relaxed text-sm">
						{FAQ_ITEMS[0].answer}
					</p>
				</div>
				<div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100">
					<h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{FAQ_ITEMS[1].question}</h3>
					<p className="text-gray-800 leading-relaxed text-sm">
						{FAQ_ITEMS[1].answer}
					</p>
				</div>
				<div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-100">
					<h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{FAQ_ITEMS[2].question}</h3>
					<p className="text-gray-800 leading-relaxed text-sm">
						{FAQ_ITEMS[2].answer}
					</p>
				</div>
			</div>

			<div className="bg-purple-50 rounded-2xl border border-purple-100 px-6 sm:px-10 py-10 md:py-12 text-center mb-4">
				<h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
					Ready to build a plan from what's already in your kitchen?
				</h3>
				<p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
					Edible turns your grocery list, receipt, or a photo into a full weekly meal plan, no browsing required.
				</p>
				<Link
					to="/"
					className="inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-full transition-all duration-200 active:scale-95 shadow-lg shadow-purple-200"
				>
					Try Edible Free
				</Link>
			</div>
		</article>
	)
}
