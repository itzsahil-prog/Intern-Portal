import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/utils'
import PageWrapper from '../../components/layout/PageWrapper'

export default function InternMessages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadMessages() {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`receiver_id.eq.${user.id},is_announcement.eq.true`)
      .order('created_at', { ascending: false })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { if (user) loadMessages() }, [user])

  useRealtime('messages', () => loadMessages())

  async function markRead(id) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read_at: new Date().toISOString() } : m))
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Messages</h1>
          <p className="text-gray-500 text-sm mt-0.5">Announcements and direct messages</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💬</div>
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => !msg.read_at && markRead(msg.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${!msg.read_at ? 'bg-[#F26522]/5 border-[#F26522]/20' : 'bg-white border-gray-100'} hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {msg.is_announcement && <span className="text-xs bg-[#1B2A5C] text-white px-2 py-0.5 rounded-full font-semibold">📢 Announcement</span>}
                    {!msg.read_at && <span className="w-2 h-2 bg-[#F26522] rounded-full flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(msg.created_at)}</span>
                </div>
                <p className="text-sm text-gray-800 mt-2 leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
