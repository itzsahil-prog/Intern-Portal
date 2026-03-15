import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import { formatDate, isDueSoon } from '../../lib/utils'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

const COLUMNS = ['To Do', 'In Progress', 'Done']

export default function InternTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(null)

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('assigned_to', user.id).order('due_date')
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { if (user) loadTasks() }, [user])

  useRealtime('tasks', (payload) => {
    if (payload.new?.assigned_to === user?.id || payload.old?.assigned_to === user?.id) {
      loadTasks()
    }
  })

  async function updateStatus(taskId, newStatus) {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) { toast.error('Failed to update task'); return }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    toast.success(`Task moved to ${newStatus}`)
  }

  function handleDragStart(e, task) {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, col) {
    e.preventDefault()
    if (dragging && dragging.status !== col) {
      updateStatus(dragging.id, col)
    }
    setDragging(null)
  }

  const tasksByCol = (col) => tasks.filter(t => t.status === col)

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">Drag tasks between columns to update status</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(c => <div key={c} className="bg-white rounded-xl p-4 h-64 skeleton" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => (
              <div
                key={col}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col)}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm kanban-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1B2A5C] font-heading text-sm">{col}</h3>
                  <span className="bg-[#E8EDF5] text-[#1B2A5C] text-xs font-bold px-2 py-0.5 rounded-full">
                    {tasksByCol(col).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tasksByCol(col).map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      draggable
                      onDragStart={e => handleDragStart(e, task)}
                      className={`p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${isDueSoon(task.due_date) ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-[#E8EDF5]'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm text-[#1B2A5C] leading-tight">{task.title}</p>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Due: {formatDate(task.due_date)}</span>
                        <span className="text-xs font-bold text-[#F26522]">{task.points_value}pts</span>
                      </div>
                      {isDueSoon(task.due_date) && (
                        <p className="text-xs text-orange-600 font-semibold mt-1">⚠️ Due soon!</p>
                      )}
                      {col !== 'Done' && (
                        <div className="mt-2 flex gap-1">
                          {col === 'To Do' && (
                            <button onClick={() => updateStatus(task.id, 'In Progress')}
                              className="text-xs bg-[#F26522] text-white px-2 py-1 rounded-lg hover:bg-orange-600 transition-colors">
                              Start →
                            </button>
                          )}
                          {col === 'In Progress' && (
                            <button onClick={() => updateStatus(task.id, 'Done')}
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600 transition-colors">
                              ✓ Complete
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {tasksByCol(col).length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
