import { motion } from 'framer-motion'

export default function Card({ children, className = '', hover = false, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm border border-gray-100 p-5
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

export function StatCard({ label, value, icon, color = 'orange', trend }) {
  const colors = {
    orange: 'bg-orange-50 text-[#F26522]',
    navy: 'bg-blue-50 text-[#1B2A5C]',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#1B2A5C] mt-1 font-heading">{value ?? '—'}</p>
          {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl text-2xl ${colors[color]}`}>{icon}</div>
      </div>
    </Card>
  )
}
