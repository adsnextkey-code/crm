import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, LogIn, ScrollText } from 'lucide-react'
import api from '../utils/api'
import { Card, Spinner, EmptyState, PageHeader, relativeTime } from '../components/ui'

const ACTION_META = {
  created: { icon: Plus, color: 'text-emerald-600 bg-emerald-50' },
  updated: { icon: Pencil, color: 'text-blue-600 bg-blue-50' },
  deleted: { icon: Trash2, color: 'text-red-600 bg-red-50' },
  login: { icon: LogIn, color: 'text-violet-600 bg-violet-50' },
}

export default function Activity() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [targetFilter, setTargetFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/dashboard/stats')
        setActivities(res.data?.recentActivity || [])
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const targetTypes = useMemo(
    () => [...new Set(activities.map((a) => a.targetType).filter(Boolean))],
    [activities]
  )

  const filtered = useMemo(
    () => (targetFilter ? activities.filter((a) => a.targetType === targetFilter) : activities),
    [activities, targetFilter]
  )

  if (loading) return <Spinner label="Loading activity..." />

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Recent actions across the workspace"
        actions={
          targetTypes.length > 0 && (
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer capitalize"
            >
              <option value="">All Types</option>
              {targetTypes.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          )
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} message="No activity yet" hint="Actions will appear here as your team works" />
      ) : (
        <Card className="p-2">
          <div className="space-y-0.5">
            {filtered.map((a, i) => {
              const meta =
                ACTION_META[Object.keys(ACTION_META).find((k) => (a.action || '').startsWith(k))] ||
                { icon: Pencil, color: 'text-gray-500 bg-gray-100' }
              const Icon = meta.icon
              return (
                <div
                  key={a._id || i}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 leading-snug">
                      <span className="font-medium text-gray-900">{a.userName || 'Someone'}</span>{' '}
                      <span className="capitalize">{a.action}</span>
                      {a.targetName && <> <span className="font-medium text-gray-900">{a.targetName}</span></>}
                      {a.targetType && <span className="text-gray-400"> · {a.targetType}</span>}
                    </p>
                    {a.details && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.details}</p>}
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 mt-1">{relativeTime(a.createdAt)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
