import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ListTodo, Loader, Eye, CheckCircle2, ChevronDown, MessageSquarePlus, Clock } from 'lucide-react'
import api from '../utils/api'
import { StatCard, Badge, Button, Card, Spinner, EmptyState, PageHeader, formatDate, isOverdue, relativeTime } from '../components/ui'
import { formatDuration, CommentsSection } from '../components/TaskModal'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Review', 'Completed', 'On Hold']

function StatusChangePrompt({ newStatus, onCancel, onSave }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    await onSave(note)
    setSaving(false)
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
      <p className="text-xs text-gray-500 mb-2">
        Change status to <span className="font-semibold text-gray-900">{newStatus}</span>
        {newStatus === 'Completed' && ' (optional note)'}
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Update note (optional)..."
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y"
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="secondary" onClick={onCancel} className="px-3 py-1.5 text-xs">
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving} className="px-3 py-1.5 text-xs">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default function MyTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [statusPrompt, setStatusPrompt] = useState(null)
  const [searchParams] = useSearchParams()
  const deepLinked = useRef(false)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const target = searchParams.get('task')
    if (!loading && target && !deepLinked.current) {
      deepLinked.current = true
      setExpandedId(target)
      setTimeout(() => {
        document.getElementById(`task-row-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [loading, searchParams])

  const load = async () => {
    try {
      const res = await api.get('/tasks')
      setTasks(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    const c = { Pending: 0, 'In Progress': 0, Review: 0, Completed: 0 }
    tasks.forEach((t) => {
      if (c[t.status] != null) c[t.status]++
    })
    return c
  }, [tasks])

  const handleStatusSave = async (note) => {
    const { taskId: task, newStatus } = statusPrompt
    try {
      await api.put(`/tasks/${task._id}`, { status: newStatus, updateNote: note })
      toast.success(`Task moved to ${newStatus}`)
      setStatusPrompt(null)
      setExpandedId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task')
    }
  }

  if (loading) return <Spinner label="Loading your tasks..." />

  return (
    <div>
      <PageHeader title="My Tasks" subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'} assigned to you`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={counts.Pending} icon={ListTodo} />
        <StatCard label="In Progress" value={counts['In Progress']} icon={Loader} />
        <StatCard label="Review" value={counts.Review} icon={Eye} />
        <StatCard label="Completed" value={counts.Completed} icon={CheckCircle2} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} message="No tasks assigned yet" hint="Your manager will assign tasks soon" />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((t) => {
            const overdue = isOverdue(t.dueDate) && t.status !== 'Completed' && t.status !== 'Cancelled'
            const expanded = expandedId === t._id
            return (
              <Card
                key={t._id}
                className={`overflow-hidden hover:border-gray-300 transition-colors duration-150 ${expanded ? 'border-indigo-300 ring-2 ring-indigo-500/10' : ''}`}
              >
                <span id={`task-row-${t._id}`} className="block" />
                <div className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <h3 className="text-sm font-medium text-gray-900">{t.title}</h3>
                    {t.description && !expanded && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.description}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center flex-wrap gap-x-2">
                      <span>
                        {t.client?.name || ''}
                        {t.dueDate && ` · Due ${formatDate(t.dueDate)}`}
                        {overdue && <span className="text-red-600 font-medium"> · Overdue</span>}
                      </span>
                      {t.totalMinutes > 0 && (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Clock size={11} />
                          {formatDuration(t.totalMinutes)}
                        </span>
                      )}
                    </p>
                  </div>

                  <Badge text={t.priority} type="priority" />
                  <Badge text={t.status} type="status" />

                  <select
                    value={statusPrompt?.taskId?._id === t._id ? '' : t.status}
                    onChange={(e) => {
                      if (!e.target.value || e.target.value === t.status) return
                      setStatusPrompt({ taskId: t, newStatus: e.target.value })
                    }}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setExpandedId(expanded ? null : t._id)}
                    title="View details"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 shrink-0"
                  >
                    <ChevronDown size={15} className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {statusPrompt?.taskId?._id === t._id && (
                  <div className="px-4 pb-4 -mt-1">
                    <StatusChangePrompt
                      newStatus={statusPrompt.newStatus}
                      onCancel={() => setStatusPrompt(null)}
                      onSave={handleStatusSave}
                    />
                  </div>
                )}

                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/50">
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {t.description || 'No description provided.'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Update History</h4>
                      {!Array.isArray(t.updates) || t.updates.length === 0 ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <MessageSquarePlus size={13} /> No updates yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {[...t.updates].reverse().map((u, i) => (
                            <div key={i} className="p-2.5 bg-white border border-gray-100 rounded-lg text-sm">
                              <p className="text-gray-700">{u.note || 'Status updated'}</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {u.updatedByName || 'Unknown'} · {relativeTime(u.date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <CommentsSection taskId={t._id} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
