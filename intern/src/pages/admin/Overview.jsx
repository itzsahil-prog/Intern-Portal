import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/utils'
import { StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import PageWrapper from '../../components/layout/PageWrapper'

const COLORS = ['#F26522', '#1B2A5C', '#4CAF50', '#9C27B0', '#2196F3', '#FF5722', '#607D8B']

export default function AdminOverview() {
  const [stats, setStats] = useState({ apps: 0, pending: 0, interns: 0, cohorts: 0, tasks: 0, subsToday: 0 })
  const [roleChart, setRoleChart] = useState([])
  const [statusChart, setStatusChart] = useState([])
  const [weeklyChart, setWeeklyChart] = useState([])
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [appsRes, internsRes, cohortsRes, tasksRes, subsRes] = await Promise.all([
      supabase.from('applications').select('id, name, role, status, created_at').order('created_at', { ascending: false }),
      supabase.from('interns').select('id', { count: 'exact', head: true }),
      supabase.from('cohorts').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).gte('submitted_at', today),
    ])

    const apps = appsRes.data || []
    const pending = apps.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length

    setStats({
      apps: apps.length,
      pending,
      interns: internsRes.count || 0,
      cohorts: cohortsRes.count || 0,
      tasks: tasksRes.count || 0,
      subsToday: subsRes.count || 0,
    })

    // Role distribution
    const roleCounts = apps.reduce((acc, a) => { acc[a.role] = (acc[a.role] || 0) + 1; return acc }, {})
    setRoleChart(Object.entries(roleCounts).map(([name, value]) => ({ name: name.replace(' Developer', '').replace(' Intern', ''), value })))

    // Status distribution
    const statusCounts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})
    setStatusChart(Object.entries(statusCounts).map(([name, value]) => ({ name, value })))

    // Weekly submissions (last 7 days)
    const { data: weekSubs } = await supabase.from('submissions').select('submitted_at').gte('submitted_at', new Date(Date.now() - 7 * 86400000).toISOString())
    const dayMap = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dayMap[d.toLocaleDateString('en', { weekday: 'short' })] = 0
    }
    ;(weekSubs || []).forEach(s => {
      const day = new Date(s.submitted_at).toLocaleDateString('en', { weekday: 'short' })
      if (dayMap[day] !== undefined) dayMap[day]++
    })
    setWeeklyChart(Object.entries(dayMap).map(([name, value]) => ({ name, value })))

    setRecentApps(apps.slice(0, 8))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // Live new applications
  useRealtime('applications', () => loadData(), { event: 'INSERT' })

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Overview</h1>
            <p className="text-gray-500 text-sm mt-0.5">Live dashboard — auto-refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Applications" value={stats.apps} icon="📝" color="navy" />
          <StatCard label="Pending Review" value={stats.pending} icon="⏳" color="orange" />
          <StatCard label="Active Interns" value={stats.interns} icon="👥" color="green" />
          <StatCard label="Cohorts Running" value={stats.cohorts} icon="🎓" color="purple" />
          <StatCard label="Tasks Assigned" value={stats.tasks} icon="📋" color="navy" />
          <StatCard label="Submissions Today" value={stats.subsToday} icon="📤" color="orange" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
            <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Applications by Role</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roleChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F26522" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Weekly Submissions</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklyChart}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#F26522" strokeWidth={2} dot={{ fill: '#F26522' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1B2A5C] font-heading">Recent Applications</h2>
            <a href="/admin/applications" className="text-xs text-[#F26522] hover:underline">View all →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="pb-2 font-semibold">Name</th>
                  <th className="pb-2 font-semibold">Role</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentApps.map(app => (
                  <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-[#1B2A5C]">{app.name}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{app.role}</td>
                    <td className="py-2.5"><StatusBadge status={app.status} /></td>
                    <td className="py-2.5 text-gray-400 text-xs">{timeAgo(app.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
