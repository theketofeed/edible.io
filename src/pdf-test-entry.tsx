import { useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RecipePDFTemplate from './components/RecipePDFTemplate'
import { downloadElementAsPDF, getElementAsPDFBlob } from './utils/pdfHelper'
import html2pdf from 'html2pdf.js'

const RECIPES = {
  short: {
    title: 'Garlic Butter Salmon',
    dayName: 'Day 1', mealType: 'Dinner', prepTime: 10, cookTime: 15, totalTime: 25,
    ingredients: ['2 (6 oz) salmon fillets', '2 tbsp butter', '3 cloves garlic, minced'],
    instructions: [
      'Pat the salmon fillets dry and season both sides with salt and pepper.',
      'Heat butter in a skillet over medium-high, add garlic, and cook 30 seconds until fragrant.',
      'Sear the salmon 4 minutes per side until golden and flaky.',
      'Spoon the garlic butter over the fillets and serve.',
    ],
    tips: ['Use a heavy skillet for even browning and start the fish skin-side up first.'],
    nutrition: { calories: 480, protein: 42, carbs: 2, fat: 32 },
  },
  medium: {
    title: 'Thai Coconut Chicken Noodle Soup',
    dayName: 'Day 3', mealType: 'Lunch', prepTime: 15, cookTime: 20, totalTime: 35,
    ingredients: [
      '1 lb chicken breast, sliced thin', '2 cans (13.5 oz) coconut milk', '4 cups chicken broth',
      '2 tbsp Thai red curry paste', '1 tbsp fish sauce', '1 tbsp brown sugar',
      '8 oz rice noodles', '1 red bell pepper, sliced', 'Fresh cilantro and lime wedges for serving',
    ],
    instructions: [
      'In a large pot, heat 1 tablespoon of oil over medium-high heat and cook the sliced chicken for 4-5 minutes until just browned. Remove and set aside.',
      'In the same pot, stir in the Thai red curry paste and cook for 30 seconds until fragrant.',
      'Pour in the coconut milk and chicken broth, then stir in the fish sauce and brown sugar. Bring to a gentle boil.',
      'Add the sliced bell pepper and simmer for 3 minutes until just tender.',
      'Add the rice noodles and cook for 2-3 minutes until softened, then return the chicken to the pot.',
      'Taste and adjust seasoning if needed. Serve hot with fresh cilantro and lime wedges.',
    ],
    tips: [
      'Slice the chicken against the grain into thin strips for the most tender texture.',
      'Add the noodles right before serving to prevent them from getting mushy.',
    ],
    nutrition: { calories: 410, protein: 38, carbs: 28, fat: 18 },
  },
  long: {
    title: 'Mediterranean Turkey Meatball Wrap with Tzatziki',
    dayName: 'Day 5', mealType: 'Lunch', prepTime: 25, cookTime: 30, totalTime: 55,
    ingredients: [
      '1 lb ground turkey', '1/2 cup breadcrumbs', '1 large egg, beaten', '3 cloves garlic, minced',
      '1/4 cup chopped fresh parsley', '1 tsp dried oregano', '1 tsp smoked paprika', '1/2 tsp ground cumin',
      '1/2 tsp salt', '1/4 tsp black pepper', '2 tbsp olive oil', '4 large whole wheat wraps',
      '1 cup Greek yogurt', '1/2 cucumber, grated and drained', '1 tbsp lemon juice', '1/4 cup crumbled feta',
    ],
    instructions: [
      'In a large bowl combine the ground turkey, breadcrumbs, beaten egg, half the garlic, parsley, oregano, paprika, cumin, salt and pepper. Mix gently until just combined so the meatballs stay tender.',
      'Scoop the mixture into 1.5-inch meatballs -- about 16 total -- and roll each between your palms to seal any cracks so they hold their shape while cooking.',
      'Heat the olive oil in a wide skillet over medium heat. Working in two batches so the pan is not crowded, brown the meatballs for 5-6 minutes, turning occasionally until deeply golden, then remove to a plate.',
      'Make the tzatziki while the meatballs rest: stir the yogurt, grated cucumber (squeezed very dry), remaining garlic, and lemon juice together with a pinch of salt in a small bowl, and chill it.',
      'Return the first batch of meatballs to the pan, add 1/4 cup water, cover, and simmer 10 minutes until cooked through to 165F, glazing the meatballs in the sauce made from their juices.',
      'Layering step: warm the wraps in a dry pan for 30 seconds per side, then spread a generous spoonful of tzatziki across each, leaving a 1-inch border at the edges.',
      'Arrange 4 meatballs in a row down the centre of each wrap, then crumble the feta over the top and add a handful of crisp greens or sliced tomato if you have them on hand.',
      'Fold the two short ends of the wrap inward over the filling first so the meatballs do not spill out, then roll tightly from the long edge into a firm cylinder.',
      'Slice each wrap in half on a sharp diagonal and serve immediately with the remaining tzatziki for dipping.',
    ],
    tips: [
      'Roll the turkey mixture into balls with lightly oiled palms to stop it sticking.',
      'Grate the cucumber on the large holes and squeeze out as much water as possible -- wet tzatziki thins out and slides off the wrap.',
      'Cook the meatballs in two batches; crowding the pan lowers the heat and steams them instead of browning them.',
      'Warm the wraps just before filling so they bend without cracking, and fold the ends in first so the filling stays put.',
    ],
    nutrition: { calories: 520, protein: 34, carbs: 48, fat: 21 },
  },
}

function MealPlanGrid() {
  const recipes = [
    { type: 'Breakfast', ...RECIPES.medium },
    { type: 'Lunch', ...RECIPES.short },
    { type: 'Dinner', ...RECIPES.long },
  ]
  return (
    <div id="meal-plan-grid" className="w-[800px] bg-white text-gray-900 p-8 space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 className="text-3xl font-black text-gray-900 mb-6">Your 1-Day Keto Meal Plan</h1>
      <div className="space-y-6">
        {recipes.map((r) => (
          <div key={r.type} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <p className="text-sm font-bold text-purple-600 uppercase tracking-wide mb-2">{r.type}</p>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{r.title}</h3>
            <p className="text-gray-700 text-sm">Prep: {r.prepTime} min | Cook: {r.cookTime} min | Total: {r.totalTime} min</p>
            <ul className="mt-3 text-sm text-gray-600 space-y-1">
              {r.ingredients.slice(0, 5).map((ing: string, i: number) => <li key={i}>- {ing}</li>)}
              {r.ingredients.length > 5 && <li className="text-gray-400">...and {r.ingredients.length - 5} more</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

declare global {
  interface Window {
    __pdfTests: Record<string, () => Promise<any>>
  }
}

function App({ imageDataUrl }: { imageDataUrl: string }) {
  const shortRef = useRef<HTMLDivElement>(null)
  const mediumRef = useRef<HTMLDivElement>(null)
  const longRef = useRef<HTMLDivElement>(null)
  const mealPlanRef = useRef<HTMLDivElement>(null)

  const runCapture = useCallback(async (
    ref: React.RefObject<HTMLDivElement | null>,
    filename: string,
    mode: 'single' | 'bulk'
  ) => {
    const el = ref.current
    if (!el) return { ok: false, error: 'no ref element', filename }
    el.classList.add('pdf-export-mode')
    await new Promise(r => setTimeout(r, 500))
    try {
      if (mode === 'single') {
        const ok = await downloadElementAsPDF(el, { filename })
        el.classList.remove('pdf-export-mode')
        return { ok, filename }
      } else {
        const blob = await getElementAsPDFBlob(el, filename)
        el.classList.remove('pdf-export-mode')
        if (!blob) return { ok: false, error: 'blob was null', filename }
        const b64 = await blobToBase64(blob)
        return { ok: true, size: blob.size, filename, b64 }
      }
    } catch (err: any) {
      el.classList.remove('pdf-export-mode')
      return { ok: false, error: err.message, filename }
    }
  }, [])

  const refs = [
    { ref: shortRef, key: 'short', filename: 'garlic-butter-salmon.pdf' },
    { ref: mediumRef, key: 'medium', filename: 'thai-coconut-chicken-noodle-soup.pdf' },
    { ref: longRef, key: 'long', filename: 'mediterranean-turkey-meatball-wrap.pdf' },
  ]

  window.__pdfTests = {
    singleShort: () => runCapture(shortRef, refs[0].filename, 'single'),
    singleMedium: () => runCapture(mediumRef, refs[1].filename, 'single'),
    singleLong: () => runCapture(longRef, refs[2].filename, 'single'),

    bulk: async () => {
      const results = []
      for (const { ref, filename } of refs) {
        results.push(await runCapture(ref, filename, 'bulk'))
      }
      return results
    },

    mealPlan: async () => {
      const el = mealPlanRef.current
      if (!el) return { ok: false, error: 'no meal-plan ref' }
      el.classList.add('pdf-export-mode')
      await new Promise(r => setTimeout(r, 100))
      const opt = {
        margin: 0.5,
        filename: 'meal-plan.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      }
      try {
        const worker = html2pdf().set(opt).from(el)
        const blob = await worker.output('blob')
        el.classList.remove('pdf-export-mode')
        const b64 = await blobToBase64(blob)
        return { ok: true, size: blob.size, filename: 'meal-plan.pdf', b64 }
      } catch (err: any) {
        el.classList.remove('pdf-export-mode')
        return { ok: false, error: err.message, filename: 'meal-plan.pdf' }
      }
    },
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>PDF Component Test Harness</h1>
      <p style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginBottom: 20 }}>
        Driven externally via <code>window.__pdfTests</code>
      </p>

      {/* Visible meal-plan grid for regression test */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Meal Plan Grid (visible, for html2pdf capture):</p>
        <div ref={mealPlanRef} style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
          <MealPlanGrid />
        </div>
      </div>

      {/* Hidden recipe templates (off-screen, rendered by RecipePDFTemplate) */}
      {refs.map(({ ref, key }) => (
        <RecipePDFTemplate
          key={key}
          ref={ref}
          meal={(RECIPES as any)[key]}
          dayName={(RECIPES as any)[key].dayName}
          mealType={(RECIPES as any)[key].mealType}
          imageSrc={imageDataUrl}
          canSeeChefTips={true}
        />
      ))}
    </div>
  )
}

async function init() {
  let imageDataUrl = ''
  try {
    const response = await fetch('/test-recipe.jpg')
    if (response.ok) {
      const blob = await response.blob()
      imageDataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    }
  } catch { /* no test image available */ }

  createRoot(document.getElementById('root')!).render(<App imageDataUrl={imageDataUrl} />)
}

init()
