import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Calendar, BookmarkCheck, Heart, Sparkles,
  User, LogOut, ChevronRight, Plus, Search, Bell, Trash2,
  Clock, UtensilsCrossed, X, Flame, ArrowUpRight,
  ClipboardList, CalendarDays, Utensils,
  Sunrise, Sun, Moon,
  Scale, Leaf, Dumbbell, Wheat, Sprout,
  Camera, PencilLine
} from "lucide-react"
import logo from "../assets/favicon.png"
import { useAuth } from "../context/AuthContext"
import { getUserMealPlans, getProfile, deleteMealPlan, getUserSavedRecipes } from "../lib/db"
import { fetchMealImage } from "../lib/mealImages"
import type { MealPlanResult, Meal, SavedRecipe } from "../utils/types"
import PlanBadge from "../components/PlanBadge"
import PricingModal from '../components/PricingModal'
import { usePlan } from '../hooks/usePlan'

const C = {
  white: "#FFFFFF",
  sideBdr: "#EDEBE7",
  // Match homepage CTA lavender
  accent: "#C6A0F6",
  accentDark: "#B58DF5",
  // Primary lavender accent (matches homepage "Try Edible for Free")
  purple: "#C6A0F6",
  bg: "#F5F3EF",
  cardBdr: "#EDE9E2",
  txt: "#111827",
  muted: "#6B7280",
  faint: "#9CA3AF",
  green: "#10b981",
  red: "#ef4444",
}

type DietKey = "All" | "Balanced" | "Keto" | "Vegan" | "High-Protein" | "Mediterranean" | "Vegetarian" | "Paleo"
type UserData = { name: string; email: string; joined: string; avatarUrl?: string }
const DEFAULT_USER_DATA: UserData = { name: "User", email: "user@edible.pro", joined: "2026" }
const DIET: Record<DietKey, { icon: React.ElementType; col: string; bg: string }> = {
  All: { icon: Sparkles, col: C.purple, bg: "#F5F3FF" },
  Balanced: { icon: Scale, col: "#16a34a", bg: "#F0FDF4" },
  Keto: { icon: Flame, col: "#b45309", bg: "#FEFCE8" },
  Vegan: { icon: Leaf, col: "#047857", bg: "#ECFDF5" },
  "High-Protein": { icon: Dumbbell, col: "#dc2626", bg: "#FEF2F2" },
  Mediterranean: { icon: Wheat, col: "#1d4ed8", bg: "#EFF6FF" },
  Vegetarian: { icon: Sprout, col: "#15803d", bg: "#F0FDF4" },
  Paleo: { icon: UtensilsCrossed, col: "#c2410c", bg: "#FFF7ED" },
}

type MealSlot = { name: string; cal: number; rawMeal?: Meal }
type PlanDay = { day: string; B: MealSlot; L: MealSlot; D: MealSlot }
type Plan = { id: string; title: string; diet: DietKey; date: string; days: PlanDay[] }

type Recipe = { id: string; title: string; type: string; time: number; cal: number; rawMeal?: Meal }
type CustomMeal = { id: string; name: string; type: string; cal: number; time: number; rawMeal?: Meal }

// Helper: extract unique recipes from user's saved plans
function extractRecipesFromPlans(plans: Plan[]): Recipe[] {
  const seen = new Set<string>()
  const recipes: Recipe[] = []
  let idx = 0
  for (const plan of plans) {
    for (const day of plan.days) {
      for (const [type, slot] of [["Breakfast", day.B], ["Lunch", day.L], ["Dinner", day.D]] as [string, MealSlot][]) {
        const key = slot.name.toLowerCase()
        if (!seen.has(key) && slot.name !== "N/A") {
          seen.add(key)
          recipes.push({ id: `r${idx++}`, title: slot.name, type, time: slot.rawMeal?.totalTime || 0, cal: slot.cal, rawMeal: slot.rawMeal })
        }
      }
    }
  }
  return recipes
}

