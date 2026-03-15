import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function InternRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-[#F26522] border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'intern') return <Navigate to="/admin/overview" replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-[#F26522] border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (role !== 'admin') return <Navigate to="/intern/dashboard" replace />
  return children
}
