import { createContext, useContext, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, role } = useAuth()
  const channelsRef = useRef([])

  useEffect(() => {
    if (!user) return

    // Clean up previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []

    if (role === 'intern') {
      // Listen for new task assignments
      const taskCh = supabase.channel(`intern-tasks-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'tasks',
          filter: `assigned_to=eq.${user.id}`
        }, (payload) => {
          toast(`📋 New task assigned: ${payload.new.title}`, {
            icon: '📋',
            style: { background: '#1B2A5C', color: '#fff' }
          })
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'submissions',
          filter: `intern_id=eq.${user.id}`
        }, (payload) => {
          if (payload.new.status === 'Approved') {
            toast.success(`✅ Submission approved! +${payload.new.points_awarded} pts`)
          } else if (payload.new.status === 'Needs Revision') {
            toast(`📝 Submission needs revision`, { icon: '📝' })
          }
        })
        .subscribe()

      channelsRef.current.push(taskCh)
    }

    if (role === 'admin') {
      // Live new applications
      const appCh = supabase.channel('admin-applications')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'applications'
        }, (payload) => {
          toast(`🆕 New application: ${payload.new.name}`, {
            icon: '🆕',
            style: { background: '#1B2A5C', color: '#fff' }
          })
        })
        .subscribe()

      channelsRef.current.push(appCh)
    }

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    }
  }, [user, role])

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
