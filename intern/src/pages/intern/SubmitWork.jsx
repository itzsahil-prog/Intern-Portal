import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

export default function SubmitWork() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState({ task_id: '', github_link: '', notes: '' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    const [tasksRes, subsRes] = await Promise.all([
      supabase.from('tasks').select('id, title').eq('assigned_to', user.id).neq('status', 'Done'),
      supabase.from('submissions').select('*, tasks(title)').eq('intern_id', user.id).order('submitted_at', { ascending: false }),
    ])
    setTasks(tasksRes.data || [])
    setSubmissions(subsRes.data || [])
  }

  useEffect(() => { if (user) loadData() }, [user])

  useRealtime('submissions', (payload) => {
    if (payload.new?.intern_id === user?.id) {
      setSubmissions(prev => {
        const exists = prev.find(s => s.id === payload.new.id)
        return exists ? prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s) : [payload.new, ...prev]
      })
    }
  }, { filter: `intern_id=eq.${user?.id}` })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.task_id) { toast.error('Select a task'); return }
    if (!file && !form.github_link) { toast.error('Provide a file or GitHub link'); return }

    setSubmitting(true)
    const tid = toast.loading('Submitting...')
    try {
      let file_url = null
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB')
        const fname = `${user.id}/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('submissions').upload(fname, file)
        if (upErr) throw new Error('Upload failed: ' + upErr.message)
        const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(fname)
        file_url = urlData.publicUrl
      }

      const { error } = await supabase.from('submissions').insert({
        intern_id: user.id,
        task_id: form.task_id,
        file_url,
        github_link: form.github_link || null,
        notes: form.notes || null,
        status: 'Pending Review',
      })
      if (error) throw new Error(error.message)

      // Update task status
      await supabase.from('tasks').update({ status: 'In Progress' }).eq('id', form.task_id)

      toast.success('Submission received!', { id: tid })
      setForm({ task_id: '', github_link: '', notes: '' })
      setFile(null)
      loadData()
    } catch (err) {
      toast.error(err.message, { id: tid })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Submit Work</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload your completed task files or share a GitHub link</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">New Submission</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Task *</label>
                <select
                  value={form.task_id} onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                >
                  <option value="">Choose a task...</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload File (max 5MB)</label>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F26522] file:text-white file:font-semibold hover:file:bg-orange-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GitHub Link</label>
                <input
                  value={form.github_link} onChange={e => setForm(f => ({ ...f, github_link: e.target.value }))}
                  type="url" placeholder="https://github.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Any notes for the reviewer..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm resize-none"
                />
              </div>
              <Button type="submit" loading={submitting} className="w-full">Submit Work 📤</Button>
            </form>
          </div>

          {/* Submission history */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Submission History</h2>
            {submissions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No submissions yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-3 bg-[#E8EDF5] rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1B2A5C] truncate">{sub.tasks?.title || 'Task'}</p>
                        <p className="text-xs text-gray-400">{timeAgo(sub.submitted_at)}</p>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>
                    {sub.feedback && (
                      <div className="mt-2 p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-600"><strong>Feedback:</strong> {sub.feedback}</p>
                      </div>
                    )}
                    {sub.points_awarded && (
                      <p className="text-xs font-bold text-[#F26522] mt-1">+{sub.points_awarded} points awarded</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {sub.file_url && <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#F26522] hover:underline">📎 View File</a>}
                      {sub.github_link && <a href={sub.github_link} target="_blank" rel="noreferrer" className="text-xs text-[#F26522] hover:underline">🔗 GitHub</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