function loadCustomMeals(planId: string, dayIdx: number): CustomMeal[] {
  try {
    const raw = localStorage.getItem(`edible_custom_meals_${planId}_${dayIdx}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistCustomMeals(planId: string, dayIdx: number, meals: CustomMeal[]): void {
  try {
    localStorage.setItem(`edible_custom_meals_${planId}_${dayIdx}`, JSON.stringify(meals))
  } catch {}
}

// Helper: calculate macros from a list of meals
function calcMacros(meals: { rawMeal?: Meal }[]) {
  const res = { p: 0, c: 0, f: 0 }
  meals.forEach(m => {
    const n = m.rawMeal?.nutrition
    if (n) {
      res.p += n.protein || 0
      res.c += n.carbs || 0
      res.f += n.fat || 0
    }
  })
  return res
}

// Helper: build planner data from a specific plan
function buildPlannerFromPlans(plans: Plan[], selectedId?: string | null): Record<number, { type: string; name: string; cal: number; time: number; rawMeal?: Meal }[]> {
  if (plans.length === 0) return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  const plan = selectedId ? (plans.find(p => p.id === selectedId) || plans[0]) : plans[0]
  const planner: Record<number, { type: string; name: string; cal: number; time: number; rawMeal?: Meal }[]> = {}
  for (let i = 0; i < 7; i++) {
    if (i < plan.days.length) {
      const d = plan.days[i]
      planner[i] = [
        { type: "Breakfast", name: d.B.name, cal: d.B.cal, time: d.B.rawMeal?.totalTime || 0, rawMeal: d.B.rawMeal },
        ...(d.L.name !== 'N/A' ? [{ type: "Lunch", name: d.L.name, cal: d.L.cal, time: d.L.rawMeal?.totalTime || 0, rawMeal: d.L.rawMeal }] : []),
        ...(d.D.name !== 'N/A' ? [{ type: "Dinner", name: d.D.name, cal: d.D.cal, time: d.D.rawMeal?.totalTime || 0, rawMeal: d.D.rawMeal }] : []),
      ]
    } else {
      planner[i] = []
    }
  }
  return planner
}

// Helper: avatar component used in sidebar, top bar, and profile
function UserAvatar({ userData, size = 30, fontSize = 12 }: { userData: UserData; size?: number; fontSize?: number }) {
  const avatarUrl = userData.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userData.name || userData.email || 'guest')}`
  return (
    <img
      src={avatarUrl}
      alt={userData.name}
      style={{ 
        width: size, height: size, borderRadius: size * 0.3, 
        objectFit: "cover", flexShrink: 0,
        background: C.white, border: `1px solid ${C.cardBdr}`
      }}
    />
  )
}

// Helper: Meal Image component that fetches from Unsplash
function MealImage({ name, type, size = 42 }: { name: string; type: string; size?: number }) {
  const [img, setImg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchMealImage(name).then(url => {
      if (active) {
        setImg(url)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [name])

  const MealIcon = MICON[type] || Sunrise

  return (
    <div style={{
      width: size, height: size, borderRadius: 11, background: img ? "transparent" : (MBG[type] || "#F3F4F6"),
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
      position: "relative"
    }}>
      {loading ? (
        <div className="animate-shimmer" style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.2)" }} />
      ) : img ? (
        <img src={img} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <MealIcon size={size * 0.48} style={{ color: "white" }} />
      )}
    </div>
  )
}

const getDates = (startDate: Date) => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    return d.getDate()
  })
}
const getToday = (startDate?: Date) => {
  if (!startDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0 || diffDays > 6) return 0 // outside plan range, default to day 0
  return diffDays
}

const MBG: Record<string, string> = {
  Breakfast: "#FEF3C7",
  Lunch: "#D1FAE5",
  // Keep dinner accent within the lavender family
  Dinner: "#F5F3FF"
}
const MCOL: Record<string, string> = { Breakfast: "#92400E", Lunch: "#065F46", Dinner: C.purple }
const MICON: Record<string, React.ElementType> = { Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }


function NotificationBell({ plans, onNav, onUpgrade }: { 
  plans: Plan[]
  onNav: (id: NavId) => void
  onUpgrade: (trigger: string) => void 
}) {
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const { plan, generationsUsed, generationsRemaining, FREE_GENERATION_LIMIT, maxSavedPlans } = usePlan()
  const isPro = plan === 'pro' || plan === 'founding'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const selectedPlan = plans[0] || null
  const planStartDate = selectedPlan?.date ? new Date(selectedPlan.date) : null

  // Compute day index within current plan (0-6)
  const planDayIdx = planStartDate ? (() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const start = new Date(planStartDate); start.setHours(0,0,0,0)
    return Math.floor((today.getTime() - start.getTime()) / 86400000)
  })() : -1

  type Nudge = { id: string; icon: string; title: string; body: string; action?: { label: string; nav: NavId }; urgent?: boolean }

  const nudges: Nudge[] = []

  // 1. Plan expiring soon (day 5, 6, or 7)
  if (planStartDate && planDayIdx >= 4 && planDayIdx <= 6) {
    const daysLeft = 6 - planDayIdx
    nudges.push({
      id: 'plan_expiring',
      icon: '📅',
      title: 'Plan ending soon',
      body: daysLeft === 0 ? 'Your current meal plan ends today.' : `Your meal plan ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
      action: { label: 'Generate new plan', nav: 'generate' },
      urgent: true,
    })
  }

  // 2. Generation limit warning (used 3 of 4)
  if (!isPro && generationsUsed >= FREE_GENERATION_LIMIT - 1 && generationsRemaining > 0) {
    nudges.push({
      id: 'gen_limit',
      icon: '⚡',
      title: '1 generation left',
      body: "You've used your 1 free generation. Start your 7-day free trial for unlimited plans.",
      action: { label: 'Upgrade to Pro', nav: 'generate' },
      urgent: true,
    })
  }

  // 3. Generations used up
  if (!isPro && generationsRemaining === 0) {
    nudges.push({
      id: 'gen_limit_full',
      icon: '🚫',
      title: 'Generation limit reached',
      body: "You've used your free generation. Start your 7-day free trial — cancel anytime.",
      action: { label: 'Upgrade to Pro', nav: 'generate' },
      urgent: true,
    })
  }

  // 4. Saved plans limit warning (3 of 4)
  if (!isPro && plans.length >= maxSavedPlans - 1 && plans.length < maxSavedPlans) {
    nudges.push({
      id: 'plans_limit',
      icon: '📋',
      title: '1 plan slot left',
      body: `You've saved ${plans.length} of ${maxSavedPlans} free plan slots.`,
      action: { label: 'Upgrade to Pro', nav: 'plans' },
    })
  }

  // 5. No plan yet — new user nudge
  if (plans.length === 0) {
    nudges.push({
      id: 'no_plan',
      icon: '✨',
      title: 'No meal plan yet',
      body: 'Upload a grocery receipt and get a full week of meals in seconds.',
      action: { label: 'Generate your first plan', nav: 'generate' },
    })
  }

  // 6. Today's calorie summary (only if they have a plan with today's meals)
  if (plans.length > 0 && planDayIdx >= 0 && planDayIdx <= 6) {
    const planner = buildPlannerFromPlans(plans, plans[0]?.id)
    const todayMeals = planner[planDayIdx] || []
    const consumed = todayMeals.reduce((a, m) => a + m.cal, 0)
    if (consumed > 0) {
      const macros = calcMacros(todayMeals)
      const macroSummary = `${macros.p}g protein · ${macros.c}g carbs · ${macros.f}g fat`
      nudges.push({
        id: 'calories',
        icon: '🔥',
        title: `${consumed} kcal planned today`,
        body: `Across ${todayMeals.length} meal${todayMeals.length !== 1 ? 's' : ''} — ${macroSummary}.`,
      })
    }
  }

  // 7. Milestone — first plan saved
  if (plans.length === 1) {
    nudges.push({
      id: 'milestone_first',
      icon: '🎉',
      title: 'First plan saved!',
      body: 'You\'re all set. Come back each day to track your meals.',
    })
  }

  const hasUrgent = nudges.some(n => n.urgent)
  const displayNudges = nudges.slice(0, 4)

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: 10, background: open ? C.accent : C.white,
          border: `1px solid ${open ? C.accent : C.cardBdr}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', transition: 'all .15s',
          flexShrink: 0,
        }}
      >
        <Bell size={14} style={{ color: open ? 'white' : C.muted }} />
        {hasUrgent && !open && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 7, height: 7,
            borderRadius: '50%', background: '#ef4444', border: '1.5px solid white',
          }} />
        )}
      </button>

      {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 320, background: C.white, borderRadius: 18,
            border: `1px solid ${C.cardBdr}`, boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            zIndex: 50, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.cardBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.txt }}>Notifications</p>
              <span style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>{displayNudges.length} update{displayNudges.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Nudges */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {displayNudges.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>✅</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 4 }}>All caught up!</p>
                  <p style={{ fontSize: 12, color: C.faint }}>No updates right now.</p>
                </div>
              ) : displayNudges.map((n, i) => (
                <div key={n.id} style={{
                  padding: '12px 16px',
                  borderBottom: i < displayNudges.length - 1 ? `1px solid ${C.cardBdr}` : 'none',
                  background: n.urgent ? 'rgba(239,68,68,0.03)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: n.urgent ? '#FEF2F2' : '#F9F8F6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: n.urgent ? '#b91c1c' : C.txt, marginBottom: 2 }}>{n.title}</p>
                      <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{n.body}</p>
                      {n.action && (
                        <button
                          onClick={() => {
                            setOpen(false)
                            if (n.id === 'gen_limit' || n.id === 'gen_limit_full') {
                              onUpgrade('generation_limit')
                            } else if (n.id === 'plans_limit') {
                              onUpgrade('save_plan')
                            } else {
                              onNav(n.action!.nav)
                            }
                          }}
                          style={{
                            marginTop: 8, fontSize: 11, fontWeight: 700, color: 'white',
                            background: n.urgent ? '#ef4444' : C.accentDark,
                            border: 'none', borderRadius: 6, padding: '4px 10px',
                            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif",
                          }}
                        >{n.action.label}</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type NavId = "overview" | "planner" | "plans" | "recipes" | "generate" | "profile" | "logout"
interface SidebarProps { active: string; onNav: (id: NavId) => void; userData: UserData }

function Sidebar({ active, onNav, userData }: SidebarProps) {
  const main = [
    { id: "overview" as NavId, icon: LayoutDashboard, label: "Overview" },
    { id: "planner" as NavId, icon: Calendar, label: "Meal Planner" },
    { id: "plans" as NavId, icon: BookmarkCheck, label: "Saved Plans" },
    { id: "recipes" as NavId, icon: Heart, label: "Saved Recipes" },
    { id: "generate" as NavId, icon: Sparkles, label: "Generate Plan" },
  ]
  const settings = [
    { id: "profile" as NavId, icon: User, label: "Profile", danger: false },
    { id: "logout" as NavId, icon: LogOut, label: "Log Out", danger: true },
  ]

  function Item({ item }: { item: { id: NavId; icon: React.ElementType; label: string; danger?: boolean } }) {
    const on = active === item.id
    return (
      <button onClick={() => onNav(item.id)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
        borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 1,
        background: on ? "rgba(198,160,246,0.10)" : "transparent",
        color: on ? C.txt : item.danger ? C.red : C.muted,
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: on ? 700 : 500, fontSize: 13,
        textAlign: "left", transition: "all .12s",
        borderLeft: on ? `3px solid ${C.accentDark}` : "3px solid transparent",
      }}
        onMouseEnter={e => { if (!on) (e.currentTarget as HTMLElement).style.background = "#F9F8F6" }}
        onMouseLeave={e => { if (!on) (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        <span style={{
          width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          background: on ? "rgba(181,141,245,0.22)" : "rgba(0,0,0,0.04)"
        }}>
          <item.icon size={13} />
        </span>
        {item.label}
        {on && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: C.accentDark }} />}
      </button>
    )
  }

  return (
    <aside className="desktop-sidebar" style={{width:220,background:C.white,flexDirection:"column",
      height:"100%",borderRight:`1px solid ${C.sideBdr}`,flexShrink:0}}>
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.sideBdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img
              src={logo}
              alt="Edible"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, color: C.txt }}>
              Edible
            </span>
          </div>
        </div>
        <div style={{ padding: "12px 12px 6px" }}>
          <button onClick={() => onNav("generate")} style={{
            width: "100%", background: C.accent, color: "white", padding: "9px 12px",
            borderRadius: 10, fontWeight: 700, fontSize: 12.5, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 14px rgba(198,160,246,0.4)"
          }}>
            <Plus size={14} /> Generate Plan
          </button>
        </div>
        <nav style={{ padding: "6px 10px" }}>
          <p style={{
            fontSize: 9.5, fontWeight: 700, color: C.faint, letterSpacing: ".12em",
            textTransform: "uppercase", padding: "8px 10px 5px"
          }}>Main Menu</p>
          {main.map(i => <Item key={i.id} item={i} />)}
        </nav>
        <div style={{ flex: 1 }} />
        <nav style={{ padding: "0 10px 6px", borderTop: `1px solid ${C.sideBdr}`, marginTop: 12 }}>
          <p style={{
            fontSize: 9.5, fontWeight: 700, color: C.faint, letterSpacing: ".12em",
            textTransform: "uppercase", padding: "10px 10px 5px"
          }}>Settings</p>
          {settings.map(i => <Item key={i.id} item={i} />)}
        </nav>
        <div style={{ padding: "12px 12px 20px", borderTop: `1px solid ${C.sideBdr}`, marginTop: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9, padding: "6px 8px",
            borderRadius: 10, background: "#F9F8F6"
          }}>
            <UserAvatar userData={userData} size={30} fontSize={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ color: C.txt, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userData.name}</p>
                <PlanBadge size="sm" showIcon={false} />
              </div>
              <p style={{ color: C.faint, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userData.email}</p>
            </div>
          </div>
        </div>
    </aside>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
interface OverviewProps { plans: Plan[]; onNav: (id: NavId) => void; userData: UserData }

function Overview({ plans, onNav, userData, onSelectPlan, selectedPlanId }: OverviewProps & { onSelectPlan: (id: string) => void; selectedPlanId: string | null }) {
  const totalDays = plans.reduce((a, p) => a + p.days.length, 0)
  const totalMeals = totalDays * 3
  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || null
  const planStartDate = selectedPlan?.date ? new Date(selectedPlan.date) : new Date()
  const todayIdx = getToday(planStartDate)
  const planner = buildPlannerFromPlans(plans, selectedPlanId)
  const todayMeals = planner[todayIdx] || []
  const consumed = todayMeals.reduce((a, m) => a + m.cal, 0)
  const target = 1800
  const macros = calcMacros(todayMeals)
  const r = 44, cx = 60, cy = 60, circ = 2 * Math.PI * r
  const dash = circ
  const now = new Date()
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" })
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const activePlan = plans.find(p => p.id === selectedPlanId)
  return (
    <div>
      <div className="dash-overview-card" style={{
        background: C.white,
        borderRadius: 24, padding: "26px 26px 34px", marginBottom: 0, position: "relative", overflow: "hidden",
        boxShadow: "0 8px 32px rgba(198,160,246,0.08)",
        border: "1px solid rgba(198,160,246,0.1)"
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          borderRadius: "50%", background: "rgba(255,255,255,0.08)"
        }} />
        <div style={{
          position: "absolute", bottom: -20, left: 60, width: 100, height: 100,
          borderRadius: "50%", background: "rgba(255,255,255,0.05)"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#F9F8F6",
            borderRadius: 999, padding: "8px 16px", width: "fit-content",
            marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}>
            <CalendarDays size={16} style={{ color: C.txt }} />
            <div style={{ lineHeight: 1.1 }}>
              <p style={{ color: C.txt, fontSize: 12.5, fontWeight: 700 }}>{weekday}</p>
              <p style={{ color: C.faint, fontSize: 12.5, fontWeight: 500 }}>{monthDay}</p>
            </div>
          </div>
          <h1 className="dash-overview-title" style={{ fontSize: 28, fontWeight: 700, color: C.txt, marginBottom: 20, letterSpacing: "-0.02em" }}>
            Hello, {userData.name}{" "}
            <span style={{ fontSize: 18, display: "inline-block", verticalAlign: "middle", transform: "translateY(-1px)" }}>👋</span>
          </h1>
          <div className="dash-stats-grid">
            {[
              { label: "Saved Plans", value: plans.length, Icon: ClipboardList },
              { label: "Days Planned", value: totalDays, Icon: CalendarDays },
              { label: "Meals Saved", value: totalMeals, Icon: UtensilsCrossed },
            ].map((s, i) => (
              <div key={i} className="dash-stat-card" style={{
                background: "#F9F8F6",
                borderRadius: 18,
                padding: "16px 20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                backdropFilter: "none"
              }}>
                <div style={{ marginBottom: 6 }}>
                  <s.Icon size={20} style={{ color: C.txt }} />
                </div>
                <p className="dash-stat-value" style={{ fontWeight: 700, fontSize: 28, color: C.txt, lineHeight: 1, marginBottom: 3, letterSpacing: "-1px" }}>{s.value}</p>
                <p className="dash-stat-label" style={{ color: C.faint, fontSize: 11, fontWeight: 500 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="dash-two-col" style={{ marginTop: 24 }}>
        <div style={{ background: C.white, borderRadius: 20, padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
              <p className="dash-section-title" style={{ fontWeight: 700, fontSize: 14, color: C.txt }}>Today's Meals</p>
              {activePlan && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "white", background: C.accent, padding: "1px 8px", borderRadius: 4, textTransform: "uppercase" }}>
                  Plan: {activePlan.title}
                </span>
              )}
            </div>
            <button onClick={() => onNav("planner")}
              style={{ fontSize: 11, color: C.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Open Planner →
            </button>
          </div>
          {todayMeals.length > 0 ? todayMeals.map((m, i) => {
            const MealIcon = MICON[m.type] || Sunrise
            return (
              <div key={i} className="dash-meal-item" style={{
                display: "flex", gap: 10, alignItems: "center", padding: "10px 0",
                borderBottom: i < todayMeals.length - 1 ? `1px solid rgba(0,0,0,0.03)` : "none"
              }}>
                <MealImage name={m.name} type={m.type} size={34} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: C.txt }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: C.faint }}>{m.type} · {m.cal} kcal · {m.time} min</p>
                </div>
              </div>
            )
          }) : <p style={{ fontSize: 13, color: C.faint, padding: "12px 0", textAlign: "center" }}>No meals planned today</p>}
        </div>
        <div className="dash-calories-card" style={{ background: C.white, borderRadius: 20, padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: C.txt, marginBottom: 14 }}>Today's Calories</p>
          <div className="dash-overview-calories-row">
            <div className="dash-overview-ring-wrapper" style={{ width: 120, height: 120, flexShrink: 0 }}>
              <svg viewBox="0 0 120 120" style={{ width: "100%", height: "100%", display: "block" }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={10} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={10}
                  strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} strokeLinecap="round"
                  transform="rotate(-90 60 60)" />
                <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 20, fontWeight: 800, fill: C.txt, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{consumed}</text>
                <text x={cx} y={cy + 13} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 9.5, fontWeight: 600, fill: C.faint, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>kcal</text>
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <p style={{ margin: 0, padding: 0, fontSize: 22, fontWeight: 800, color: C.txt, lineHeight: 1.1 }}>{consumed}</p>
                <p style={{ margin: 0, padding: 0, fontSize: 11, color: C.faint, fontWeight: 500, lineHeight: 1 }}>kcal total</p>
              </div>
              <p style={{ margin: 0, padding: 0, fontSize: 12, color: C.muted, fontWeight: 700, lineHeight: 1.2 }}>across {todayMeals.length} meal{todayMeals.length !== 1 ? 's' : ''}</p>
              <div className="macro-badges-container" style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {[{ l: "Protein", v: macros.p, c: "#ef4444" }, { l: "Carbs", v: macros.c, c: "#f59e0b" }, { l: "Fat", v: macros.f, c: C.purple }].map((m, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, color: C.txt, background: "#F3F4F6",
                    padding: "4px 10px", borderRadius: 999
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.c }} />
                    {m.v}g {m.l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: C.txt }}>Recently Saved Plans</p>
          <button onClick={() => onNav("plans")}
            style={{ fontSize: 11, color: C.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            View all →
          </button>
        </div>
        {plans.slice(0, 2).map(p => {
          const dm = DIET[p.diet] || DIET.Balanced
          return (
            <div key={p.id} style={{
              background: C.white, borderRadius: 14, padding: "12px 16px",
              border: p.id === selectedPlanId ? `2px solid ${C.accent}` : `1px solid ${C.cardBdr}`, 
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 8, cursor: "pointer", transition: "all .15s",
              position: "relative"
            }}
              onClick={() => { onSelectPlan(p.id); onNav("plans") }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.cardBdr}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: dm.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <dm.icon size={18} style={{ color: "white" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <p style={{ fontWeight: 700, color: C.txt, fontSize: 13 }}>{p.title}</p>
                  {p.id === selectedPlanId && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: C.accent, border: `1px solid ${C.accent}`, padding: "0px 4px", borderRadius: 3, textTransform: "uppercase" }}>Active</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: C.faint }}>{p.diet} · {p.days.length} days</p>
              </div>
              <ChevronRight size={14} style={{ color: C.faint }} />
            </div>
          )
        })}
      </div>
      <div onClick={() => onNav("generate")} style={{
        background: "linear-gradient(135deg,#1a0533,#2d0a5e)", borderRadius: 16,
        padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", marginTop: 8
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: "rgba(198,160,246,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <Sparkles size={20} style={{ color: C.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "white", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Plan your next week</p>
          <p style={{ color: "rgba(198,160,246,0.6)", fontSize: 12 }}>Upload a receipt → get a full meal plan in seconds</p>
        </div>
        <ArrowUpRight size={16} style={{ color: C.accent, flexShrink: 0 }} />
      </div>
    </div>
  )
}

// ─── Add Meal Modal ───────────────────────────────────────────────────────────
interface AddMealModalProps {
  dayLabel: string
  savedRecipes: Recipe[]; onAdd: (meal: CustomMeal) => void; onClose: () => void
}

function AddMealModal({ dayLabel, savedRecipes, onAdd, onClose }: AddMealModalProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = savedRecipes.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchType = filter === 'All' || r.type === filter
    return matchSearch && matchType
  })

  const hasRecipes = savedRecipes.length > 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)', padding: '0 16px' }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 24, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '22px 24px 16px', flexShrink: 0, borderBottom: `1px solid ${C.cardBdr}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: C.txt, letterSpacing: '-0.02em' }}>Add from Saved Recipes</p>
              <p style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>Adding to {dayLabel}</p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 999, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
              <X size={14} style={{ color: C.muted }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
          {!hasRecipes ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Heart size={24} style={{ color: '#f87171' }} />
              </div>
              <p style={{ color: C.txt, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No saved recipes yet</p>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>Open any recipe from a meal plan<br/>and tap the ♡ to save it here.</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9F8F6', borderRadius: 12, padding: '9px 14px', marginBottom: 12, border: `1px solid ${C.cardBdr}` }}>
                <Search size={13} style={{ color: C.faint, flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your saved recipes…" autoFocus
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: C.txt, width: '100%', fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 0, display: 'flex' }}><X size={11} /></button>}
              </div>
              {/* Type filter */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['All', 'Breakfast', 'Lunch', 'Dinner'].map(f => {
                  const on = filter === f
                  return (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: on ? 700 : 500, background: on ? C.accentDark : '#F3F4F6', color: on ? 'white' : C.muted, fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .15s', boxShadow: on ? '0 4px 10px rgba(181,141,245,0.3)' : 'none' }}>{f}</button>
                  )
                })}
              </div>
              {/* Recipe list */}
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: C.faint, fontSize: 13 }}>No recipes match "{search || filter}"</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(r => (
                    <div key={r.id}
                      onClick={() => { onAdd({ id: `cm_${Date.now()}`, name: r.title, type: r.type, cal: r.cal, time: r.time, rawMeal: r.rawMeal }); onClose() }}
                      style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', borderRadius: 14, border: `1px solid ${C.cardBdr}`, cursor: 'pointer', background: C.white, transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; (e.currentTarget as HTMLElement).style.background = '#FAF5FF'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.cardBdr; (e.currentTarget as HTMLElement).style.background = C.white; (e.currentTarget as HTMLElement).style.transform = '' }}>
                      <MealImage name={r.title} type={r.type} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</p>
                        <p style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                          <span style={{ fontWeight: 700, color: MCOL[r.type] || C.purple }}>{r.type}</span>
                          {r.cal > 0 ? ` · ${r.cal} kcal` : ''}{r.time > 0 ? ` · ${r.time} min` : ''}
                        </p>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: 999, background: 'rgba(198,160,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Plus size={14} style={{ color: C.accentDark }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Meal Planner ─────────────────────────────────────────────────────────────
interface MealPlannerProps { plans: Plan[]; savedRecipes: Recipe[] }

function MealPlanner({ plans, selectedPlanId, savedRecipes }: MealPlannerProps & { selectedPlanId: string | null }) {
  const navigate = useNavigate()
  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || null
  const startDate = selectedPlan?.date ? new Date(selectedPlan.date) : new Date()
  const todayIdx = getToday(startDate)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  const weekLabel = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${endDate.toLocaleDateString('en-US', { day: 'numeric' })}, ${endDate.getFullYear()}`
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startDow = startDate.getDay()
  const WEEK = Array.from({ length: 7 }, (_, i) => DAY_NAMES[(startDow + i) % 7])
  const currentDates = getDates(startDate)
  const [day, setDay] = useState(todayIdx)
  const [showAddModal, setShowAddModal] = useState(false)
  const [extraMeals, setExtraMeals] = useState<CustomMeal[]>([])
  const planner = buildPlannerFromPlans(plans, selectedPlanId)
  const planMeals = planner[day] || []

  // Load custom meals from localStorage whenever day or plan changes
  useEffect(() => {
    const planId = selectedPlan?.id || 'none'
    setExtraMeals(loadCustomMeals(planId, day))
  }, [day, selectedPlan?.id])

  const allMeals = [
    ...planMeals,
    ...extraMeals.map(m => ({ type: m.type, name: m.name, cal: m.cal, time: m.time, rawMeal: m.rawMeal }))
  ]
  const consumed = allMeals.reduce((a, m) => a + m.cal, 0)
  const target = 1800
  const macros = calcMacros(allMeals)
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r
  const dash = circ

  const handleAddMeal = (meal: CustomMeal) => {
    const planId = selectedPlan?.id || 'none'
    const updated = [...extraMeals, meal]
    persistCustomMeals(planId, day, updated)
    setExtraMeals(updated)
  }

  const dayLabel = `${WEEK[day]}, ${currentDates[day]}`

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.txt }}>Meal Planner</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Week of {weekLabel}</p>
      </div>
      <div className="dash-day-strip">
        {WEEK.map((d, i) => {
          const sel = i === day, isToday = i === todayIdx
          const hasPlan = (planner[i] || []).length > 0
          const hasCustom = loadCustomMeals(selectedPlan?.id || 'none', i).length > 0
          const has = hasPlan || hasCustom
          return (
            <button key={d} onClick={() => setDay(i)} 
              className="dash-day-btn"
              style={{
                border: sel ? "none" : `1px solid ${C.cardBdr}`,
                background: sel ? `linear-gradient(135deg,${C.accentDark},${C.accent})` : "rgba(198,160,246,0.06)",
                boxShadow: sel ? `0 10px 28px rgba(198,160,246,0.28)` : "none"
              }}>
              <span style={{ fontSize: 10, fontWeight: 500, marginBottom: 4, color: sel ? "rgba(255,255,255,0.78)" : C.faint }}>{d}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: sel ? "white" : isToday ? C.accent : C.txt }}>{currentDates[i]}</span>
              <div style={{ width: 18, height: 6, borderRadius: 999, marginTop: 6, background: has ? (sel ? "rgba(255,255,255,0.65)" : "rgba(198,160,246,0.55)") : "transparent", border: has && !sel ? "1px solid rgba(198,160,246,0.30)" : "none" }} />
            </button>
          )
        })}
      </div>
      <div className="dash-planner-grid">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="dash-planner-date-header">
              {WEEK[day]}, {new Date().toLocaleDateString('en-US', { month: 'short' })} {currentDates[day]}{day === todayIdx ? " · Today" : ""}
            </p>
            <button onClick={() => setShowAddModal(true)}
              className="dash-add-meal-btn"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}
            >
              <Plus size={12} /> Add Meal
            </button>
          </div>
          {allMeals.length > 0 ? allMeals.map((m, i) => {
            const isExtra = i >= planMeals.length
            return (
              <div key={i}
                style={{
                  background: C.white, borderRadius: 16, padding: "14px 18px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.02)", display: "flex", gap: 12, alignItems: "center", marginBottom: 10, transition: "all .2s ease",
                  position: "relative"
                }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, cursor: m.rawMeal ? 'pointer' : 'default', minWidth: 0 }}
                  onClick={() => { if (m.rawMeal) navigate(`/recipe/${day}/${m.type}`, { state: { meal: m.rawMeal, fromDashboard: true } }) }}
                  onMouseEnter={e => { if (m.rawMeal) (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}>
                  <MealImage name={m.name} type={m.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11.5, fontWeight: 700, color: MCOL[m.type] || C.purple, marginBottom: 2 }}>{m.type}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.txt, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: C.faint, fontWeight: 500 }}>{m.cal > 0 ? `${m.cal} kcal` : '-- kcal'} · {m.time > 0 ? `${m.time} min` : '--'}</p>
                  </div>
                  {m.rawMeal && !isExtra && <ChevronRight size={16} style={{ color: C.faint, flexShrink: 0 }} />}
                </div>
                {isExtra && (
                  <button
                    onClick={() => {
                      const planId = selectedPlan?.id || 'none'
                      const extraIdx = i - planMeals.length
                      const updated = extraMeals.filter((_, ei) => ei !== extraIdx)
                      persistCustomMeals(planId, day, updated)
                      setExtraMeals(updated)
                    }}
                    title="Remove meal"
                    style={{ width: 26, height: 26, borderRadius: 999, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FECACA'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}>
                    <X size={12} style={{ color: C.red }} />
                  </button>
                )}
              </div>
            )
          }) : (
            <div style={{ background: C.white, borderRadius: 18, padding: 40, border: `2px dashed rgba(0,0,0,0.05)`, textAlign: "center" }}>
              <Utensils size={34} style={{ color: C.purple, marginBottom: 10 }} />
              <p style={{ fontWeight: 700, color: C.txt, marginBottom: 6 }}>No meals planned</p>
              <p style={{ fontSize: 13, color: C.muted }}>Add from your saved recipes, or generate a new plan</p>
            </div>
          )}
        </div>
        <div>
          <div className="dash-planner-calories-card">
            <p style={{ fontWeight: 700, fontSize: 13, color: C.txt, marginBottom: 12 }}>Calories</p>
            <div className="dash-planner-ring-wrapper" style={{ maxWidth: 140, margin: "0 auto", width: "100%", height: "auto" }}>
              <svg viewBox="0 0 140 140" style={{ width: "100%", height: "100%", display: "block" }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={12} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={12}
                  strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} strokeLinecap="round"
                  transform="rotate(-90 70 70)" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 26, fontWeight: 800, fill: C.txt, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{consumed}</text>
              </svg>
            </div>
            <p style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 6 }}>
              across {allMeals.length} meal{allMeals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ background: C.white, borderRadius: 20, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: C.txt, marginBottom: 12 }}>Macros</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[{ l: "Protein", v: macros.p, c: "#ef4444" }, { l: "Carbs", v: macros.c, c: "#f59e0b" }, { l: "Fat", v: macros.f, c: C.purple }].map((m, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, fontWeight: 700, color: C.txt, background: "#F3F4F6",
                  padding: "5px 12px", borderRadius: 999
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.c }} />
                  {m.v}g {m.l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddMealModal
          dayLabel={dayLabel}
          savedRecipes={savedRecipes}
          onAdd={handleAddMeal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}


// ─── Saved Plans ──────────────────────────────────────────────────────────────
interface SavedPlansProps { 
  plans: Plan[]; 
  expandedPlanId: string | null; 
  onExpandPlan: (id: string | null) => void;
  onDeletePlan: (id: string) => void;
}

function SavedPlans({ plans, expandedPlanId, onExpandPlan, onDeletePlan }: SavedPlansProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DietKey>("All")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const diets = ["All" as DietKey, ...Array.from(new Set(plans.map(p => p.diet)))]
  const visible = plans.filter(p => filter === "All" || p.diet === filter)
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.txt, letterSpacing: "-0.01em" }}>Saved Plans</h1>
        <span style={{
          fontSize: 12, color: C.muted, background: C.white, fontWeight: 600,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)", padding: "5px 14px", borderRadius: 999
        }}>{visible.length} saved</span>
      </div>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" }}>
        {diets.map(d => {
          const dm = DIET[d] || DIET.Balanced, on = filter === d
          return (
            <button key={d} onClick={() => setFilter(d)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 999,
              fontSize: 12.5, fontWeight: on ? 700 : 500,
              border: on ? "none" : `1px solid rgba(0,0,0,0.04)`,
              boxShadow: on ? `0 4px 12px ${dm.col}40` : "none",
              background: on ? dm.col : C.white, color: on ? "white" : dm.col,
              cursor: "pointer", transition: "all .15s", fontFamily: "'Plus Jakarta Sans',sans-serif"
            }}>
              <dm.icon size={16} style={{ color: on ? "white" : dm.col }} />{d}
            </button>
          )
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
        {visible.map(plan => {
          const dm = DIET[plan.diet] || DIET.Balanced
          return (
            <div key={plan.id} style={{
              background: C.white, borderRadius: 16, overflow: "hidden",
              border: plan.id === expandedPlanId ? `2px solid ${C.accent}` : `1px solid ${C.cardBdr}`, 
              cursor: "pointer", transition: "all .18s",
              position: "relative"
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "" }}>
              <div style={{ height: 4, background: `linear-gradient(90deg,${dm.col},${C.accent})` }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <dm.icon size={22} style={{ color: "white", flexShrink: 0 }} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, color: C.txt, fontSize: 14 }}>{plan.title}</p>
                        {plan.id === expandedPlanId && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: "white", background: C.accent, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>Active</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: dm.col, background: dm.bg,
                        padding: "2px 8px", borderRadius: 999
                      }}>{plan.diet}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setDeletingId(plan.id) }}
                    style={{
                      width: 26, height: 26, borderRadius: 7, background: "#FEF2F2", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                    <Trash2 size={11} style={{ color: C.red }} />
                  </button>
                </div>
                <div style={{ background: "#F9F8F6", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                  {plan.days.slice(0, 2).map((dayItem, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < 1 ? 6 : 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, width: 24, flexShrink: 0 }}>{dayItem.day}</span>
                      <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {dayItem.B.name} · {dayItem.L.name}
                      </span>
                    </div>
                  ))}
                  {plan.days.length > 2 && <p style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>+{plan.days.length - 2} more days</p>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 11.5, color: C.faint }}>{plan.days.length} days · {plan.days.length * 3} meals</p>
                    <p style={{ fontSize: 11, color: C.faint }}>{new Date(plan.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onExpandPlan(expandedPlanId === plan.id ? null : plan.id) }}
                    style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {expandedPlanId === plan.id ? "Close" : "View Plan"} <ChevronRight size={14} style={{ transform: expandedPlanId === plan.id ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                  </button>
                </div>
              </div>

              {/* Inline Expanded View */}
              {expandedPlanId === plan.id && (
                <div style={{ borderTop: `1px solid ${C.cardBdr}`, background: "#FBF9FE", padding: "16px 18px", cursor: "default" }} onClick={e => e.stopPropagation()}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: C.txt, marginBottom: 12 }}>Full Plan Breakdown</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {plan.days.map((d, dIdx) => (
                      <div key={dIdx}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: C.purple, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                          {d.day}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { label: "Breakfast", meal: d.B },
                            { label: "Lunch", meal: d.L },
                            { label: "Dinner", meal: d.D }
                          ].map((m, i) => (
                            <div key={i} onClick={() => { if(m.meal.rawMeal) navigate(`/recipe/${dIdx}/${m.label}`, { state: { meal: m.meal.rawMeal, fromDashboard: true } }) }}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.white,
                                borderRadius: 10, border: `1px solid ${C.cardBdr}`, cursor: m.meal.rawMeal ? "pointer" : "default", transition: "all .15s"
                              }}
                              onMouseEnter={e => { if (m.meal.rawMeal) (e.currentTarget as HTMLElement).style.borderColor = C.accent }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.cardBdr }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 10, color: C.faint, fontWeight: 700, textTransform: "uppercase" }}>{m.label}</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: C.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.meal.name}</p>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: m.meal.cal > 0 ? C.muted : C.faint }}>{m.meal.cal > 0 ? `${m.meal.cal} cal` : ''}</span>
                                {m.meal.rawMeal && <ChevronRight size={14} style={{ color: C.faint }} />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div style={{
          background: "#FAF5FF", borderRadius: 16, border: `2px dashed rgba(198,160,246,0.75)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 32, cursor: "pointer", minHeight: 200, transition: "background .15s"
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F3E8FF"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FAF5FF"}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "rgba(198,160,246,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10
          }}>
            <Plus size={20} style={{ color: C.purple }} />
          </div>
          <p style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>Save a New Plan</p>
          <p style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>Generate &amp; save a plan</p>
        </div>
      </div>

      {deletingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={() => setDeletingId(null)}>
          <div style={{ background: C.white, borderRadius: 24, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", margin: "0 16px" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Trash2 size={24} style={{ color: C.red }} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: C.txt, marginBottom: 8 }}>Delete Meal Plan?</h3>
            <p style={{ color: C.muted, fontSize: 14.5, marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this plan? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeletingId(null)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: `1px solid ${C.cardBdr}`, background: C.white, color: C.txt, fontWeight: 700, cursor: "pointer", transition: "background .15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F9FAFB"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.white}>
                Cancel
              </button>
              <button onClick={async () => {
                try {
                  await deleteMealPlan(deletingId)
                  onDeletePlan(deletingId)
                  setDeletingId(null)
                } catch(e) { console.error('Failed to delete plan:', e) }
              }} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "none", background: C.red, color: "white", fontWeight: 700, cursor: "pointer", transition: "opacity .15s" }}
                 onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                 onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Saved Recipes ────────────────────────────────────────────────────────────
interface SavedRecipesProps { recipes: Recipe[] }

function RecipeCard({ r, hidden, onHide }: { r: Recipe, hidden: boolean, onHide: (e: React.MouseEvent) => void }) {
  const navigate = useNavigate()
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMealImage(r.title).then(url => { if (active && url) setImageUrl(url) })
    return () => { active = false }
  }, [r.title])

  if (hidden) return null

  const icons: Record<string, React.ElementType> = { Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }
  const Icon = icons[r.type] || Sparkles

  return (
    <div onClick={() => { if(r.rawMeal) navigate(`/recipe/0/${r.type}`, { state: { meal: r.rawMeal, fromDashboard: true } }) }}
      style={{
        background: C.white, borderRadius: 20, border: "none", display: "flex", gap: 16, alignItems: "center",
        padding: "16px", cursor: r.rawMeal ? "pointer" : "default", transition: "all .25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.03)"
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.01)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 34px rgba(0,0,0,0.08)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.03)" }}>
      
      {/* Plated Image */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%", background: imageUrl ? `url(${imageUrl}) center/cover no-repeat` : (MBG[r.type] || "#F3F4F6"),
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", position: "relative",
        boxShadow: "0 8px 16px rgba(0,0,0,0.06)"
      }}>
        {!imageUrl && <Icon size={26} style={{ color: "rgba(255,255,255,0.95)" }} />}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: C.txt, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: MCOL[r.type] || C.purple, background: MBG[r.type] ? `${MBG[r.type]}20` : "rgba(198,160,246,0.15)", padding: "3px 8px", borderRadius: 999 }}>
            {r.type}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.txt }}>{r.cal > 0 ? r.cal : '--'} <span style={{color:C.faint, fontWeight:600}}>kcal</span></span>
          {r.rawMeal?.nutrition && (
            <>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.txt }}>{r.rawMeal.nutrition.carbs || 0}<span style={{color:C.faint, fontWeight:600}}>g C</span></span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.txt }}>{r.rawMeal.nutrition.protein || 0}<span style={{color:C.faint, fontWeight:600}}>g P</span></span>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.txt }}>{r.rawMeal.nutrition.fat || 0}<span style={{color:C.faint, fontWeight:600}}>g F</span></span>
            </>
          )}
        </div>
      </div>

      <button onClick={onHide} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 8, alignSelf: "flex-start", marginTop: -8, marginRight: -8, transition: "transform .15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.15)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}>
        <Heart size={14} style={{ color: C.red, fill: C.red }} />
      </button>
    </div>
  )
}

