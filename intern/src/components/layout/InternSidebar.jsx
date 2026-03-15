import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/intern/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/intern/tasks', icon: '📋', label: 'My Tasks' },
  { to: '/intern/submit', icon: '📤', label: 'Submit Work' },
  { to: '/intern/resources', icon: '📚', label: 'Resources' },
  { to: '/intern/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { to: '/intern/messages', icon: '💬', label: 'Messages' },
  { to: '/intern/profile', icon: '👤', label: 'Profile' },
]

export default function InternSidebar({ open, onClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    toast.success('Logged out')
    navigate('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1B2A5C] text-white">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F26522] rounded-xl flex items-center justify-center font-bold text-xl font-heading">V</div>
          <div>
            <p className="font-bold text-sm font-heading">VeloxCode</p>
            <p className="text-xs text-white/60">Agency Portal</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F26522] flex items-center justify-center font-bold text-sm overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : (profile?.name?.[0] || 'I')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.name || 'Intern'}</p>
            <p className="text-xs text-white/60 truncate">{profile?.role || 'Intern'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive ? 'bg-[#F26522] text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
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
      {/* Desktop */}
      <div className="hidden lg:flex w-64 flex-shrink-0 h-screen sticky top-0">
        <div className="w-full"><SidebarContent /></div>
      </div>

      {/* Mobile */}
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
