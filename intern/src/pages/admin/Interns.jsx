import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { formatDate, exportToCSV } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import SlideOver from '../../components/ui/SlideOver'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

export default function AdminInterns() {
  const [interns, setInterns] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCohort, setFilterCohort] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [viewIntern, setViewIntern] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const [internsRes, cohortsRes] = await Promise.all([
      supabase.from('interns').select('*, cohorts(name)').order('created_at', { ascending: false }),
      supabase.from('cohorts').select('id, name'),
    ])
    setInterns(internsRes.data || [])
    setCohorts(cohortsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])
  useRealtime('interns', () => loadData())

  const filtered = interns.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.login_id?.toLowerCase().includes(search.toLowerCase())
    const matchCohort = filterCohort === 'All' || i.cohort_id === filterCohort
    const matchStatus = filterStatus === 'All' || i.status === filterStatus
    return matchSearch && matchCohort && matchStatus
  })

  async function handleSaveEdit() {
    setSaving(true)
    const { error } = await supabase.from('interns').update({
      name: editForm.name,
      role: editForm.role,
      status: editForm.status,
      cohort_id: editForm.cohort_id || null,
    }).eq('id', editModal.id)
    if (error) toast.error(error.message)
    else { toast.success('Intern updated!'); loadData(); setEditModal(null) }
    setSaving(false)
  }

  async function handleDeactivate(id) {
    await supabase.from('interns').update({ status: 'Deactivated' }).eq('id', id)
    toast.success('Intern deactivated')
    loadData()
  }

  async function handleResetPassword(intern) {
    const { error } = await supabase.auth.admin.generateLink({ type: 'recovery', email: intern.login_id })
    if (error) toast.error(error.message)
    else toast.success('Password reset link generated (check Supabase logs)')
  }

  return (
    <PageWrapper>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Interns</h1>
            <p className="text-gray-500 text-sm">{filtered.length} interns</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, 'interns')}>Export CSV</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or login ID..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white" />
          <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white">
            <option value="All">All Cohorts</option>
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E8EDF5]">
                <tr className="text-left text-xs text-gray-500 font-semibold">
                  <th className="p-3">Name</th>
                  <th className="p-3">Login ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Cohort</th>
                  <th className="p-3">Points</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-3"><div className="skeleton h-8 rounded" /></td></tr>
                )) : filtered.map(intern => (
                  <tr key={intern.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1B2A5C] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                          {intern.avatar_url ? <img src={intern.avatar_url} alt="" className="w-full h-full object-cover" /> : intern.name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1B2A5C]">{intern.name}</p>
                          <p className="text-xs text-gray-400">{intern.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-gray-500 font-mono">{intern.login_id}</td>
                    <td className="p-3 text-xs text-gray-600">{intern.role}</td>
                    <td className="p-3 text-xs text-gray-600">{intern.cohorts?.name || '—'}</td>
                    <td className="p-3 font-bold text-[#F26522]">{intern.points}</td>
                    <td className="p-3"><StatusBadge status={intern.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setViewIntern(intern)} className="text-xs text-[#1B2A5C] hover:text-[#F26522] font-medium px-2 py-1 rounded-lg hover:bg-[#E8EDF5] transition-colors">View</button>
                        <button onClick={() => { setEditModal(intern); setEditForm({ name: intern.name, role: intern.role, status: intern.status, cohort_id: intern.cohort_id }) }}
                          className="text-xs text-blue-600 hover:bg-blue-50 font-medium px-2 py-1 rounded-lg transition-colors">Edit</button>
                        <button onClick={() => handleResetPassword(intern)} className="text-xs text-purple-600 hover:bg-purple-50 font-medium px-2 py-1 rounded-lg transition-colors">Reset Pwd</button>
                        {intern.status === 'Active' && (
                          <button onClick={() => handleDeactivate(intern.id)} className="text-xs text-red-500 hover:bg-red-50 font-medium px-2 py-1 rounded-lg transition-colors">Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-400">No interns found</div>}
          </div>
        </div>
      </div>

      {/* View Intern */}
      <SlideOver open={!!viewIntern} onClose={() => setViewIntern(null)} title="Intern Profile">
        {viewIntern && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1B2A5C] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {viewIntern.avatar_url ? <img src={viewIntern.avatar_url} alt="" className="w-full h-full object-cover" /> : viewIntern.name?.[0]}
              </div>
              <div>
                <h3 className="font-bold text-[#1B2A5C] font-heading text-lg">{viewIntern.name}</h3>
                <p className="text-gray-500 text-sm">{viewIntern.role}</p>
                <StatusBadge status={viewIntern.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Login ID', viewIntern.login_id], ['Email', viewIntern.email],
                ['WhatsApp', viewIntern.whatsapp_number], ['Points', viewIntern.points],
                ['Cohort', viewIntern.cohorts?.name || '—'], ['Start Date', formatDate(viewIntern.start_date)],
                ['Joined', formatDate(viewIntern.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#E8EDF5] rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-semibold text-[#1B2A5C] text-sm">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Intern">
        <div className="space-y-4">
          {[['name', 'Full Name', 'text'], ['role', 'Role', 'text']].map(([field, label, type]) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input type={type} value={editForm[field] || ''} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cohort</label>
            <select value={editForm.cohort_id || ''} onChange={e => setEditForm(f => ({ ...f, cohort_id: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm">
              <option value="">No cohort</option>
              {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveEdit} loading={saving} className="flex-1">Save Changes</Button>
            <Button variant="ghost" onClick={() => setEditModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
