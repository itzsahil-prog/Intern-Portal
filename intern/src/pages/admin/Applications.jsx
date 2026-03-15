import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { sendWhatsApp, buildAcceptanceVars, buildRejectionVars, buildInterviewVars } from '../../lib/whatsapp'
import { generateLoginId, generatePassword, formatDate, timeAgo, exportToCSV } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import SlideOver from '../../components/ui/SlideOver'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

const STATUSES = ['All', 'Submitted', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Accepted', 'Rejected']

export default function AdminApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewApp, setViewApp] = useState(null)
  const [interviewModal, setInterviewModal] = useState(null)
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewLink, setInterviewLink] = useState('')
  const [processing, setProcessing] = useState(null)
  const [bulkSelected, setBulkSelected] = useState([])

  async function loadApps() {
    const { data } = await supabase.from('applications').select('*').order('created_at', { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  useEffect(() => { loadApps() }, [])
  useRealtime('applications', () => loadApps())

  const filtered = apps.filter(a => {
    const matchStatus = filter === 'All' || a.status === filter
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  async function updateStatus(appId, newStatus) {
    await supabase.from('applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
  }

  async function handleAccept(app) {
    setProcessing(app.id)
    const tid = toast.loading('Processing acceptance...')
    try {
      // Get existing login IDs
      const { data: existingInterns } = await supabase.from('interns').select('login_id')
      const existingIds = (existingInterns || []).map(i => i.login_id)
      const loginId = generateLoginId(app.name, existingIds)
      const password = generatePassword()

      // Create Supabase auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: loginId,
        password,
        user_metadata: { role: 'intern' },
        email_confirm: true,
      })
      if (authErr) throw new Error('Auth creation failed: ' + authErr.message)

      // Get cohort info
      let cohortStartDate = 'TBD'
      if (app.cohort) {
        const { data: cohort } = await supabase.from('cohorts').select('start_date, name').eq('id', app.cohort).single()
        if (cohort) cohortStartDate = formatDate(cohort.start_date)
      }

      // Insert intern record
      const { error: internErr } = await supabase.from('interns').insert({
        id: authData.user.id,
        name: app.name,
        email: app.email,
        whatsapp_number: app.whatsapp_number,
        role: app.role,
        cohort_id: app.cohort || null,
        start_date: app.start_date,
        login_id: loginId,
        status: 'Active',
        points: 0,
      })
      if (internErr) throw new Error('Intern record failed: ' + internErr.message)

      // Update application status
      await updateStatus(app.id, 'Accepted')

      // Send WhatsApp
      const waResult = await sendWhatsApp({
        phone: app.whatsapp_number,
        type: 'intern_acceptance',
        variables: buildAcceptanceVars({ name: app.name, role: app.role, loginId, password, cohortStartDate, mentorName: 'Your Mentor' }),
        internId: authData.user.id,
      })

      // Log to whatsapp_logs
      await supabase.from('whatsapp_logs').insert({
        intern_id: authData.user.id,
        message_type: 'acceptance',
        status: waResult.success ? 'sent' : 'failed',
        phone_number: app.whatsapp_number,
        error_message: waResult.success ? null : waResult.error,
      })

      toast.success(`✅ Intern created & WhatsApp ${waResult.success ? 'sent' : 'attempted'}!`, { id: tid })
    } catch (err) {
      toast.error(err.message, { id: tid })
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(app) {
    setProcessing(app.id)
    await updateStatus(app.id, 'Rejected')
    await sendWhatsApp({
      phone: app.whatsapp_number,
      type: 'rejection',
      variables: buildRejectionVars({ name: app.name, role: app.role }),
    })
    await supabase.from('whatsapp_logs').insert({
      message_type: 'rejection',
      status: 'sent',
      phone_number: app.whatsapp_number,
    })
    toast.success('Application rejected & WhatsApp sent')
    setProcessing(null)
  }

  async function handleScheduleInterview() {
    if (!interviewModal || !interviewDate) return
    await updateStatus(interviewModal.id, 'Interview Scheduled')
    await sendWhatsApp({
      phone: interviewModal.whatsapp_number,
      type: 'interview_scheduled',
      variables: buildInterviewVars({ name: interviewModal.name, date: interviewDate, time: '', link: interviewLink }),
    })
    await supabase.from('whatsapp_logs').insert({
      message_type: 'interview_scheduled',
      status: 'sent',
      phone_number: interviewModal.whatsapp_number,
    })
    toast.success('Interview scheduled & WhatsApp sent!')
    setInterviewModal(null)
    setInterviewDate('')
    setInterviewLink('')
  }

  async function handleBulkStatusChange(newStatus) {
    if (!bulkSelected.length) return
    await Promise.all(bulkSelected.map(id => updateStatus(id, newStatus)))
    toast.success(`${bulkSelected.length} applications updated`)
    setBulkSelected([])
  }

  return (
    <PageWrapper>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Applications</h1>
            <p className="text-gray-500 text-sm">{filtered.length} applications</p>
          </div>
          <div className="flex gap-2">
            {bulkSelected.length > 0 && (
              <select onChange={e => handleBulkStatusChange(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F26522]">
                <option value="">Bulk: Move to...</option>
                {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, 'applications')}>Export CSV</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white" />
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === s ? 'bg-[#F26522] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#F26522]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E8EDF5]">
                <tr className="text-left text-xs text-gray-500 font-semibold">
                  <th className="p-3"><input type="checkbox" onChange={e => setBulkSelected(e.target.checked ? filtered.map(a => a.id) : [])} className="accent-[#F26522]" /></th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">WhatsApp</th>
                  <th className="p-3">Applied</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-3"><div className="skeleton h-8 rounded" /></td></tr>
                  ))
                ) : filtered.map(app => (
                  <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="p-3">
                      <input type="checkbox" checked={bulkSelected.includes(app.id)}
                        onChange={e => setBulkSelected(prev => e.target.checked ? [...prev, app.id] : prev.filter(id => id !== app.id))}
                        className="accent-[#F26522]" />
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-semibold text-[#1B2A5C]">{app.name}</p>
                        <p className="text-xs text-gray-400">{app.email}</p>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 text-xs">{app.role}</td>
                    <td className="p-3 text-gray-600 text-xs">{app.whatsapp_number}</td>
                    <td className="p-3 text-gray-400 text-xs">{timeAgo(app.created_at)}</td>
                    <td className="p-3"><StatusBadge status={app.status} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setViewApp(app)} className="text-xs text-[#1B2A5C] hover:text-[#F26522] font-medium px-2 py-1 rounded-lg hover:bg-[#E8EDF5] transition-colors">View</button>
                        {app.status !== 'Accepted' && app.status !== 'Rejected' && (
                          <>
                            <button onClick={() => setInterviewModal(app)} className="text-xs text-indigo-600 hover:bg-indigo-50 font-medium px-2 py-1 rounded-lg transition-colors">Interview</button>
                            <button onClick={() => handleAccept(app)} disabled={processing === app.id}
                              className="text-xs text-green-600 hover:bg-green-50 font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                              {processing === app.id ? '...' : 'Accept'}
                            </button>
                            <button onClick={() => handleReject(app)} disabled={processing === app.id}
                              className="text-xs text-red-500 hover:bg-red-50 font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">No applications found</div>
            )}
          </div>
        </div>
      </div>

      {/* View Application SlideOver */}
      <SlideOver open={!!viewApp} onClose={() => setViewApp(null)} title="Application Details">
        {viewApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Name', viewApp.name], ['Email', viewApp.email], ['Phone', viewApp.phone],
                ['WhatsApp', viewApp.whatsapp_number], ['Role', viewApp.role], ['Availability', viewApp.availability],
                ['Start Date', formatDate(viewApp.start_date)], ['Reference', viewApp.reference_number],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#E8EDF5] rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold text-[#1B2A5C] text-sm">{value || '—'}</p>
                </div>
              ))}
            </div>
            {viewApp.linkedin && <a href={viewApp.linkedin} target="_blank" rel="noreferrer" className="block text-sm text-[#F26522] hover:underline">🔗 LinkedIn Profile</a>}
            {viewApp.portfolio && <a href={viewApp.portfolio} target="_blank" rel="noreferrer" className="block text-sm text-[#F26522] hover:underline">💼 Portfolio</a>}
            {viewApp.resume_url && <a href={viewApp.resume_url} target="_blank" rel="noreferrer" className="block text-sm text-[#F26522] hover:underline">📄 Download Resume</a>}
            {viewApp.cover_letter && (
              <div className="bg-[#E8EDF5] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Cover Letter</p>
                <p className="text-sm text-gray-700 leading-relaxed">{viewApp.cover_letter}</p>
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <StatusBadge status={viewApp.status} />
              <span className="text-xs text-gray-400">Applied {timeAgo(viewApp.created_at)}</span>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Interview Modal */}
      <Modal open={!!interviewModal} onClose={() => setInterviewModal(null)} title="Schedule Interview">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Schedule interview for <strong>{interviewModal?.name}</strong></p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Date & Time</label>
            <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Link (optional)</label>
            <input type="url" value={interviewLink} onChange={e => setInterviewLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleScheduleInterview} className="flex-1">Schedule & Send WhatsApp 📱</Button>
            <Button variant="ghost" onClick={() => setInterviewModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