function SavedRecipes({ recipes }: SavedRecipesProps) {
  const [filter, setFilter] = useState("All")
  const [hiddenRecipes, setHiddenRecipes] = useState<string[]>(() => JSON.parse(localStorage.getItem('hiddenRecipes') || '[]'))
  
  const types  = ["All","Breakfast","Lunch","Dinner"]
  const icons: Record<string, React.ElementType> = { All: Sparkles, Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }
  
  const unhidden = recipes.filter(r => !hiddenRecipes.includes(r.title))
  const visible = unhidden.filter(r => filter === "All" || r.type === filter)

  const handleHide = (title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newHidden = [...hiddenRecipes, title]
    setHiddenRecipes(newHidden)
    localStorage.setItem('hiddenRecipes', JSON.stringify(newHidden))
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.txt }}>Saved Recipes</h1>
        <span style={{
          fontSize: 12, color: C.muted, background: C.white,
          border: `1px solid ${C.cardBdr}`, padding: "4px 12px", borderRadius: 999
        }}>{visible.length} recipes</span>
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>
        Your personalized library of hearted recipes
      </p>
      <div style={{ display: "flex", gap: 7, marginBottom: 22 }}>
        {types.map(t => {
          const on = filter === t
          const Icon = icons[t]
          return (
            <button key={t} onClick={() => setFilter(t)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 999,
              fontSize: 12.5, fontWeight: on ? 700 : 500,
              border: on ? "none" : `1px solid ${C.cardBdr}`,
              background: on ? C.accentDark : C.white, color: on ? "white" : C.txt,
              cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all .15s"
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 999,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: on ? "rgba(255,255,255,0.18)" : "rgba(198,160,246,0.12)",
                border: on ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(198,160,246,0.22)"
              }}>
                <Icon size={14} style={{ color: on ? "white" : C.txt }} />
              </span>
              {t}
            </button>
          )
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
        {visible.map(r => <RecipeCard key={r.id} r={r} hidden={false} onHide={(e) => handleHide(r.title, e)} />)}
      </div>
    </div>
  )
}

