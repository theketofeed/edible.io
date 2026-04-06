import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  useEffect(() => {
    // Refresh the user's profile to pick up their new plan
    refreshProfile()
    // Redirect to home after 3 seconds
    const timer = setTimeout(() => navigate('/'), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set! 🎉</h1>
        <p className="text-gray-600 mb-6">Welcome to Edible Pro. Your account has been upgraded.</p>
        <p className="text-sm text-gray-400">Redirecting you back to the app...</p>
      </div>
    </div>
  )
}
