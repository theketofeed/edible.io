import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicMealPlan } from '../lib/db'
import { fetchMealImage } from '../lib/mealImages'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import logo from '../assets/favicon.png'

type MealSlot = { name: string; cal: number; imageUrl?: string }
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

function MealRow({ name, type, cal, imageUrl: storedImageUrl }: { name: string; type: string; cal: number; imageUrl?: string }) {
  const [img, setImg] = useState<string | null>(storedImageUrl || null)
  const typeColors: Record<string, { label: string; bg: string }> = {
    Breakfast: { label: '#92400e', bg: '#fef3c7' },
    Lunch: { label: '#065f46', bg: '#d1fae5' },
    Dinner: { label: '#5b21b6', bg: '#ede9fe' },
  }
  const col = typeColors[type] || typeColors.Dinner

  useEffect(() => {
    if (storedImageUrl) { setImg(storedImageUrl); return }
    fetchMealImage(name).then(url => { if (url) setImg(url) })
  }, [name, storedImageUrl])

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef', fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        .rec-body {
          width: 96px;
          background: #ffffff;
          border: 2.5px solid #111827;
          border-bottom: none;
          border-radius: 5px 5px 0 0;
          padding: 14px 12px 10px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
        }
        .rec-line {
          height: 6px;
          border-radius: 3px;
          background: #111827;
          margin-bottom: 8px;
          opacity: 0.08;
        }
        .rec-line:last-child { margin-bottom: 0; }
        .rec-line.w-full { width: 100%; }
        .rec-line.w-60 { width: 60%; }
        .rec-line.w-80 { width: 80%; }
        .rec-line.w-45 { width: 45%; }
        .rec-line:nth-child(1) { animation: blinkLine 1.6s ease-in-out 0.00s infinite; }
        .rec-line:nth-child(2) { animation: blinkLine 1.6s ease-in-out 0.20s infinite; }
        .rec-line:nth-child(3) { animation: blinkLine 1.6s ease-in-out 0.40s infinite; }
        .rec-line:nth-child(4) { animation: blinkLine 1.6s ease-in-out 0.60s infinite; }
        .rec-line:nth-child(5) { animation: blinkLine 1.6s ease-in-out 0.80s infinite; }
        .rec-line:nth-child(6) { animation: blinkLine 1.6s ease-in-out 1.00s infinite; }
        .rec-dots span {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #111827;
          margin: 0 3px;
          animation: dotPop 1.4s ease-in-out infinite;
        }
        .rec-dots span:nth-child(2) { animation-delay: 0.22s; }
        .rec-dots span:nth-child(3) { animation-delay: 0.44s; }
        @keyframes blinkLine {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 1; }
        }
        @keyframes dotPop {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.2; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
      <div>
        <div className="rec-body">
          <div className="rec-line w-full"></div>
          <div className="rec-line w-60"></div>
          <div className="rec-line w-full"></div>
          <div className="rec-line w-80"></div>
          <div className="rec-line w-full"></div>
          <div className="rec-line w-45"></div>
        </div>
        <svg width="101" height="14" viewBox="0 0 101 14" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L8.4,12 L16.8,0 L25.2,12 L33.6,0 L42,12 L50.5,0 L58.9,12 L67.3,0 L75.7,12 L84.1,0 L92.5,12 L101,0" fill="white" stroke="#111827" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#374151', letterSpacing: '0.01em' }}>Loading meal plan</span>
        <div className="rec-dots">
          <span></span><span></span><span></span>
        </div>
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
    B: { name: d.Breakfast?.title || d.B?.name || 'N/A', cal: d.Breakfast?.nutrition?.calories || d.B?.cal || 0, imageUrl: d.Breakfast?.imageUrl || d.B?.imageUrl },
    L: { name: d.Lunch?.title || d.L?.name || 'N/A', cal: d.Lunch?.nutrition?.calories || d.L?.cal || 0, imageUrl: d.Lunch?.imageUrl || d.L?.imageUrl },
    D: { name: d.Dinner?.title || d.D?.name || 'N/A', cal: d.Dinner?.nutrition?.calories || d.D?.cal || 0, imageUrl: d.Dinner?.imageUrl || d.D?.imageUrl },
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
                  <MealRow name={day.B.name} type="Breakfast" cal={day.B.cal} imageUrl={day.B.imageUrl} />
                </div>
                {day.L.name !== 'N/A' && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Lunch</p>
                    <MealRow name={day.L.name} type="Lunch" cal={day.L.cal} imageUrl={day.L.imageUrl} />
                  </div>
                )}
                {day.D.name !== 'N/A' && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Dinner</p>
                    <MealRow name={day.D.name} type="Dinner" cal={day.D.cal} imageUrl={day.D.imageUrl} />
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
