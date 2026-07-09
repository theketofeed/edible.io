import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicMealPlan } from '../lib/db'
import { fetchMealImage } from '../lib/mealImages'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import logo from '../assets/favicon.png'

type MealSlot = { name: string; cal: number }
type PlanDay = { day: string; B: MealSlot; L: MealSlot; D: MealSlot }

function getMealEmoji(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('salad')) return '🥗'
  if (t.includes('wrap') || t.includes('burrito')) return '🌯'
  if (t.includes('egg') || t.includes('omelet') || t.includes('scramble')) return '🍳'
  if (t.includes('pancake') || t.includes('waffle')) return '🥞'
  if (t.includes('smoothie') || t.includes('shake')) return '🥤'
  if (t.includes('chicken') || t.includes('turkey')) return '🍗'
  if (t.includes('fish') || t.includes('salmon') || t.includes('tuna')) return '🐟'
  if (t.includes('pasta') || t.includes('noodle')) return '🍝'
  if (t.includes('soup') || t.includes('stew')) return '🍲'
  if (t.includes('rice') || t.includes('bowl')) return '🍚'
  if (t.includes('sandwich') || t.includes('burger')) return '🥪'
  if (t.includes('oatmeal') || t.includes('oats')) return '🥣'
  return '🍽️'
}

function MealRow({ name, type, cal }: { name: string; type: string; cal: number }) {
  const [img, setImg] = useState<string | null>(null)
  const typeColors: Record<string, { label: string; bg: string }> = {
    Breakfast: { label: '#92400e', bg: '#fef3c7' },
    Lunch: { label: '#065f46', bg: '#d1fae5' },
    Dinner: { label: '#5b21b6', bg: '#ede9fe' },
  }
  const col = typeColors[type] || typeColors.Dinner

  useEffect(() => {
    fetchMealImage(name).then(url => { if (url) setImg(url) })
  }, [name])

  return (
    <div style={{ background: '#f9f8f6', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: 9, background: col.bg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {img ? <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getMealEmoji(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>{name}</p>
        {cal > 0 && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>{cal} kcal</p>}
      </div>
    </div>
  )
}

export default function SharedPlan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    getPublicMealPlan(id).then(data => {
      if (!data) { setNotFound(true) } else { setPlan(data) }
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <img src={logo} alt="Edible" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 12 }} />
        <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>Loading meal plan...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif", padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🍽️</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Plan not found</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>This meal plan doesn't exist or hasn't been shared publicly.</p>
        <button onClick={() => navigate('/')} style={{ background: '#c6a0f6', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif" }}>
          Try Edible free →
        </button>
      </div>
    </div>
  )

  const rawDays: any[] = plan.plan_data?.days || []
  const days: PlanDay[] = rawDays.map((d: any) => ({
    day: d.day || 'Day',
    B: { name: d.Breakfast?.title || d.B?.name || 'N/A', cal: d.Breakfast?.nutrition?.calories || d.B?.cal || 0 },
    L: { name: d.Lunch?.title || d.L?.name || 'N/A', cal: d.Lunch?.nutrition?.calories || d.L?.cal || 0 },
    D: { name: d.Dinner?.title || d.D?.name || 'N/A', cal: d.Dinner?.nutrition?.calories || d.D?.cal || 0 },
  }))

  const diet = plan.plan_data?.diet || 'Balanced'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Minimal sticky bar */}
      <div style={{ background: 'rgba(245,243,239,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #ede9e2', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <img src={logo} alt="Edible" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>Edible</span>
        </div>
        <button onClick={() => navigate('/')} style={{ background: '#c6a0f6', color: 'white', border: 'none', borderRadius: 9, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif" }}>
          Get my own plan →
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Plan Title */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#c6a0f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{diet} Plan</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '6px 0 4px', lineHeight: 1.2 }}>{plan.title}</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, margin: 0 }}>{days.length} days · {days.length * 3} meals</p>
        </div>

        {/* Days */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {days.map((day, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 20, padding: 18, border: '1px solid #ede9e2' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 14px' }}>{day.day}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Breakfast</p>
                  <MealRow name={day.B.name} type="Breakfast" cal={day.B.cal} />
                </div>
                {day.L.name !== 'N/A' && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Lunch</p>
                    <MealRow name={day.L.name} type="Lunch" cal={day.L.cal} />
                  </div>
                )}
                {day.D.name !== 'N/A' && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Dinner</p>
                    <MealRow name={day.D.name} type="Dinner" cal={day.D.cal} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 32, background: 'white', borderRadius: 20, padding: '32px 28px', textAlign: 'center', border: '1px solid #ede9e2' }}>
          <p style={{ color: '#111827', fontSize: 18, fontWeight: 900, marginBottom: 12, lineHeight: 1.3 }}>Want a meal plan like this?</p>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 28, lineHeight: 1.6, maxWidth: 280, margin: '0 auto 28px' }}>Upload your groceries and Edible turns them into a full week of meals built just for you.</p>
          <button onClick={() => navigate('/')} style={{ background: '#c6a0f6', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: "'Open Sans', ui-sans-serif, system-ui, sans-serif", width: '100%' }}>
            Generate my meal plan →
          </button>
        </div>
      </div>
    </div>
  )
}
