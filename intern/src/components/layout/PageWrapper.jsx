import { useState } from 'react'
import { motion } from 'framer-motion'
import InternSidebar from './InternSidebar'
import AdminSidebar from './AdminSidebar'
import { useAuth } from '../../context/AuthContext'

export default function PageWrapper({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-[#E8EDF5]">
      {role === 'admin'
        ? <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        : <InternSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      }

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-[#1B2A5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#F26522] rounded-lg flex items-center justify-center font-bold text-white text-sm">V</div>
            <span className="font-bold text-[#1B2A5C] font-heading text-sm">VeloxCodeAgency</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
