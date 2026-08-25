import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Lock,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Circle,
  MessageSquare,
} from 'lucide-react'
import api from '../utils/api'
import {
  Card,
  Avatar,
  Button,
  Spinner,
  EmptyState,
  PageHeader,
  Drawer,
  Modal,
  Textarea,
  formatDate,
  relativeTime,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import ContentModal, { CONTENT_TYPES, PLATFORMS } from '../components/ContentModal'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATUSES = ['Brief', 'Production', 'Internal Review', 'Approved', 'Scheduled', 'Published']

const STATUS_DOT = {
  Brief: 'bg-gray-400',
  Production: 'bg-blue-500',
  'Internal Review': 'bg-amber-500',
  Approved: 'bg-emerald-500',
  Scheduled: 'bg-violet-500',
  Published: 'bg-teal-500',
}

const STATUS_PILL = {
  Brief: 'bg-gray-100 text-gray-600',
  Production: 'bg-blue-50 text-blue-700',
  'Internal Review': 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Scheduled: 'bg-violet-50 text-violet-700',
  Published: 'bg-teal-50 text-teal-700',
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
        STATUS_PILL[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
      {status}
    </span>
  )
}

function PlatformChip({ platform }) {
  return (
    <span
      title={platform}
      className="inline-flex items-center justify-center h-5 w-5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-600 uppercase shrink-0"
    >
      {platform?.[0] || '?'}
    </span>
  )
}

function Stepper({ status }) {
  const currentIdx = STATUSES.indexOf(status)
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Workflow</p>
      <div className="flex items-start">
        {STATUSES.map((stage, i) => {
          const done = i < currentIdx
          const current = i === currentIdx
          const last = i === STATUSES.length - 1
          return (
            <div key={stage} className={`flex ${last ? '' : 'flex-1'} flex-col items-center min-w-0`}>
              <div className="flex items-center w-full">
                <div
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold shrink-0 ${
                    done
                      ? 'bg-indigo-600 text-white'
                      : current
                        ? 'border-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                        : 'border border-gray-300 text-gray-400 bg-white'
                  }`}
                >
                  {done ? <CheckCircle2 size={13} /> : i + 1}
                </div>
                {!last && (
                  <div className={`h-0.5 flex-1 mx-1 ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </div>
              <span
                title={stage}
                className={`mt-1.5 text-[9px] leading-tight text-center ${
                  current ? 'text-indigo-600 font-semibold' : done ? 'text-gray-600 font-medium' : 'text-gray-400'
                }`}
              >
                {stage}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReasonModal({ open, onClose, title, confirmLabel, onConfirm }) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) setNote('')
  }, [open])
  const valid = note.trim().length >= 5
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onConfirm(note.trim())
        }}
        className="space-y-4"
      >
        <Textarea
          label="Reason"
          required
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain what needs to change..."
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ContentDrawer({ item, onClose, onChanged, onEdit }) {
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [feedbackText, setFeedbackText] = useState('')
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonConfig, setReasonConfig] = useState({ title: '', confirmLabel: '', targetStatus: '' })
  const [scheduleDate, setScheduleDate] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFeedbackText('')
    setScheduleDate(item?.scheduledDate ? String(item.scheduledDate).slice(0, 10) : '')
  }, [item?._id])

  if (!item) return null

  const clientId = item.clientId?._id || item.clientId

  const transition = async (status, extra = {}) => {
    setBusy(true)
    try {
      await api.put(`/content/${item._id}/status`, { status, ...extra })
      toast.success(`Moved to ${status}`)
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    } finally {
      setBusy(false)
    }
  }

  const sendFeedback = async () => {
    if (!feedbackText.trim()) return
    try {
      const res = await api.post(`/content/${item._id}/feedback`, { text: feedbackText.trim() })
      setFeedbackText('')
      onChanged(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send feedback')
    }
  }

  const openReason = (targetStatus) => {
    setReasonConfig(
      targetStatus === 'Internal Review' || item.status === 'Internal Review'
        ? { title: 'Reject to Production', confirmLabel: 'Reject', targetStatus: 'Production' }
        : { title: 'Send Back to Production', confirmLabel: 'Send Back', targetStatus: 'Production' }
    )
    setReasonOpen(true)
  }

  const actions = []
  if (isManager || String(item.assignedTo) === String(user?._id)) {
    if (item.status === 'Brief') {
      actions.push(
        <Button key="start" disabled={busy} onClick={() => transition('Production')}>
          Start Production
        </Button>
      )
    }
    if (item.status === 'Production') {
      actions.push(
        <Button key="review" disabled={busy} onClick={() => transition('Internal Review')}>
          Send to Internal Review
        </Button>
      )
    }
  }
  if (item.status === 'Internal Review') {
    actions.push(
      <button
        key="approve"
        disabled={busy}
        onClick={() => transition('Approved')}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <CheckCircle2 size={14} />
        Approve
      </button>,
      <button
        key="reject"
        disabled={busy}
        onClick={() => openReason()}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-60 bg-red-600 hover:bg-red-700 text-white"
      >
        <XCircle size={14} />
        Reject
      </button>
    )
  }
  if (item.status === 'Approved') {
    actions.push(
      <div key="schedule" className="flex items-center gap-2 w-full">
        <input
          type="date"
          value={scheduleDate}
          onChange={(e) => setScheduleDate(e.target.value)}
          className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          disabled={busy || !scheduleDate}
          title={scheduleDate ? 'Mark Scheduled' : 'Pick a scheduled date first'}
          onClick={() => transition('Scheduled', { scheduledDate: scheduleDate })}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Mark Scheduled
        </button>
      </div>
    )
  }
  if ((isManager || String(item.assignedTo) === String(user?._id)) && item.status === 'Scheduled') {
    actions.push(
      <Button key="publish" disabled={busy} onClick={() => transition('Published')}>
        Mark Published
      </Button>
    )
  }
  if (isManager && ['Internal Review', 'Approved', 'Scheduled'].includes(item.status)) {
    actions.push(
      <Button
        key="rework"
        variant="secondary"
        disabled={busy}
        onClick={() =>
          setReasonConfig({
            title: 'Send Back to Production',
            confirmLabel: 'Send Back',
            targetStatus: 'Production',
          })
        }
        className="w-full"
      >
        Send Back to Production
      </Button>
    )
  }

  return (
    <Drawer open={Boolean(item)} onClose={onClose} title={item.title}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusPill status={item.status} />
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium">
              v{item.revisions}
            </span>
            {item.locked && (
              <span
                title="Approved version is locked"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium"
              >
                <Lock size={10} />
                Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!item.locked && (
              <Button variant="secondary" onClick={() => onEdit(item)} className="px-2.5 py-1.5 text-xs">
                <Pencil size={13} />
                Edit
              </Button>
            )}
            {item.locked && (
              <span
                title="Approved version is locked"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-400 cursor-not-allowed select-none"
              >
                <Lock size={12} />
                Edit
              </span>
            )}
            {isManager && (
              <Button
                variant="danger"
                className="px-2.5 py-1.5 text-xs"
                onClick={async () => {
                  if (!window.confirm(`Delete content "${item.title}"?`)) return
                  try {
                    await api.delete(`/content/${item._id}`)
                    toast.success('Content deleted')
                    onClose()
                    onChanged()
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to delete content')
                  }
                }}
              >
                <Trash2 size={13} />
                Delete
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <Stepper status={item.status} />
        </Card>

        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Client</span>
            <span className="font-medium text-gray-900 truncate">{item.clientId?.name || '-'}</span>
          </div>
          {item.campaignId && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Campaign</span>
              <span className="font-medium text-gray-900 truncate">{item.campaignId.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Type / Platform</span>
            <span className="flex items-center gap-2 text-gray-700">
              {item.contentType}
              <PlatformChip platform={item.platform} />
              <span className="text-gray-500">{item.platform}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scheduled</span>
            <span className="text-gray-700">{item.scheduledDate ? formatDate(item.scheduledDate) : '-'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assignee</span>
            <span className="flex items-center gap-2 min-w-0">
              <Avatar name={item.assignedToName} size="xs" />
              <span className="text-gray-700 truncate">{item.assignedToName || 'Unassigned'}</span>
            </span>
          </div>
        </div>

        {item.caption && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Caption</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.caption}</p>
          </div>
        )}

        {item.creativeFile?.fileData && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Creative</p>
            <a
              href={item.creativeFile.fileData}
              download={item.creativeFile.name || 'creative'}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-indigo-600 hover:bg-gray-50 transition-colors duration-150"
            >
              Download {item.creativeFile.name || 'creative file'}
            </a>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">History</p>
          <div className="space-y-3">
            {[...(item.history || [])].reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {i === 0 ? (
                    <span className="block h-2 w-2 rounded-full bg-indigo-600" />
                  ) : (
                    <Circle size={8} className="text-gray-300 fill-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{h.userName}</span> moved to{' '}
                    <span className="font-medium">{h.status}</span>
                  </p>
                  {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{relativeTime(h.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare size={12} />
            Feedback ({(item.feedback || []).length})
          </p>
          <div className="space-y-2.5">
            {(item.feedback || []).length === 0 && (
              <p className="text-xs text-gray-400">No feedback yet</p>
            )}
            {(item.feedback || []).map((f, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                <Avatar name={f.userName} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-800 truncate">{f.userName}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{relativeTime(f.at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-3">
            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add feedback..."
              className="flex-1 min-w-0 resize-y bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Button onClick={sendFeedback} disabled={!feedbackText.trim()} className="shrink-0">
              Send
            </Button>
          </div>
        </div>
      </div>

      <ReasonModal
        open={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title={reasonConfig.title}
        confirmLabel={reasonConfig.confirmLabel}
        onConfirm={(note) => {
          setReasonOpen(false)
          transition(reasonConfig.targetStatus, { note })
        }}
      />
    </Drawer>
  )
}

export default function ContentCalendar() {
  const [contents, setContents] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('calendar')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const load = async () => {
    try {
      const res = await api.get('/content')
      setContents(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load content')
    }
  }

  useEffect(() => {
    Promise.all([load(), api.get('/clients').then((r) => setClients(r.data || []))])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      contents.filter((c) => {
        if (clientFilter && String(c.clientId?._id || c.clientId) !== clientFilter) return false
        if (statusFilter && c.status !== statusFilter) return false
        if (typeFilter && c.contentType !== typeFilter) return false
        return true
      }),
    [contents, clientFilter, statusFilter, typeFilter]
  )

  const days = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const dayOfWeek = (first.getDay() + 6) % 7
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - dayOfWeek)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      return d
    })
  }, [viewDate])

  const byDay = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      if (!c.scheduledDate) continue
      const d = new Date(c.scheduledDate)
      if (d.getFullYear() !== viewDate.getFullYear() || d.getMonth() !== viewDate.getMonth()) continue
      const key = String(c.scheduledDate).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    return map
  }, [filtered, viewDate])

  const refreshFromItem = (updated) => {
    if (updated?._id) {
      setContents((prev) => prev.map((c) => (c._id === updated._id ? updated : c)))
    } else {
      load()
    }
  }

  const selected = contents.find((c) => c._id === selectedId) || null

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (content) => {
    setSelectedId(null)
    setEditing(content)
    setModalOpen(true)
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  if (loading) return <Spinner label="Loading content..." />

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle={`${filtered.length} item${filtered.length === 1 ? '' : 's'}`}
        actions={
          <Button onClick={openCreate} className="px-4">
            <Plus size={16} />
            New Content
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
          {[
            ['calendar', CalendarDays],
            ['list', List],
          ].map(([key, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={key === 'calendar' ? 'Calendar view' : 'List view'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors duration-150 ${
                view === key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={14} />
              {key === 'calendar' ? 'Calendar' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold tracking-tight text-gray-900">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors duration-150"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setViewDate(new Date())}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                Today
              </button>
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors duration-150"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const inMonth = day.getMonth() === viewDate.getMonth()
                const isToday =
                  day.getFullYear() === new Date().getFullYear() &&
                  day.getMonth() === new Date().getMonth() &&
                  day.getDate() === new Date().getDate()
                const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                const dayItems = byDay[key] || []
                return (
                  <div
                    key={i}
                    className={`min-h-[110px] p-1.5 border-b border-r border-gray-100 last:border-r-0 ${
                      i >= 35 ? 'border-b-0' : ''
                    } ${inMonth ? 'bg-white' : 'bg-gray-50/60'} ${isToday ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : inMonth
                            ? 'text-gray-600'
                            : 'text-gray-300'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayItems.slice(0, 3).map((c) => (
                        <button
                          key={c._id}
                          onClick={() => setSelectedId(c._id)}
                          className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-white border border-gray-100 hover:bg-gray-50 transition-colors duration-150 text-left ${
                            inMonth ? '' : 'opacity-60'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[c.status] || 'bg-gray-400'}`} />
                          <PlatformChip platform={c.platform} />
                          <span className={`text-[11px] truncate flex-1 ${inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                            {c.title}
                          </span>
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <p className="text-[10px] text-gray-400 pl-1.5">+{dayItems.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {filtered.some((c) => !c.scheduledDate) && filtered.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
              <CalendarDays size={13} />
              Items without a scheduled date are not shown on the calendar
            </p>
          )}
        </>
      ) : (
        <Card className="overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {['Title', 'Client', 'Type', 'Platform', 'Status', 'Revision', 'Scheduled', 'Assignee'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => setSelectedId(c._id)}
                  className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[240px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.clientId?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.contentType}</td>
                  <td className="px-4 py-3">
                    <PlatformChip platform={c.platform} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">v{c.revisions}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {c.scheduledDate ? formatDate(c.scheduledDate) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <Avatar name={c.assignedToName} size="xs" />
                      <span className="text-gray-600 truncate max-w-[100px]">{c.assignedToName || '-'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon={CalendarDays} message="No content found" hint="Create your first content item to get started" />}
        </Card>
      )}

      <ContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        content={editing}
        defaultClientId={clientFilter}
        onSaved={load}
      />

      <ContentDrawer
        item={selected}
        onClose={() => setSelectedId(null)}
        onChanged={refreshFromItem}
        onEdit={openEdit}
      />
    </div>
  )
}
