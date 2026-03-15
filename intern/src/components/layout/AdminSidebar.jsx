import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin/overview', icon: '📊', label: 'Overview' },
  { to: '/admin/applications', icon: '📝', label: 'Applications' },
  { to: '/admin/interns', icon: '👥', label: 'Interns' },
  { to: '/admin/cohorts', icon: '🎓', label: 'Cohorts' },
  { to: '/admin/tasks', icon: '📋', label: 'Tasks' },
  { to: '/admin/submissions', icon: '📤', label: 'Submissions' },
  { to: '/admin/resources', icon: '📚', label: 'Resources' },
  { to: '/admin/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/admin/messages', icon: '💬', label: 'Messages' },
  { to: '/admin/reports', icon: '📈', label: 'Reports' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
  { to: '/admin/automation-logs', icon: '🤖', label: 'Automation Logs' },
]

export default function AdminSidebar({ open, onClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    toast.success('Logged out')
    navigate('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1B2A5C] text-white">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F26522] rounded-xl flex items-center justify-center font-bold text-xl font-heading">V</div>
          <div>
            <p className="font-bold text-sm font-heading">VeloxCode</p>
            <p className="text-xs text-white/60">Admin Panel</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F26522] flex items-center justify-center font-bold text-sm">
            {profile?.name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.name || 'Admin'}</p>
            <p className="text-xs text-white/60">Administrator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive ? 'bg-[#F26522] text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all w-full"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:flex w-64 flex-shrink-0 h-screen sticky top-0">
        <div className="w-full"><SidebarContent /></div>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed left-0 top-0 h-full w-64 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
