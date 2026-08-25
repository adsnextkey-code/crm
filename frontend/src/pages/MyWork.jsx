import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, CalendarDays, Building2 } from 'lucide-react'
import api from '../utils/api'
import { Card, Spinner, EmptyState, PageHeader, formatDate } from '../components/ui'

const CAMPAIGN_TONE = {
  Planning: 'bg-gray-100 text-gray-600 border-gray-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'On Hold': 'bg-amber-50 text-amber-700 border-amber-100',
  Completed: 'bg-blue-50 text-blue-700 border-blue-100',
  Cancelled: 'bg-red-50 text-red-600 border-red-100',
}

const CONTENT_TONE = {
  Brief: 'bg-gray-100 text-gray-600 border-gray-200',
  Production: 'bg-amber-50 text-amber-700 border-amber-100',
  'Internal Review': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  Published: 'bg-teal-50 text-teal-700 border-teal-100',
}

function Pill({ text, tone }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        tone[text] || tone.Brief
      }`}
    >
      {text}
    </span>
  )
}

export default function MyWork() {
  const [tab, setTab] = useState('content')
  const [campaigns, setCampaigns] = useState([])
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([api.get('/campaigns'), api.get('/content')])
      .then(([cRes, ctRes]) => {
        if (!mounted) return
        setCampaigns(cRes.data || [])
        setContents(ctRes.data || [])
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load your work'))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  const contentByStatus = useMemo(() => contents, [contents])

  if (loading) return <Spinner label="Loading your work..." />

  const tabBtn = (key, label, Icon) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
        tab === key ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )

  return (
    <div>
      <PageHeader
        title="My Work"
        subtitle="Campaigns and content items you're involved in"
        actions={
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {tabBtn('content', `Content (${contentByStatus.length})`, CalendarDays)}
            {tabBtn('campaigns', `Campaigns (${campaigns.length})`, Megaphone)}
          </div>
        }
      />

      {tab === 'campaigns' ? (
        campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} message="No campaigns yet" hint="Campaigns of your clients will appear here" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Card key={c._id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-gray-900">{c.name}</h3>
                  <Pill text={c.status || 'Planning'} tone={CAMPAIGN_TONE} />
                </div>
                <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                  <Building2 size={11} />
                  {c.clientId?.name || '—'}
                </p>
                {(c.channels || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {c.channels.map((ch) => (
                      <span key={ch} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
                {(c.startDate || c.endDate) && (
                  <p className="text-[11px] text-gray-400 mt-3 pt-2.5 border-t border-gray-100">
                    {c.startDate ? formatDate(c.startDate) : '—'} → {c.endDate ? formatDate(c.endDate) : '—'}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )
      ) : contentByStatus.length === 0 ? (
        <EmptyState icon={CalendarDays} message="No content assigned to you yet" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2.5 px-4 font-medium">Title</th>
                <th className="py-2.5 px-4 font-medium">Client</th>
                <th className="py-2.5 px-4 font-medium">Type</th>
                <th className="py-2.5 px-4 font-medium">Platform</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {contentByStatus.map((ct) => (
                <tr key={ct._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-2.5 px-4 font-medium text-gray-900 max-w-[220px] truncate">{ct.title}</td>
                  <td className="py-2.5 px-4 text-gray-600">{ct.clientId?.name || '—'}</td>
                  <td className="py-2.5 px-4">
                    {ct.contentType && (
                      <span className="text-[11px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{ct.contentType}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-600">{ct.platform || '—'}</td>
                  <td className="py-2.5 px-4">
                    <Pill text={ct.status || 'Brief'} tone={CONTENT_TONE} />
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{formatDate(ct.scheduledDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
