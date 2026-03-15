import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await signIn(email, password)
      const role = user?.user_metadata?.role
      if (role === 'admin') {
        navigate('/admin/overview')
      } else {
        navigate('/intern/dashboard')
      }
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { toast.error('Enter your email first'); return }
    const { supabase } = await import('../../lib/supabase')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) toast.error(error.message)
    else toast.success('Password reset email sent!')
  }

  return (
    <div className="min-h-screen bg-[#1B2A5C] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F26522] rounded-2xl flex items-center justify-center font-bold text-3xl text-white font-heading mx-auto mb-4">V</div>
          <h1 className="text-2xl font-bold text-white font-heading">Intern Portal</h1>
          <p className="text-white/60 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email / Login ID</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                type="text" required autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                placeholder="john.doe@veloxcode"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input
                value={password} onChange={e => setPassword(e.target.value)}
                type="password" required autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleForgotPassword} className="text-xs text-[#F26522] hover:underline">Forgot password?</button>
            </div>
            <Button type="submit" loading={loading} className="w-full">Sign In</Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <Link to="/" className="block text-sm text-[#F26522] hover:underline">Apply for Internship →</Link>
            <Link to="/admin/login" className="block text-xs text-gray-400 hover:text-gray-600">Admin Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
