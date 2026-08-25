import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  CalendarClock,
  Loader,
  CheckCircle2,
  ArrowRight,
  ListTodo,
  Sun,
  Sunrise,
  Moon,
  Megaphone,
  Pin,
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Badge, Card, Spinner, EmptyState, PageHeader, formatDate, isOverdue, relativeTime } from '../components/ui'

const DAY_MS = 24 * 60 * 60 * 1000

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function GreetingIcon() {
  const h = new Date().getHours()
  if (h < 12) return Sunrise
  if (h < 17) return Sun
  return Moon
}

export default function MyDashboard() {
  const [tasks, setTasks] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    Promise.allSettled([api.get('/tasks'), api.get('/announcements')]).then(([tRes, aRes]) => {
      if (tRes.status === 'fulfilled') setTasks(tRes.value.data || [])
      else toast.error('Failed to load tasks')
      if (aRes.status === 'fulfilled') setAnnouncements((aRes.value.data || []).slice(0, 4))
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    const weekAgo = now.getTime() - 7 * DAY_MS

    let overdue = 0
    let dueToday = 0
    let inProgress = 0
    let completedWeek = 0
    tasks.forEach((t) => {
      if (t.status === 'Completed' || t.status === 'Cancelled') return
      if (isOverdue(t.dueDate)) overdue++
      else if (t.dueDate && new Date(t.dueDate) <= endOfToday) dueToday++
      if (t.status === 'In Progress') inProgress++
      if (t.status === 'Completed' && t.updatedAt && new Date(t.updatedAt).getTime() >= weekAgo) completedWeek++
    })
    return { overdue, dueToday, inProgress, completedWeek }
  }, [tasks])

  const dueSoon = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
    open.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    return open.slice(0, 6)
  }, [tasks])

  const recentlyCompleted = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'Completed')
    done.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    return done.slice(0, 5)
  }, [tasks])

  if (loading) return <Spinner label="Loading your dashboard..." />

  const openTasks = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            {(() => {
              const Icon = GreetingIcon()
              return (
                <>
                  <span className="text-indigo-500">
                    <Icon size={22} />
                  </span>
                  {greeting()}, {(user?.name || '').split(' ')[0]}
                </>
              )
            })()}
          </span>
        }
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        actions={
          <button
            onClick={() => navigate('/my-tasks')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors duration-150 shadow-sm"
          >
            <ListTodo size={14} />
            All Tasks ({openTasks.length})
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCardToned label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="red" />
        <StatCardToned label="Due Today" value={stats.dueToday} icon={CalendarClock} tone="amber" />
        <StatCardToned label="In Progress" value={stats.inProgress} icon={Loader} tone="indigo" />
        <StatCardToned label="Done This Week" value={stats.completedWeek} icon={CheckCircle2} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900">
              <CalendarClock size={15} className="text-gray-400" />
              Due Soon
            </h3>
            <button
              onClick={() => navigate('/my-tasks')}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          {dueSoon.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="Nothing pending — you're all caught up!" />
          ) : (
            <div className="space-y-2">
              {dueSoon.map((t) => {
                const overdue = isOverdue(t.dueDate)
                return (
                  <button
                    key={t._id}
                    onClick={() => navigate(`/my-tasks?task=${t._id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150 text-left"
                  >
                    <span
                      className={`h-8 min-w-[36px] px-1 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        overdue ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'
                      }`}
                    >
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                        : '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {t.client?.name ? `${t.client.name} · ` : ''}Due {formatDate(t.dueDate)}
                        {overdue && <span className="text-red-600 font-medium"> · Overdue</span>}
                      </p>
                    </div>
                    <Badge text={t.priority} type="priority" />
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 mb-3">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Recently Completed
          </h3>
          {recentlyCompleted.length === 0 ? (
            <EmptyState icon={ListTodo} message="No completed tasks yet" hint="Finish a task to see it here" />
          ) : (
            <div className="space-y-2">
              {recentlyCompleted.map((t) => (
                <button
                  key={t._id}
                  onClick={() => navigate(`/my-tasks?task=${t._id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150 text-left"
                >
                  <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-through decoration-gray-300 truncate">{t.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{t.client?.name || ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {announcements.length > 0 && (
        <Card className="p-5 mt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 mb-3">
            <Megaphone size={15} className="text-indigo-500" />
            Notice Board
          </h3>
          <div className="space-y-2.5">
            {announcements.map((a) => (
              <div key={a._id} className={`p-3 rounded-lg border ${a.pinned ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-indigo-600 bg-white border border-indigo-100 rounded px-1.5 py-0.5">
                      <Pin size={9} /> PINNED
                    </span>
                  )}
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {a.createdByName || 'Manager'} · {relativeTime(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

const TONES = {
  red: 'bg-red-50 text-red-500',
  amber: 'bg-amber-50 text-amber-500',
  indigo: 'bg-indigo-50 text-indigo-500',
  green: 'bg-emerald-50 text-emerald-500',
}

function StatCardToned({ label, value, icon: Icon, tone }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-gray-900 leading-tight">{value}</p>
      </div>
    </Card>
  )
}
