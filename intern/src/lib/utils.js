import { format, formatDistanceToNow, isAfter, isBefore, addHours } from 'date-fns'

export function generateReferenceNumber() {
  const year = new Date().getFullYear()
  const rand = Math.random().toString(36).substr(2, 5).toUpperCase()
  return `VCA-${year}-${rand}`
}

export function generateLoginId(name, existingIds = []) {
  const parts = name.trim().toLowerCase().split(/\s+/)
  const first = parts[0] || 'intern'
  const last = parts[1] || 'user'
  let base = `${first}.${last}@veloxcode`
  let candidate = base
  let counter = 1
  while (existingIds.includes(candidate)) {
    candidate = `${base}${counter}`
    counter++
  }
  return candidate
}

export function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = 'VCA'
  for (let i = 0; i < 6; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

export function formatDate(date) {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date) {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function timeAgo(date) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isDueSoon(dueDate) {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  return isAfter(due, now) && isBefore(due, addHours(now, 24))
}

export function getStatusColor(status) {
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
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

export function getPriorityColor(priority) {
  const map = {
    'High': 'bg-red-100 text-red-700 border-red-200',
    'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
  }
  return map[priority] || 'bg-gray-100 text-gray-600'
}

export function truncate(str, n = 60) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function exportToCSV(data, filename) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function getBadge(points) {
  if (points >= 500) return { label: 'Legend', color: 'text-yellow-600', emoji: '👑' }
  if (points >= 300) return { label: 'Expert', color: 'text-purple-600', emoji: '💎' }
  if (points >= 150) return { label: 'Pro', color: 'text-blue-600', emoji: '🚀' }
  if (points >= 50) return { label: 'Rising Star', color: 'text-orange-600', emoji: '⭐' }
  return { label: 'Newcomer', color: 'text-gray-600', emoji: '🌱' }
}
