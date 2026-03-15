import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { formatDate, isDueSoon } from '../../lib/utils'
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

const PRIORITIES = ['Low', 'Medium', 'High']
const STATUSES = ['To Do', 'In Progress', 'Done']

const emptyForm = { title: '', description: '', assigned_to: '', cohort_id: '', due_date: '', priority: 'Medium', points_value: 10, status: 'To Do' }

export default function AdminTasks() {
  const [tasks, setTasks] = useState([])
  const [interns, setInterns] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  async function loadData() {
    const [tasksRes, internsRes, cohortsRes] = await Promise.all([
      supabase.from('tasks').select('*, interns(name), cohorts(name)').order('created_at', { ascending: false }),
      supabase.from('interns').select('id, name').eq('status', 'Active'),
      supabase.from('cohorts').select('id, name').eq('is_active', true),
    ])
    setTasks(tasksRes.data || [])
    setInterns(internsRes.data || [])
    setCohorts(cohortsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])
  useRealtime('tasks', () => loadData())

  function openCreate() { setForm(emptyForm); setEditTask(null); setModal(true) }
  function openEdit(task) {
    setForm({ title: task.title, description: task.description || '', assigned_to: task.assigned_to || '', cohort_id: task.cohort_id || '', due_date: task.due_date?.split('T')[0] || '', priority: task.priority, points_value: task.points_value, status: task.status })
    setEditTask(task)
    setModal(true)
  }

  async function handleSave() {
    if (!form.title) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { ...form, assigned_to: form.assigned_to || null, cohort_id: form.cohort_id || null, due_date: form.due_date || null }
    const { error } = editTask
      ? await supabase.from('tasks').update(payload).eq('id', editTask.id)
      : await supabase.from('tasks').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(editTask ? 'Task updated!' : 'Task created!'); setModal(false); loadData() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Task deleted')
    loadData()
  }

  async function handleDuplicate(task) {
    const { id, created_at, interns, cohorts, ...rest } = task
    await supabase.from('tasks').insert({ ...rest, title: rest.title + ' (Copy)', status: 'To Do' })
    toast.success('Task duplicated')
    loadData()
  }

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageWrapper>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Tasks</h1>
            <p className="text-gray-500 text-sm">{filtered.length} tasks</p>
          </div>
          <Button onClick={openCreate}>+ Create Task</Button>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white" />

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E8EDF5]">
                <tr className="text-left text-xs text-gray-500 font-semibold">
                  <th className="p-3">Title</th>
                  <th className="p-3">Assigned To</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Points</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-3"><div className="skeleton h-8 rounded" /></td></tr>
                )) : filtered.map(task => (
                  <tr key={task.id} className={`hover:bg-gray-50 ${isDueSoon(task.due_date) ? 'bg-orange-50/50' : ''}`}>
                    <td className="p-3">
                      <p className="font-semibold text-[#1B2A5C]">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate max-w-48">{task.description}</p>}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{task.interns?.name || task.cohorts?.name || '—'}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {formatDate(task.due_date)}
                      {isDueSoon(task.due_date) && <span className="ml-1 text-orange-500">⚠️</span>}
                    </td>
                    <td className="p-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="p-3 font-bold text-[#F26522]">{task.points_value}</td>
                    <td className="p-3"><StatusBadge status={task.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(task)} className="text-xs text-blue-600 hover:bg-blue-50 font-medium px-2 py-1 rounded-lg transition-colors">Edit</button>
                        <button onClick={() => handleDuplicate(task)} className="text-xs text-gray-600 hover:bg-gray-100 font-medium px-2 py-1 rounded-lg transition-colors">Copy</button>
                        <button onClick={() => handleDelete(task.id)} className="text-xs text-red-500 hover:bg-red-50 font-medium px-2 py-1 rounded-lg transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-400">No tasks found</div>}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editTask ? 'Edit Task' : 'Create Task'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To (Intern)</label>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
                <option value="">Select intern...</option>
                {interns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Or Assign to Cohort</label>
              <select value={form.cohort_id} onChange={e => setForm(f => ({ ...f, cohort_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
                <option value="">Select cohort...</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Points Value</label>
              <input type="number" value={form.points_value} onChange={e => setForm(f => ({ ...f, points_value: Number(e.target.value) }))}
                min={0} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{editTask ? 'Update Task' : 'Create Task'}</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
