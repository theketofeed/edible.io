import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 7, 2026</p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Using Edible</h2>
          <p className="text-gray-600">By using Edible you agree to these terms. You must be at least 13 years old to use this service. You are responsible for keeping your account credentials secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. What we provide</h2>
          <p className="text-gray-600">Edible provides AI-generated meal plans based on your grocery items. Meal plans are suggestions only — we are not nutritionists and nothing on this platform constitutes dietary or medical advice. Always consult a professional for specific dietary needs.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Free and Pro plans</h2>
          <p className="text-gray-600">The free plan includes 4 meal plan generations per month. Pro and Founding Member plans are paid subscriptions with additional features. Subscriptions are billed as described at checkout. You can cancel your Pro subscription at any time — you'll retain access until the end of your billing period. The Founding Member plan is a one-time payment with lifetime access.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Refunds</h2>
          <p className="text-gray-600">We offer refunds within 7 days of purchase if you're not satisfied. Contact us at theketofeed.ceo@gmail.com to request one.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Your content</h2>
          <p className="text-gray-600">You own the data you upload. By using Edible you grant us permission to process your grocery data to generate meal plans. We don't claim ownership of your content.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Limitations</h2>
          <p className="text-gray-600">Edible is provided as-is. We're not liable for any damages arising from use of the service. We may update or discontinue features at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Changes to these terms</h2>
          <p className="text-gray-600">We may update these terms from time to time. Continued use of Edible after changes means you accept the new terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact</h2>
          <p className="text-gray-600">Questions? Email us at <a href="mailto:theketofeed.ceo@gmail.com" className="text-purple-600 hover:underline">theketofeed.ceo@gmail.com</a></p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-200 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to homepage
        </Link>
      </div>
    </div>
  )
}
