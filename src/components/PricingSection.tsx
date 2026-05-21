import { memo } from 'react'
import posthog from 'posthog-js'
import { Check, Zap, Crown, Shield, Sparkles, Lock } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { createCheckout } from '../lib/checkout'
import type { ProductType } from '../lib/checkout'

interface PricingSectionProps {
  onAuthRequired?: () => void
}

const PricingSection = memo(function PricingSection({ onAuthRequired }: PricingSectionProps) {
  const { user } = useAuth()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState<ProductType | null>(null)

  const handleUpgrade = useCallback(async (productType: ProductType) => {
    if (!user) {
      onAuthRequired?.()
      return
    }
    posthog.capture('upgrade_clicked', { trigger: 'pricing_section', plan: productType })
    setLoading(productType)
    const result = await createCheckout(productType, user.id, user.email!)
    if (result.success && result.url) {
      window.location.href = result.url
    } else {
      alert(result.error || 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }, [user, onAuthRequired])

  const proFeatures = [
    'Unlimited meal plan generations',
    'Unlimited saved plans & recipes',
    'PDF export & print',
    'Full recipe detail (Chef tips + Cooking Mode)',
    'Priority support',
  ]

  const freeFeatures = [
    { text: '4 meal plans per month', locked: false },
    { text: '4 saved meal plans', locked: false },
    { text: '10 saved recipes', locked: false },
    { text: 'Basic recipe view + cooking mode', locked: false },
    { text: 'PDF export & print', locked: true },
    { text: 'Chef tips on every recipe', locked: true },
  ]

  return (
    <section id="pricing" className="py-16 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide mb-5 border border-purple-100">
            <Sparkles className="w-3 h-3" />
            Simple Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
            Start free. Upgrade when <span className="text-purple-600">you're hooked.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto">
            No credit card required to get started. Upgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8 md:mb-10">
          <div className="flex items-center p-1 bg-gray-100 rounded-full gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annual
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Save 33%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards — stacked on mobile, 3 cols on md+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 items-stretch">

          {/* Free */}
          <div className="rounded-3xl border-2 border-gray-100 p-6 sm:p-7 flex flex-col bg-white hover:border-gray-200 transition-colors">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-500" />
                </div>
                <span className="font-bold text-gray-700">Free</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-gray-900">$0</span>
                <span className="text-gray-400 text-sm">/forever</span>
              </div>
              <p className="text-sm text-gray-400">No credit card required</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((f, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-sm ${f.locked ? 'text-gray-400' : 'text-gray-600'}`}>
                  {f.locked ? (
                    <Lock className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  )}
                  {f.text}
                </li>
              ))}
            </ul>

            <button
              onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full py-3 border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro — highlighted */}
          <div className="rounded-3xl p-6 sm:p-7 flex flex-col relative overflow-hidden bg-gradient-to-b from-purple-600 to-purple-700 shadow-2xl shadow-purple-500/20 md:scale-[1.02]">
            {/* Most Popular badge */}
            <div className="absolute -top-px left-0 right-0 flex justify-center">
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-4 py-1 rounded-b-xl uppercase tracking-wide">
                Most Popular
              </span>
            </div>

            <div className="mb-6 mt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Pro</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-white">
                  {billingCycle === 'monthly' ? '$4.99' : '$3.33'}
                </span>
                <span className="text-white/60 text-sm">/mo</span>
              </div>
              {billingCycle === 'annual'
                ? <p className="text-white/60 text-sm">Billed as $40/year</p>
                : <p className="text-white/60 text-sm">Billed monthly</p>
              }
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual')}
              disabled={!!loading}
              className="w-full py-3 bg-white hover:bg-purple-50 text-purple-700 text-sm font-black rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] shadow-lg"
            >
              {loading === 'pro_monthly' || loading === 'pro_annual'
                ? 'Redirecting...'
                : billingCycle === 'annual' ? 'Get Pro — $40/yr' : 'Get Pro — $4.99/mo'}
            </button>
          </div>

          {/* Founding */}
          <div className="rounded-3xl p-6 sm:p-7 flex flex-col relative overflow-hidden sm:col-span-2 md:col-span-1" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 100%)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: '#C6A0F6', filter: 'blur(40px)' }} />

            <div className="absolute -top-px left-0 right-0 flex justify-center">
              <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-4 py-1 rounded-b-xl uppercase tracking-wide">
                Limited — 100 spots
              </span>
            </div>

            <div className="mb-6 mt-2 relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="font-bold text-white">Founding Member</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-white">$59</span>
                <span className="text-white/40 text-xs line-through">$75</span>
              </div>
              <p className="text-yellow-400 text-sm font-semibold">Pay once. Use forever.</p>
              <p className="text-white/40 text-xs mt-0.5">Early adopter discount</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 relative z-10">
              {[
                'Everything in Pro — forever',
                'Never pay again',
                'Early adopter badge',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade('founding')}
              disabled={!!loading}
              className="relative z-10 w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-sm font-black rounded-xl transition-all disabled:opacity-60 active:scale-[0.98]"
            >
              {loading === 'founding' ? 'Redirecting...' : 'Claim Spot — $59'}
            </button>
          </div>

        </div>

        {/* Trust line */}
        <div className="mt-8 md:mt-10 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400 text-center px-4">
          <Shield className="w-4 h-4 flex-shrink-0" />
          Secure payment via Dodo Payments · Cancel Pro anytime · Founding plan is a one-time charge
        </div>

      </div>
    </section>
  )
})

export default PricingSection
