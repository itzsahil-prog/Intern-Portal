export default function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    'Submitted': 'bg-blue-100 text-blue-700',
    'Under Review': 'bg-yellow-100 text-yellow-700',
    'Shortlisted': 'bg-purple-100 text-purple-700',
    'Interview Scheduled': 'bg-indigo-100 text-indigo-700',
    'Accepted': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700',
    'To Do': 'bg-gray-100 text-gray-700',
    'In Progress': 'bg-orange-100 text-orange-700',
    'Done': 'bg-green-100 text-green-700',
    'Pending Review': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
    'Needs Revision': 'bg-red-100 text-red-700',
    'Active': 'bg-green-100 text-green-700',
    'Completed': 'bg-blue-100 text-blue-700',
    'Deactivated': 'bg-gray-100 text-gray-700',
    'sent': 'bg-green-100 text-green-700',
    'failed': 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const map = {
    'High': 'bg-red-100 text-red-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'Low': 'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  )
}
