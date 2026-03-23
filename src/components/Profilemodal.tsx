import { useEffect, useRef, useState } from 'react'
import { X, UtensilsCrossed, Trash2, Calendar, ChevronRight, LogOut, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserMealPlans, deleteMealPlan, type MealPlan } from '../lib/db'
import { supabase } from '../lib/supabase'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load meal plans when modal opens
  useEffect(() => {
    if (!isOpen || !user) return
    setLoading(true)
    getUserMealPlans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen, user])

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteMealPlan(id)
      setPlans(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onClose()
  }

  if (!isOpen) return null

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'there'

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  const initials = displayName.charAt(0).toUpperCase()

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })

  // Extract a brief preview from plan_data
  const getPlanPreview = (plan: MealPlan): string => {
    try {
      const days = plan.plan_data?.days
      if (!days?.length) return 'Meal plan'
      const first = days[0]
      const meal = first?.Breakfast?.name || first?.Lunch?.name || first?.Dinner?.name
      return meal ? `Starts with ${meal}` : `${days.length} day plan`
    } catch {
      return 'Meal plan'
    }
  }

  const getDayCount = (plan: MealPlan): number => {
    try { return plan.plan_data?.days?.length ?? 0 } catch { return 0 }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .profile-modal { font-family: 'DM Sans', sans-serif; animation: slideUp 0.25s ease; }
        .profile-heading { font-family: 'Playfair Display', serif; }
        .plan-card:hover .plan-chevron { transform: translateX(3px); }
        .plan-chevron { transition: transform 0.2s ease; }
      `}</style>

      <div className="profile-modal w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header banner ── */}
        <div
          className="relative px-8 pt-10 pb-16 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 40%, #1a1060 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: '#C6A0F6', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-10 w-24 h-24 rounded-full opacity-10" style={{ background: '#a78bfa', transform: 'translateY(50%)' }} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 relative z-10">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#C6A0F6] flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-white/20">
                {initials}
              </div>
            )}
            <div>
              <h2 className="profile-heading text-2xl font-bold text-white leading-tight">
                Hey, {displayName} 👋
              </h2>
              <p className="text-sm text-purple-200 mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-6 relative z-10">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <p className="text-xs text-purple-200">Meal Plans</p>
              <p className="text-xl font-bold text-white">{plans.length}</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <p className="text-xs text-purple-200">Total Days Planned</p>
              <p className="text-xl font-bold text-white">
                {plans.reduce((acc, p) => acc + getDayCount(p), 0)}
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/10">
              <p className="text-xs text-purple-200">Member since</p>
              <p className="text-xl font-bold text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Meal plans list ── */}
        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="profile-heading text-xl font-bold text-gray-900">Saved Meal Plans</h3>
            {plans.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader className="w-6 h-6 animate-spin mb-3" />
              <p className="text-sm">Loading your plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-7 h-7 text-purple-300" />
              </div>
              <p className="text-gray-500 font-medium">No meal plans yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload a grocery receipt to generate your first plan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="plan-card group border border-gray-100 rounded-2xl overflow-hidden hover:border-purple-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                >
                  {/* Plan header row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-4.5 h-4.5 text-purple-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{plan.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(plan.created_at)}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{getDayCount(plan)} days</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400 truncate">{getPlanPreview(plan)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(plan.id, e)}
                        disabled={deletingId === plan.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {deletingId === plan.id
                          ? <Loader className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <ChevronRight className={`plan-chevron w-4 h-4 text-gray-300 transition-transform duration-200 ${expandedId === plan.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded day breakdown */}
                  {expandedId === plan.id && (
                    <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/50">
                      <div className="grid grid-cols-1 gap-2">
                        {(plan.plan_data?.days ?? []).slice(0, 5).map((day: any, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="text-xs font-semibold text-purple-400 w-16 flex-shrink-0 pt-0.5">{day.day ?? `Day ${i + 1}`}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {['Breakfast', 'Lunch', 'Dinner'].map((m) => day[m]?.name && (
                                <span key={m} className="text-xs bg-white border border-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full shadow-sm">
                                  {day[m].name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}