// ─── Search Results Override ────────────────────────────────────────────
function SearchResults({
  plans,
  recipes,
  query,
}: {
  plans: Plan[]
  recipes: Recipe[]
  query: string
}) {
  const hasAny = plans.length > 0 || recipes.length > 0
  const recipeIcons: Record<string, React.ElementType> = { Breakfast: Sunrise, Lunch: Sun, Dinner: Moon }

  return (
    <div style={{ background: C.white, borderRadius: 20, padding: "18px 18px", border: `1px solid ${C.cardBdr}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 12, color: C.faint, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
            Search results
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: C.txt, marginBottom: 4 }}>“{query}”</h2>
          <p style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>
            {plans.length + recipes.length} match{plans.length + recipes.length === 1 ? "" : "es"}
          </p>
        </div>
      </div>

      {!hasAny ? (
        <div style={{ padding: 28, borderRadius: 16, border: `2px dashed ${C.cardBdr}`, textAlign: "center" }}>
          <p style={{ fontWeight: 900, color: C.txt, marginBottom: 6 }}>No matches</p>
          <p style={{ fontSize: 13, color: C.faint }}>Try searching by plan name or recipe type.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {plans.length > 0 && (
            <div>
              <p style={{ fontWeight: 900, color: C.txt, marginBottom: 10 }}>Meal Plans</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {plans.map(p => {
                  const dm = DIET[p.diet] || DIET.Balanced
                  return (
                    <div
                      key={p.id}
                      style={{ background: C.white, borderRadius: 16, padding: 14, border: `1px solid ${C.cardBdr}`, display: "flex", gap: 12, alignItems: "center" }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: dm.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <dm.icon size={20} style={{ color: dm.col }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 900, color: C.txt, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                        <p style={{ fontSize: 12, color: C.faint, fontWeight: 700 }}>{p.diet} · {p.days.length} days</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {recipes.length > 0 && (
            <div>
              <p style={{ fontWeight: 900, color: C.txt, marginBottom: 10 }}>Recipes</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
                {recipes.map(r => (
                  <RecipeCard key={r.id} r={r} hidden={false} onHide={(e) => { e.stopPropagation() }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generate ─────────────────────────────────────────────────────────────────
function Generate() {
  const navigate = useNavigate()
  const [hov, setHov] = useState<number | null>(null)
  const [prefDiet, setPrefDiet] = useState<DietKey>("Balanced")

  const handleGenerate = () => {
    // Navigate to home and pass diet via state (homepage can pick it up or we just auto-scroll)
    navigate('/', { state: { dietPref: prefDiet } })
    setTimeout(() => {
      const uploadSection = document.getElementById('upload-section')
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.txt, marginBottom: 6 }}>Generate a Meal Plan</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 28 }}>Tell us what you've got. We'll handle the rest.</p>
      <div className="dash-generate-grid" style={{ marginBottom: 24 }}>
        {[
          { Icon: Camera, label: "Upload a Receipt", desc: "Take a photo of your grocery receipt" },
          { Icon: PencilLine, label: "Type or Paste", desc: "Enter your grocery items directly" },
        ].map((o, i) => (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            onClick={handleGenerate}
            style={{
              background: C.white, borderRadius: 16,
              border: `2px solid ${hov === i ? C.accent : C.cardBdr}`,
              padding: 28, cursor: "pointer", transition: "all .15s", textAlign: "center"
            }}>
            <p style={{ fontSize: 36, marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <o.Icon size={40} style={{ color: C.accent }} />
            </p>
            <p style={{ fontWeight: 700, color: C.txt, fontSize: 15, marginBottom: 6 }}>{o.label}</p>
            <p style={{ color: C.muted, fontSize: 12 }}>{o.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.cardBdr}`, marginBottom: 22 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: C.txt, marginBottom: 12 }}>Diet Preference</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {(Object.entries(DIET) as [DietKey, typeof DIET[DietKey]][]).filter(([k]) => k !== "All").map(([d, dm]) => {
            const on = prefDiet === d
            return (
              <button key={d} onClick={() => setPrefDiet(d)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 999,
                fontSize: 12.5, fontWeight: on ? 700 : 500,
                border: on ? "none" : `1px solid ${C.cardBdr}`,
                background: on ? C.purple : C.white, color: on ? "white" : C.txt,
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all .15s"
              }}>
                <dm.icon size={16} style={{ color: on ? "white" : dm.col }} />{d}
              </button>
            )
          })}
        </div>
      </div>
      <button
        onClick={handleGenerate}
        style={{
          background: C.accent, color: "white", padding: "12px 28px", borderRadius: 999,
          fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          boxShadow: "0 4px 14px rgba(198,160,246,0.45)"
        }}>
        <Sparkles size={16} /> Generate Meal Plan
      </button>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────────────────────
interface ProfileProps { user: UserData; plans: Plan[] }

function Profile({ user, plans }: ProfileProps) {
  const { signOut } = useAuth()
  const totalDays = plans.reduce((a, p) => a + p.days.length, 0)
  const diets = Array.from(new Set(plans.map(p => p.diet)))
  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.txt, marginBottom: 20 }}>Profile</h1>
      <div style={{
        background: C.white, borderRadius: 22, boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        padding: "22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 18
      }}>
        <div style={{ position: "relative" }}>
          <UserAvatar userData={user} size={68} fontSize={28} />
          <div style={{
            position: "absolute", bottom: -2, right: -2, width: 22, height: 22,
            borderRadius: 8, background: C.green, display: "flex", alignItems: "center",
            justifyContent: "center", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <span style={{ fontSize: 10, color: "white", fontWeight: 800 }}>✓</span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: C.txt, letterSpacing: "-0.01em" }}>{user.name}</p>
            <PlanBadge size="sm" showIcon={false} />
          </div>
          <p style={{ color: C.muted, fontSize: 13 }}>{user.email}</p>
          <p style={{ color: C.faint, fontSize: 11, marginTop: 3 }}>Member since {user.joined}</p>
        </div>
      </div>
      <div className="dash-stats-grid" style={{ marginBottom: 12 }}>
        {[
          { label: "Saved Plans", value: plans.length, Icon: ClipboardList },
          { label: "Days Planned", value: totalDays, Icon: CalendarDays },
          { label: "Diets Tried", value: diets.length, Icon: Sparkles },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 18, padding: "16px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.02)", textAlign: "center"
          }}>
            <div style={{ marginBottom: 6 }}>
              <s.Icon size={20} style={{ color: C.accentDark }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 24, color: C.txt, lineHeight: 1, letterSpacing: "-1px" }}>{s.value}</p>
            <p style={{ fontSize: 11, color: C.faint, marginTop: 4, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div style={{
        background: C.white, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        padding: "20px 24px", marginBottom: 12
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: C.txt, marginBottom: 14 }}>Account Details</p>
        {([{ label: "Full Name", value: user.name }, { label: "Email", value: user.email },
        { label: "Member Since", value: user.joined }] as { label: string; value: string }[]).map((f, i, arr) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.cardBdr}` : "none"
          }}>
            <span style={{ color: C.muted, fontSize: 13 }}>{f.label}</span>
            <span style={{ color: C.txt, fontSize: 13, fontWeight: 600 }}>{f.value}</span>
          </div>
        ))}
      </div>
      <div style={{
        background: C.white, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        padding: "20px 24px", marginBottom: 12
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: C.txt, marginBottom: 14 }}>Diets You've Tried</p>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {diets.map(d => {
            const dm = DIET[d]
            return (
              <span key={d} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 12, fontWeight: 600, color: dm.col, background: dm.bg,
                padding: "5px 12px", borderRadius: 999
              }}>
                <dm.icon size={14} style={{ color: dm.col }} />{d}
              </span>
            )
          })}
        </div>
      </div>
      <div style={{ background: "#FFF5F5", borderRadius: 16, border: "1px solid #FECACA", padding: "18px 20px" }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 2 }}>Sign Out</p>
        <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>You'll be returned to the Edible home page.</p>
        <button 
          onClick={signOut}
          style={{
            background: "#FEE2E2", border: "1px solid #FECACA", color: C.red,
            padding: "8px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif"
          }}
        >Sign Out</button>
      </div>
    </div>
  )
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────
export default function EdibleDashboard() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading, isInitialized, isLoading, signOut } = useAuth()
  const [view, setView] = useState<NavId>("overview")
  const [search, setSearch] = useState("")
  const [showDrop, setShowDrop] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [userData, setUserData] = useState<UserData>(DEFAULT_USER_DATA)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [pricingTrigger, setPricingTrigger] = useState('')

  const handleDeletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id))
    if (selectedPlanId === id) {
      setSelectedPlanId(null)
    }
  }

  // Fetch user data from Supabase on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || authLoading) return
      try {
        setIsLoadingUser(true)
        const profile = await getProfile()
        const avatarUrl = user.user_metadata?.avatar_url as string | undefined
        if (profile) {
          setUserData({
            name: user.user_metadata?.full_name || profile.name || user.email?.split('@')[0] || 'User',
            email: profile.email || user.email || '',
            joined: profile.joined || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            avatarUrl,
          })
        } else {
          setUserData({
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            avatarUrl: user.user_metadata?.avatar_url as string | undefined,
          })
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        setUserData({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avatarUrl: user.user_metadata?.avatar_url as string | undefined,
        })
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchUserData()
  }, [user, authLoading])

  // Fetch meal plans from Supabase on mount
  useEffect(() => {
    const fetchPlans = async () => {
      if (!user || authLoading) return
      try {
        setIsLoadingPlans(true)
        const mealPlans = await getUserMealPlans()

        // Transform Supabase meal plans to dashboard format
        // Supabase stores days as { day, Breakfast: Meal, Lunch: Meal, Dinner: Meal }
        // Dashboard expects     { day, B: MealSlot, L: MealSlot, D: MealSlot }
        const transformedPlans: Plan[] = mealPlans.map(mp => {
          const rawDays: any[] = mp.plan_data?.days || []
          const days: PlanDay[] = rawDays.map((d: any) => ({
            day: d.day || 'Day',
            B: { name: d.Breakfast?.title || d.B?.name || 'N/A', cal: d.Breakfast?.nutrition?.calories || d.B?.cal || 0, rawMeal: d.Breakfast || d.B?.rawMeal },
            L: { name: d.Lunch?.title || d.L?.name || 'N/A', cal: d.Lunch?.nutrition?.calories || d.L?.cal || 0, rawMeal: d.Lunch || d.L?.rawMeal },
            D: { name: d.Dinner?.title || d.D?.name || 'N/A', cal: d.Dinner?.nutrition?.calories || d.D?.cal || 0, rawMeal: d.Dinner || d.D?.rawMeal },
          }))
          return {
            id: mp.id,
            title: mp.title,
            diet: (mp.plan_data?.diet || 'Balanced') as DietKey,
            date: mp.created_at || new Date().toISOString(),
            days,
          }
        })

        setPlans(transformedPlans)
        if (transformedPlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(transformedPlans[0].id)
        }
      } catch (error) {
        console.error('Failed to load meal plans:', error)
        setPlans([]) // Show empty state, no mock data
      } finally {
        setIsLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [user, authLoading])

  // Fetch saved recipes from Supabase on mount
  useEffect(() => {
    const fetchSaved = async () => {
      if (!user || authLoading) return
      try {
        setIsLoadingSaved(true)
        const recipes = await getUserSavedRecipes()
        setSavedRecipes(recipes)
      } catch (error) {
        console.error('Failed to load saved recipes:', error)
      } finally {
        setIsLoadingSaved(false)
      }
    }
    fetchSaved()
  }, [user, authLoading])

  // Redirect if not authenticated (only after initialization)
  useEffect(() => {
    // Add a small grace period — auth state can flicker on first load
    // isLoading check prevents redirect during the initial auth resolution
    if (isInitialized && !isLoading && !user) {
      navigate('/')
    }
  }, [user, isInitialized, isLoading, navigate])

  const query = search.trim().toLowerCase()
  const showSearch = query.length > 1

  const matchedPlans = showSearch
    ? plans.filter(p => p.title.toLowerCase().includes(query) || p.diet.toLowerCase().includes(query))
    : []
  const userRecipes = extractRecipesFromPlans(plans)
  const matchedRecipes = showSearch
    ? userRecipes.filter(r => r.title.toLowerCase().includes(query) || r.type.toLowerCase().includes(query))
    : []

  const results = showSearch
    ? [
      ...matchedPlans.map(p => ({ type: "plan" as const, label: p.title, sub: `${p.diet} · ${p.days.length} days`, nav: "plans" as NavId })),
      ...matchedRecipes.map(r => ({ type: "recipe" as const, label: r.title, sub: `${r.type} · ${r.cal} kcal`, nav: "recipes" as NavId })),
    ]
    : []

  const go = (id: NavId) => {
    if (id === "logout") { signOut(); return }
    setView(id); setSearch(""); setShowDrop(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body,button,input{font-family:'Plus Jakarta Sans',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
        .dashboard-home-btn{transition:all .15s ease}
        .dashboard-home-btn:hover{
          background:rgba(181,141,245,0.14);
          transform:translateY(-1px);
          border-color:${C.accentDark};
        }
        .dash-planner-calories-card {
          background: ${C.white};
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          margin-bottom: 12px;
          text-align: center;
        }
        .dash-overview-calories-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .dash-day-btn {
          flex: 1 0 auto;
          min-width: 46px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 4px;
          border-radius: 16px;
          cursor: pointer;
          transition: all .15s;
        }
        .dash-day-strip {
          background: #FAF5FF;
          border-radius: 20px;
          padding: 10px 8px;
          border: 1px solid rgba(198,160,246,0.25);
          margin-bottom: 18px;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .dash-day-strip::-webkit-scrollbar {
          display: none;
        }
        .dash-planner-date-header {
          font-weight: 700;
          font-size: 14px;
          color: ${C.txt};
        }
        .dash-add-meal-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, ${C.accentDark}, ${C.accent});
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 14px rgba(198,160,246,0.4);
          transition: all .15s;
        }
        /* Mobile layout overrides */
        .desktop-sidebar { display: flex; }
        .mobile-bottom-nav { display: none; }
        .dashboard-main { padding: 16px 28px 32px 28px; flex: 1; overflow-y: auto; }
        .dash-header-search { flex: 1; max-width: 320px; min-width: 0; }
        .dash-stats-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .dash-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-planner-grid { display: grid; grid-template-columns: 1fr 250px; gap: 14px; }
        .dash-generate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-nav { 
            display: flex !important; position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
            border-top: 1px solid rgba(0,0,0,0.04); z-index: 1000;
            justify-content: space-around; padding: 10px 8px 20px 8px;
            box-shadow: 0 -8px 30px rgba(0,0,0,0.03);
          }
          .dashboard-main { padding: 14px 14px 88px 14px !important; }
          .dash-header-search { display: none; }
          .dash-stats-grid { grid-template-columns: repeat(3,1fr); gap: 8px; }
          .dash-two-col { grid-template-columns: 1fr !important; }
          .dash-planner-grid { grid-template-columns: 1fr !important; }
          .dash-generate-grid { grid-template-columns: 1fr !important; }
          .dash-header { padding: 0 12px !important; gap: 8px !important; }
          .dash-overview-card { padding: 18px 16px 24px !important; }
          .dash-stat-card { padding: 12px 14px !important; }
          .dash-stat-value { font-size: 22px !important; }
          .dash-meal-item { padding: 8px 0 !important; }
          .dash-plan-card { padding: 14px !important; }
          .dash-recipe-card { padding: 12px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dash-recipe-img { width: 100% !important; height: 100px !important; border-radius: 12px !important; }
          .dash-search-input { font-size: 12px !important; padding: 6px 10px !important; }
          .dash-home-btn { font-size: 11px !important; padding: 5px 10px !important; }
          .dash-planner-calories-card, .dash-calories-card {
            padding: 12px !important;
          }
        }
        @media (max-width: 500px) {
          .dash-overview-calories-row {
            flex-direction: row !important;
            align-items: center !important;
            text-align: left !important;
            gap: 14px !important;
          }
          .dash-overview-ring-wrapper {
            width: 90px !important;
            height: 90px !important;
            flex-shrink: 0 !important;
          }
          .dash-overview-calories-row > div {
            display: flex;
            flex-direction: column;
            align-items: flex-start !important;
          }
          .dash-overview-calories-row .macro-badges-container {
            justify-content: flex-start !important;
            gap: 4px !important;
          }
        }
        @media (max-width: 480px) {
          .dash-stats-grid { grid-template-columns: repeat(3,1fr); gap: 6px; }
          .dash-stat-value { font-size: 20px !important; }
          .dash-overview-title { font-size: 22px !important; }
          .dash-section-title { font-size: 18px !important; }
          .dash-card-title { font-size: 13px !important; }
          .dash-card-subtitle { font-size: 11px !important; }
          .dash-day-btn {
            border-radius: 10px !important;
            padding: 8px 2px !important;
            min-width: 40px !important;
          }
          .dash-day-strip {
            border-radius: 12px !important;
            padding: 8px 6px !important;
            margin-bottom: 12px !important;
            gap: 4px !important;
          }
          .dash-planner-date-header {
            font-size: 12px !important;
          }
          .dash-add-meal-btn {
            padding: 5px 8px !important;
            font-size: 11px !important;
            gap: 3px !important;
          }
        }
        @media (max-width: 380px) {
          .dash-stats-grid { grid-template-columns: repeat(3,1fr); gap: 4px; }
          .dash-stat-label { font-size: 9px !important; }
        }
      `}</style>
      <div style={{
        display: "flex", height: "100vh", overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans',sans-serif", background: C.bg
      }}>
        <Sidebar active={view} onNav={go} userData={userData} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <header className="dash-header" style={{
            position: "relative", zIndex: 50,
            height: 56, background: "rgba(245,243,239,0.92)", backdropFilter: "blur(10px)",
            borderBottom: "1px solid #EDE9E2", display: "flex", alignItems: "center",
            padding: "0 24px", gap: 12, flexShrink: 0
          }}>
            {/* Back to home */}
            <button
              className="dash-home-btn dashboard-home-btn"
              onClick={() => navigate("/")}
              style={{
                fontSize: 12, fontWeight: 600, color: C.muted, background: "transparent", border: `1px solid ${C.cardBdr}`,
                borderRadius: 8, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all .15s ease"
              }}
            >
              ← Home
            </button>
            <div className="dash-header-search" style={{ position: "relative" }}>
              <div className="dash-search-input" style={{
                display: "flex", alignItems: "center", gap: 8, background: C.white,
                borderRadius: 10, padding: "7px 12px",
                border: `1px solid ${showDrop && search ? C.accent : C.cardBdr}`
              }}>
                <Search size={13} style={{ color: C.faint, flexShrink: 0 }} />
                <input value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                  placeholder="Search plans and recipes…"
                  style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.txt, width: "100%" }} />
                {search && (
                  <button onClick={() => setSearch("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.faint, padding: 0, display: "flex" }}>
                    <X size={11} />
                  </button>
                )}
              </div>
              {showDrop && results.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: C.white, borderRadius: 12, border: `1px solid ${C.cardBdr}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden"
                }}>
                  {results.map((r, i) => (
                    <div key={i} onClick={() => { setShowDrop(false) }}
                      style={{
                        padding: "10px 14px", display: "flex", gap: 10, alignItems: "center",
                        cursor: "pointer", borderBottom: i < results.length - 1 ? `1px solid ${C.cardBdr}` : "none"
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F9F8F6"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 999,
                        background: "rgba(198,160,246,0.12)",
                        border: "1px solid rgba(198,160,246,0.22)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        {r.type === "plan" ? (
                          <ClipboardList size={14} style={{ color: C.accent }} />
                        ) : (
                          <UtensilsCrossed size={14} style={{ color: C.accent }} />
                        )}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{r.label}</p>
                        <p style={{ fontSize: 11, color: C.faint }}>{r.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showDrop && search.length > 1 && results.length === 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: C.white, borderRadius: 12, border: `1px solid ${C.cardBdr}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, padding: 16, textAlign: "center"
                }}>
                  <p style={{ fontSize: 13, color: C.faint }}>No results for "{search}"</p>
                </div>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <NotificationBell 
                plans={plans} 
                onNav={go} 
                onUpgrade={(trigger) => { setPricingTrigger(trigger); setPricingOpen(true) }}
              />
              <div onClick={() => go("profile")} style={{ cursor: "pointer" }}>
                <UserAvatar userData={userData} size={34} fontSize={14} />
              </div>
            </div>
          </header>
          <main className="dashboard-main" style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              {showSearch ? (
                <SearchResults plans={matchedPlans} recipes={matchedRecipes} query={search.trim()} />
              ) : (
                <>
                  {view === "overview" && (
                    <Overview 
                      plans={plans} 
                      onNav={go} 
                      userData={userData} 
                      onSelectPlan={setSelectedPlanId} 
                      selectedPlanId={selectedPlanId} 
                    />
                  )}
                  {view === "planner" && (
                    <MealPlanner
                      plans={plans}
                      selectedPlanId={selectedPlanId}
                      savedRecipes={savedRecipes.map(sr => ({
                        id: sr.id,
                        title: sr.recipe_title,
                        type: sr.meal_type,
                        time: sr.recipe_data?.totalTime || 0,
                        cal: sr.recipe_data?.nutrition?.calories || 0,
                        rawMeal: sr.recipe_data
                      }))}
                    />
                  )}
                  {view === "plans" && (
                    <SavedPlans 
                      plans={plans} 
                      expandedPlanId={selectedPlanId} 
                      onExpandPlan={setSelectedPlanId} 
                      onDeletePlan={handleDeletePlan}
                    />
                  )}
                  {view === "recipes" && (
                    <SavedRecipes 
                      recipes={savedRecipes.map(sr => ({
                        id: sr.id,
                        title: sr.recipe_title,
                        type: sr.meal_type,
                        time: sr.recipe_data?.totalTime || 0,
                        cal: sr.recipe_data?.nutrition?.calories || 0,
                        rawMeal: sr.recipe_data
                      }))} 
                    />
                  )}
                  {view === "generate" && <Generate />}
                  {view === "profile" && <Profile user={userData} plans={plans} />}
                </>
              )}
            </div>
          </main>
          
          <div className="mobile-bottom-nav">
            {[
              { id: "overview" as NavId, icon: LayoutDashboard, label: "Overview" },
              { id: "planner" as NavId, icon: Calendar, label: "Planner" },
              { id: "plans" as NavId, icon: BookmarkCheck, label: "Plans" },
              { id: "recipes" as NavId, icon: Heart, label: "Recipes" },
              { id: "generate" as NavId, icon: Sparkles, label: "Generate" }
            ].map(item => {
              const on = view === item.id
              return (
                <button key={item.id} onClick={() => go(item.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    background: "none", border: "none", color: on ? C.accentDark : C.faint,
                    transition: "color .15s ease", cursor: "pointer", width: 60
                  }}>
                  <div style={{
                    padding: "6px 14px", borderRadius: 16, background: on ? "rgba(198,160,246,0.15)" : "transparent",
                    transition: "all .2s cubic-bezier(0.2, 0.8, 0.2, 1)"
                  }}>
                    <item.icon size={20} style={{ transition: "color .2s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, color: on ? C.accentDark : C.muted }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        trigger={pricingTrigger}
      />
    </>
  )
}