import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import ApplicationForm from './ApplicationForm'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  const [appCount, setAppCount] = useState(0)
  const formRef = useRef(null)

  useEffect(() => {
    supabase.from('applications').select('*', { count: 'exact', head: true })
      .then(({ count }) => setAppCount(count || 0))

    const ch = supabase.channel('landing-apps')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, () => {
        setAppCount(c => c + 1)
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  return (
    <div className="min-h-screen bg-[#1B2A5C] text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F26522] rounded-xl flex items-center justify-center font-bold text-xl font-heading">V</div>
          <span className="font-bold text-lg font-heading">VeloxCodeAgency</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/status" className="text-sm text-white/70 hover:text-white transition-colors">Track Application</Link>
          <Link to="/login" className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">Intern Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-24 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F26522]/20 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 bg-[#F26522]/20 border border-[#F26522]/30 rounded-full px-4 py-1.5 text-sm text-[#F26522] font-medium mb-6">
            <span className="w-2 h-2 bg-[#F26522] rounded-full animate-pulse" />
            Applications Open — Join Cohort 2025
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold font-heading leading-tight mb-4">
            Build Fast.<br />
            <span className="text-[#F26522]">Learn Faster.</span>
          </h1>

          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Join VeloxCodeAgency's internship program and work on real-world projects with industry mentors. Fast-track your career in tech.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#F26522] hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg shadow-orange-500/30 transition-colors"
            >
              Apply Now →
            </motion.button>
            <Link to="/status" className="text-white/70 hover:text-white font-medium px-6 py-4 rounded-xl border border-white/20 hover:border-white/40 transition-all">
              Track My Application
            </Link>
          </div>

          {/* Live counter */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-5 py-3 text-sm"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/70">Live:</span>
            <span className="font-bold text-white text-lg">{appCount}</span>
            <span className="text-white/70">applications received this cohort</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Interns Placed', value: '200+', icon: '👥' },
            { label: 'Partner Companies', value: '50+', icon: '🏢' },
            { label: 'Projects Shipped', value: '500+', icon: '🚀' },
            { label: 'Avg. Rating', value: '4.9★', icon: '⭐' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.3 }}
              className="bg-white/10 backdrop-blur rounded-xl p-5 text-center"
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold font-heading">{s.value}</div>
              <div className="text-sm text-white/60">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold font-heading text-center mb-8">Open Roles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'Project Manager', 'DevOps Intern', 'QA Tester', 'Mobile Developer'].map(role => (
            <div key={role} className="bg-white/10 hover:bg-[#F26522]/20 border border-white/10 hover:border-[#F26522]/40 rounded-xl p-4 text-center text-sm font-medium transition-all cursor-pointer">
              {role}
            </div>
          ))}
        </div>
      </section>

      {/* Application Form */}
      <section ref={formRef} className="px-6 py-16 max-w-3xl mx-auto" id="apply">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold font-heading mb-3">Apply for Internship</h2>
          <p className="text-white/60">Fill out the form below. We review every application personally.</p>
        </div>
        <ApplicationForm />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} VeloxCodeAgency. All rights reserved.
      </footer>
    </div>
  )
}
