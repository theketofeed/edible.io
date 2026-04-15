import { useState, useCallback } from 'react'
import { X, Check, Zap, Crown, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createCheckout } from '../lib/checkout'
import type { ProductType } from '../lib/checkout'

interface Props {
  isOpen: boolean
  onClose: () => void
  trigger?: string
}

export default function PricingModal({ isOpen, onClose, trigger }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<ProductType | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  const handleUpgrade = useCallback(async (productType: ProductType) => {
    if (!user) return
    setLoading(productType)
    const result = await createCheckout(productType, user.id, user.email!)
    if (result.success && result.url) {
      window.location.href = result.url
    } else {
      alert(result.error || 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }, [user])

  if (!isOpen) return null

  const proFeatures = [
    'Unlimited meal plan generations',
    'Unlimited saved plans & recipes',
    'PDF export & print',
    'Full recipe detail (Chef tips + Cooking Mode)',
    'Priority support',
  ]

  const triggerMessage = {
    generation_limit: "You've used all 4 of your free meal plan generations this month. Upgrade to Pro for unlimited plans, every month.",
    pdf_export: "PDF export is a Pro feature. Upgrade to download, print, and share beautifully formatted meal plans anytime.",
    chef_tips: "Chef tips are a Pro feature. Unlock expert cooking techniques and insider tips to take every meal to the next level.",
    recipe_limit: "You've hit the 10-recipe limit on the free plan. Upgrade to Pro for unlimited recipe saving so you never lose a meal you love.",
  }[trigger || ''] || "Upgrade to Pro and unlock the full Edible experience — unlimited plans, chef tips, PDF exports, and more."

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-[32px] overflow-hidden my-auto"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/8 transition-colors"
          style={{ background: 'rgba(0,0,0,0.06)' }}
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="px-8 pt-10 pb-8 text-center" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wide mb-4">
            <Zap className="w-3 h-3" />
            Upgrade to Pro
          </div>
          <p className="text-gray-500 text-sm">{triggerMessage}</p>
        </div>

        <div className="flex items-center justify-center gap-1 px-8 pt-6 pb-2">
          <div className="flex items-center p-1 bg-gray-100 rounded-full gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Annual
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">-33%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-6 pb-8 pt-4">
          {/* Pro */}
          <div className="rounded-2xl border-2 border-gray-100 p-5 flex flex-col hover:border-purple-200 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="font-bold text-gray-900 text-sm">Pro</span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-black text-gray-900">{billingCycle === 'monthly' ? '$4.99' : '$3.33'}</span>
              <span className="text-gray-400 text-xs ml-1">/mo</span>
            </div>
            {billingCycle === 'annual' && <p className="text-xs text-gray-400 mb-4">Billed as $40/year</p>}
            <ul className="space-y-2 mb-5 flex-1 mt-3">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual')}
              disabled={!!loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 active:scale-[0.98]"
            >
              {loading === 'pro_monthly' || loading === 'pro_annual' ? 'Redirecting...' : billingCycle === 'annual' ? 'Get Pro — $40/yr' : 'Get Pro — $4.99/mo'}
            </button>
          </div>

          {/* Founding */}
          <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 100%)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 pointer-events-none" style={{ background: '#C6A0F6', filter: 'blur(30px)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute -top-px left-0 right-0 flex justify-center">
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-0.5 rounded-b-lg uppercase tracking-wide">100 spots only</span>
            </div>
            <div className="flex items-center gap-2 mb-3 mt-3">
              <div className="w-7 h-7 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <span className="font-bold text-white text-sm">Founding</span>
            </div>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">$59</span>
              <span className="text-white/40 text-xs line-through">$75</span>
            </div>
            <p className="text-yellow-400 text-xs font-semibold mb-1">Pay once. Use forever.</p>
            <p className="text-white/40 text-[10px] mb-3">Early adopter discount — limited time</p>
            <ul className="space-y-2 mb-5 flex-1">
              {[
                'Everything in Pro — forever',
                'Never pay again',
                'Early adopter badge',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <Check className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade('founding')}
              disabled={!!loading}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-sm font-black rounded-xl transition-all disabled:opacity-60 active:scale-[0.98]"
            >
              {loading === 'founding' ? 'Redirecting...' : 'Claim Spot — $59'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          Secure payment via Dodo Payments · Cancel anytime
        </p>
      </div>
    </div>
  )
}