import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import PageWrapper from '../../components/layout/PageWrapper'
import { SkeletonCard } from '../../components/ui/Skeleton'

const TYPE_ICONS = { Video: '🎥', Article: '📄', Document: '📋', Link: '🔗' }
const TYPE_COLORS = { Video: 'bg-red-50 text-red-600', Article: 'bg-blue-50 text-blue-600', Document: 'bg-green-50 text-green-600', Link: 'bg-purple-50 text-purple-600' }

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('resources').select('*').order('is_featured', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => { setResources(data || []); setLoading(false) })
  }, [])

  const types = ['All', ...new Set(resources.map(r => r.type))]
  const filtered = resources.filter(r => {
    const matchType = filter === 'All' || r.type === filter
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })
  const featured = filtered.filter(r => r.is_featured)
  const rest = filtered.filter(r => !r.is_featured)

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">Resources</h1>
          <p className="text-gray-500 text-sm mt-0.5">Learning materials curated for your internship</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm bg-white"
          />
          <div className="flex gap-2 flex-wrap">
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${filter === t ? 'bg-[#F26522] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#F26522]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div>
                <h2 className="font-bold text-[#1B2A5C] font-heading mb-3">⭐ Featured</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(r => <ResourceCard key={r.id} resource={r} />)}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div>
                {featured.length > 0 && <h2 className="font-bold text-[#1B2A5C] font-heading mb-3">All Resources</h2>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map(r => <ResourceCard key={r.id} resource={r} />)}
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📚</div>
                <p>No resources found</p>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}

function ResourceCard({ resource: r }) {
  const typeColor = TYPE_COLORS[r.type] || 'bg-gray-50 text-gray-600'
  return (
    <a href={r.url} target="_blank" rel="noreferrer"
      className="block bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeColor}`}>
          {TYPE_ICONS[r.type]} {r.type}
        </span>
        {r.is_featured && <span className="text-yellow-500 text-sm">⭐</span>}
      </div>
      <h3 className="font-bold text-[#1B2A5C] text-sm group-hover:text-[#F26522] transition-colors leading-snug mb-2">{r.title}</h3>
      {r.topic_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {r.topic_tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-[#E8EDF5] text-[#1B2A5C] text-xs rounded-full">{tag}</span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">Added {formatDate(r.created_at)}</p>
    </a>
  )
}
