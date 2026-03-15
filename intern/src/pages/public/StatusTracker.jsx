import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import Button from '../../components/ui/Button'
import { Link } from 'react-router-dom'

const PIPELINE = ['Submitted', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Accepted']

export default function StatusTracker() {
  const [email, setEmail] = useState('')
  const [ref, setRef] = useState('')
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleTrack(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setApp(null)
    const { data, error: err } = await supabase
      .from('applications')
      .select('*')
      .eq('email', email.trim())
      .eq('reference_number', ref.trim().toUpperCase())
      .maybeSingle()
    setLoading(false)
    if (err || !data) {
      setError('No application found. Check your email and reference number.')
    } else {
      setApp(data)
    }
  }

  // Real-time updates
  useEffect(() => {
    if (!app) return
    const ch = supabase.channel(`app-status-${app.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'applications',
        filter: `id=eq.${app.id}`
      }, (payload) => setApp(payload.new))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [app?.id])

  const currentStep = app ? PIPELINE.indexOf(app.status) : -1
  const isRejected = app?.status === 'Rejected'

  return (
    <div className="min-h-screen bg-[#1B2A5C] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F26522] rounded-xl flex items-center justify-center font-bold text-white font-heading">V</div>
          <span className="font-bold text-white font-heading">VeloxCodeAgency</span>
        </Link>
        <Link to="/login" className="text-sm text-white/70 hover:text-white">Intern Login →</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold font-heading text-white text-center mb-2">Track Your Application</h1>
            <p className="text-white/60 text-center mb-8 text-sm">Enter your email and reference number to check your status</p>

            <div className="bg-white rounded-2xl p-6 shadow-2xl mb-6">
              <form onSubmit={handleTrack} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    type="email" required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reference Number</label>
                  <input
                    value={ref} onChange={e => setRef(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm uppercase"
                    placeholder="VCA-2025-XXXXX"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" loading={loading} className="w-full">Track Application</Button>
              </form>
            </div>

            {app && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-[#1B2A5C] font-heading">{app.name}</h2>
                    <p className="text-sm text-gray-500">{app.role} · {app.reference_number}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${isRejected ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {app.status}
                  </div>
                </div>

                {isRejected ? (
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">😔</div>
                    <p className="text-red-700 font-semibold">Application Not Selected</p>
                    <p className="text-sm text-red-500 mt-1">Thank you for applying. We encourage you to apply again in the next cohort.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {PIPELINE.map((s, i) => {
                      const done = i <= currentStep
                      const active = i === currentStep
                      return (
                        <div key={s} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-[#F26522]/10 border border-[#F26522]/30' : done ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? 'bg-[#F26522] text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span className={`text-sm font-medium ${active ? 'text-[#F26522]' : done ? 'text-green-700' : 'text-gray-400'}`}>{s}</span>
                          {active && <span className="ml-auto text-xs text-[#F26522] font-semibold animate-pulse">Current</span>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {app.status === 'Accepted' && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-700 font-bold text-sm">🎉 Congratulations! Check your WhatsApp for login credentials.</p>
                    <p className="text-xs text-green-600 mt-1">Applied: {formatDate(app.created_at)}</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
