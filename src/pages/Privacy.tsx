export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 7, 2026</p>
      
      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Who we are</h2>
          <p className="text-gray-600">Edible.io is an AI-powered meal planning app that turns your grocery receipts into personalized meal plans.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. What we collect</h2>
          <p className="text-gray-600">We collect your email address and name when you create an account, grocery items from receipts you upload, meal plans you generate and save, and anonymous usage data.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. How we use it</h2>
          <p className="text-gray-600">We use your data to generate meal plans, save your plans and recipes, process payments if you upgrade to Pro, and improve the app.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Third parties we use</h2>
          <p className="text-gray-600">Supabase stores your account data. Anthropic and Groq power the AI meal generation — your grocery items are sent to these services. Dodo Payments processes payments securely. PostHog collects anonymous usage analytics.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Your data rights</h2>
          <p className="text-gray-600">You can delete your account and all associated data at any time by emailing us. We don't sell your data to anyone, ever.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Contact</h2>
          <p className="text-gray-600">Questions? Email us at <a href="mailto:theketofeed.ceo@gmail.com" className="text-purple-600 hover:underline">theketofeed.ceo@gmail.com</a></p>
        </section>
      </div>
    </div>
  )
}
