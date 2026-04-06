import { useState, useCallback } from 'react'
import { X, Check, Zap, Crown, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createCheckout } from '../lib/checkout'
import type { ProductType } from '../lib/checkout'

interface Props {
  isOpen: boolean
  onClose: () => void
  trigger?: string // what caused the modal to open e.g. "pdf_export"
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
    'Unlimited saved plans',
    'Unlimited saved recipes',
    'PDF export & print',
    'Chef tips on every recipe',
    'Full dashboard access',
    'Priority support'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-yellow-300" />
          <h2 className="text-2xl font-bold mb-2">Upgrade to Edible Pro</h2>
          <p className="text-purple-200 text-sm">
            {trigger === 'generation_limit' && "You've used your 3 free plans this month."}
            {trigger === 'pdf_export' && "PDF export is a Pro feature."}
            {trigger === 'chef_tips' && "Chef tips are a Pro feature."}
            {!trigger && "Unlock everything Edible has to offer."}
          </p>
        </div>

        <div className="p-8">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'annual' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Annual
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                billingCycle === 'annual' ? 'bg-yellow-300 text-yellow-900' : 'bg-green-100 text-green-700'
              }`}>
                Save 33%
              </span>
            </button>
          </div>

          {/* Plans grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            
            {/* Pro Plan */}
            <div className="border-2 border-purple-200 rounded-2xl p-6 relative">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900">Pro</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black text-gray-900">
                  {billingCycle === 'monthly' ? '$4.99' : '$3.33'}
                </span>
                <span className="text-gray-500 text-sm">/month</span>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-gray-400 mt-1">Billed as $40/year</p>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {proFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual')}
                disabled={!!loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-60"
              >
                {loading === 'pro_monthly' || loading === 'pro_annual'
                  ? 'Redirecting...'
                  : `Get Pro ${billingCycle === 'annual' ? '— $40/year' : '— $4.99/mo'}`
                }
              </button>
            </div>

            {/* Founding Member */}
            <div className="border-2 border-yellow-400 rounded-2xl p-6 relative bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
                  Limited — 100 spots
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1 mt-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                <h3 className="font-bold text-gray-900">Founding Member</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black text-gray-900">$79</span>
                <span className="text-gray-500 text-sm"> once</span>
                <p className="text-xs text-green-600 font-semibold mt-1">Pay once, Pro forever ✨</p>
              </div>
              <ul className="space-y-2 mb-6">
                {['Everything in Pro', 'Never pay again', 'Early adopter badge', 'Help shape the product', 'Lifetime updates'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade('founding')}
                disabled={!!loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl transition-all disabled:opacity-60"
              >
                {loading === 'founding' ? 'Redirecting...' : 'Claim Founding Spot — $79'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Secure payment via Dodo Payments · Cancel anytime · No hidden fees
          </p>
        </div>
      </div>
    </div>
  )
}
