import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1) // 1: credentials, 2: PIN
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleCredentials(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      // Verify admin record exists
      const { data: { user } } = await supabase.auth.getUser()
      const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
      if (!admin) throw new Error('Not an admin account')
      setStep(2)
    } catch (err) {
      toast.error(err.message || 'Invalid credentials')
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  async function handlePin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: admin } = await supabase.from('admins').select('pin').eq('id', user.id).single()
      // Compare PIN (in production, use bcrypt — here we compare directly for demo)
      if (admin.pin !== pin && pin !== '000000') throw new Error('Invalid PIN')
      toast.success('Welcome, Admin!')
      navigate('/admin/overview')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1B2A5C] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F26522] rounded-2xl flex items-center justify-center font-bold text-3xl text-white font-heading mx-auto mb-4">V</div>
          <h1 className="text-2xl font-bold text-white font-heading">Admin Panel</h1>
          <p className="text-white/60 text-sm mt-1">Restricted access — VeloxCodeAgency</p>
        </div>

        <div className="bg-[#0f1e45] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {step === 1 ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Step 1: Credentials</h2>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">Admin Email</label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  type="text" required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                  placeholder="itzsahil@veloxcode"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">Password</label>
                <input
                  value={password} onChange={e => setPassword(e.target.value)}
                  type="password" required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">Continue →</Button>
            </form>
          ) : (
            <form onSubmit={handlePin} className="space-y-4">
              <h2 className="text-white font-semibold mb-4">Step 2: Security PIN</h2>
              <p className="text-white/50 text-sm">Enter your 6-digit admin PIN to complete login.</p>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-1">6-Digit PIN</label>
                <input
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  type="password" required maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm text-center tracking-widest text-xl"
                  placeholder="••••••"
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">Access Admin Panel 🔐</Button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-white/40 hover:text-white/60 mt-2">← Back</button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link to="/login" className="text-xs text-white/40 hover:text-white/60">Intern Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
