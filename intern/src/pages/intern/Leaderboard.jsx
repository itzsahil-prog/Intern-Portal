import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import { getBadge } from '../../lib/utils'
import PageWrapper from '../../components/layout/PageWrapper'

export default function Leaderboard() {
  const { user } = useAuth()
  const [interns, setInterns] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadLeaderboard() {
    const { data } = await supabase.from('interns').select('id, name, points, role, avatar_url, cohort_id').order('points', { ascending: false })
    setInterns(data || [])
    setLoading(false)
  }

  useEffect(() => { loadLeaderboard() }, [])

  useRealtime('interns', () => loadLeaderboard(), { event: 'UPDATE' })

  const myRank = interns.findIndex(i => i.id === user?.id) + 1

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">🏆 Leaderboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live rankings — updates in real time</p>
          {myRank > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#F26522]/10 border border-[#F26522]/20 rounded-xl px-4 py-2 mt-3">
              <span className="text-sm text-gray-600">Your rank:</span>
              <span className="font-bold text-[#F26522] text-lg">#{myRank}</span>
            </div>
          )}
        </div>

        {/* Top 3 podium */}
        {!loading && interns.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-6">
            {[interns[1], interns[0], interns[2]].map((intern, i) => {
              const rank = i === 1 ? 1 : i === 0 ? 2 : 3
              const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' }
              const colors = { 1: 'bg-yellow-400', 2: 'bg-gray-300', 3: 'bg-orange-300' }
              const emojis = { 1: '👑', 2: '🥈', 3: '🥉' }
              return (
                <motion.div key={intern.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full ${colors[rank]} flex items-center justify-center font-bold text-white text-lg overflow-hidden`}>
                    {intern.avatar_url ? <img src={intern.avatar_url} alt="" className="w-full h-full object-cover" /> : intern.name?.[0]}
                  </div>
                  <p className="text-xs font-bold text-[#1B2A5C] text-center max-w-16 truncate">{intern.id === user?.id ? 'You' : intern.name}</p>
                  <p className="text-xs font-bold text-[#F26522]">{intern.points}pts</p>
                  <div className={`w-16 ${heights[rank]} ${colors[rank]} rounded-t-xl flex items-start justify-center pt-2`}>
                    <span className="text-xl">{emojis[rank]}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Full list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {interns.map((intern, i) => {
                const isMe = intern.id === user?.id
                const badge = getBadge(intern.points)
                return (
                  <motion.div key={intern.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-4 p-4 transition-colors ${isMe ? 'bg-[#F26522]/5 border-l-4 border-[#F26522]' : 'hover:bg-gray-50'}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-[#E8EDF5] text-[#1B2A5C]'}`}>
                      {i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-[#1B2A5C] flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                      {intern.avatar_url ? <img src={intern.avatar_url} alt="" className="w-full h-full object-cover" /> : intern.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${isMe ? 'text-[#F26522]' : 'text-[#1B2A5C]'}`}>
                        {isMe ? `${intern.name} (You)` : intern.name}
                      </p>
                      <p className="text-xs text-gray-400">{intern.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#F26522]">{intern.points} pts</p>
                      <p className={`text-xs ${badge.color}`}>{badge.emoji} {badge.label}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
