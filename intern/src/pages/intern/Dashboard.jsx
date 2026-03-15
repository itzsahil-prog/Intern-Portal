import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import { formatDate, timeAgo, getBadge } from '../../lib/utils'
import { StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { SkeletonCard } from '../../components/ui/Skeleton'
import PageWrapper from '../../components/layout/PageWrapper'

export default function InternDashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ tasks: 0, completed: 0, daysLeft: 0, points: 0 })
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    if (!user) return
    const [tasksRes, subsRes, lbRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('due_date'),
      supabase.from('submissions').select('*, tasks(title)').eq('intern_id', user.id).order('submitted_at', { ascending: false }).limit(5),
      supabase.from('interns').select('id, name, points, role, avatar_url').order('points', { ascending: false }).limit(10),
    ])

    const allTasks = tasksRes.data || []
    const completed = allTasks.filter(t => t.status === 'Done').length

    // Days remaining in cohort
    let daysLeft = 0
    if (profile?.cohort_id) {
      const { data: cohort } = await supabase.from('cohorts').select('end_date').eq('id', profile.cohort_id).single()
      if (cohort) {
        daysLeft = Math.max(0, Math.ceil((new Date(cohort.end_date) - new Date()) / 86400000))
      }
    }

    setStats({ tasks: allTasks.length, completed, daysLeft, points: profile?.points || 0 })
    setTasks(allTasks.slice(0, 5))
    setSubmissions(subsRes.data || [])
    setLeaderboard(lbRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [user, profile])

  // Real-time task updates
  useRealtime('tasks', (payload) => {
    if (payload.new?.assigned_to === user?.id) {
      setTasks(prev => {
        const exists = prev.find(t => t.id === payload.new.id)
        return exists ? prev.map(t => t.id === payload.new.id ? payload.new : t) : [payload.new, ...prev]
      })
      setStats(s => ({ ...s, tasks: s.tasks + (payload.eventType === 'INSERT' ? 1 : 0) }))
    }
  }, { filter: `assigned_to=eq.${user?.id}` })

  // Real-time points
  useRealtime('interns', (payload) => {
    if (payload.new?.id === user?.id) {
      setStats(s => ({ ...s, points: payload.new.points }))
    }
  }, { event: 'UPDATE', filter: `id=eq.${user?.id}` })

  const badge = getBadge(stats.points)
  const myRank = leaderboard.findIndex(i => i.id === user?.id) + 1

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">
              Welcome back, {profile?.name?.split(' ')[0] || 'Intern'} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{profile?.role} · {badge.emoji} {badge.label}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#F26522]/10 border border-[#F26522]/20 rounded-xl px-4 py-2">
            <span className="text-[#F26522] font-bold text-lg">{stats.points}</span>
            <span className="text-sm text-gray-500">points</span>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tasks Assigned" value={stats.tasks} icon="📋" color="navy" />
            <StatCard label="Tasks Completed" value={stats.completed} icon="✅" color="green" />
            <StatCard label="Days Remaining" value={stats.daysLeft} icon="📅" color="orange" />
            <StatCard label="My Points" value={stats.points} icon="⭐" color="purple" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A5C] font-heading">Recent Tasks</h2>
              <a href="/intern/tasks" className="text-xs text-[#F26522] hover:underline">View all →</a>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No tasks assigned yet</p>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 bg-[#E8EDF5] rounded-xl">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1B2A5C] truncate">{task.title}</p>
                      <p className="text-xs text-gray-400">Due: {formatDate(task.due_date)}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard widget */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A5C] font-heading">🏆 Leaderboard</h2>
              {myRank > 0 && <span className="text-xs text-[#F26522] font-semibold">You: #{myRank}</span>}
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((intern, i) => {
                const isMe = intern.id === user?.id
                return (
                  <div key={intern.id} className={`flex items-center gap-3 p-2 rounded-xl ${isMe ? 'bg-[#F26522]/10 border border-[#F26522]/20' : ''}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#1B2A5C] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                      {intern.avatar_url ? <img src={intern.avatar_url} alt="" className="w-full h-full object-cover" /> : intern.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isMe ? 'text-[#F26522]' : 'text-[#1B2A5C]'}`}>{isMe ? 'You' : intern.name}</p>
                    </div>
                    <span className="text-xs font-bold text-[#F26522]">{intern.points}pts</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Recent Submissions</h2>
            <div className="space-y-2">
              {submissions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-[#E8EDF5] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#1B2A5C]">{sub.tasks?.title || 'Task'}</p>
                    <p className="text-xs text-gray-400">{timeAgo(sub.submitted_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.points_awarded && <span className="text-xs font-bold text-[#F26522]">+{sub.points_awarded}pts</span>}
                    <StatusBadge status={sub.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
