import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { History, Send, MessageSquare, Clock, Repeat, Trash2 } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Modal, Input, Select, Textarea, Avatar, Button, formatDate, relativeTime } from './ui'

const STATUSES = ['Pending', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled']
const PRIORITIES = ['High', 'Medium', 'Low']
const RECURRENCES = [
  ['none', 'None'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
]

const EMPTY = {
  title: '',
  description: '',
  client: '',
  serviceType: '',
  assignedTo: '',
  department: '',
  priority: 'Medium',
  dueDate: '',
  status: 'Pending',
  recurrence: 'none',
  campaignId: '',
}

export function formatDuration(minutes) {
  const m = Number(minutes) || 0
  if (m <= 0) return '0m'
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function CommentText({ text, members }) {
  const parts = useMemo(() => {
    const names = members.map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length)
    if (!names.length || !text.includes('@')) return [text]
    const regex = new RegExp(`@(${names.map(escapeRegExp).join('|')})\\b`, 'g')
    return text.split(regex)
  }, [text, members])
  return (
    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-medium text-indigo-600 bg-indigo-50 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

export function CommentsSection({ taskId }) {
  const [comments, setComments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState([])
  const [team, setTeam] = useState([])
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    let mounted = true
    Promise.all([api.get(`/tasks/${taskId}/comments`), api.get('/team')])
      .then(([cRes, tRes]) => {
        if (!mounted) return
        setComments(Array.isArray(cRes.data) ? cRes.data : cRes.data?.comments || [])
        setTeam(tRes.data || [])
      })
      .catch(() => {})
      .finally(() => mounted && setLoaded(true))
    return () => {
      mounted = false
    }
  }, [taskId])

  const mentionQuery = useMemo(() => {
    const match = text.match(/@([\w ]*)$/)
    return match ? match[1].trim().toLowerCase() : null
  }, [text])

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    return team
      .filter((m) => !mentions.some((x) => x.id === m._id))
      .filter((m) => (m.name || '').toLowerCase().includes(mentionQuery))
      .slice(0, 5)
  }, [mentionQuery, team, mentions])

  const pickMention = (member) => {
    setText((t) => t.replace(/@([\w ]*)$/, `@${member.name} `))
    setMentions((prev) => [...prev, { id: member._id, name: member.name }])
    inputRef.current?.focus()
  }

  const submitComment = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      await api.post(`/tasks/${taskId}/comments`, { text: trimmed, mentions: mentions.map((m) => m.id) })
      const res = await api.get(`/tasks/${taskId}/comments`)
      setComments(Array.isArray(res.data) ? res.data : res.data?.comments || [])
      setText('')
      setMentions([])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment')
    } finally {
      setSending(false)
    }
  }

  const deleteComment = async (commentId) => {
    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c._id !== commentId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete comment')
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 mb-3">
        <MessageSquare size={14} className="text-gray-400" />
        Comments
      </h4>

      <div>
        <div className="relative">
          <textarea
            ref={inputRef}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !mentionCandidates.length) {
                e.preventDefault()
                submitComment()
              }
            }}
            placeholder="Write a comment... use @ to mention someone"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
              {mentionCandidates.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickMention(m)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-gray-50 transition-colors duration-150 text-left"
                >
                  <Avatar name={m.name} size="xs" />
                  <span className="text-sm text-gray-700 truncate">{m.name}</span>
                  {m.department && <span className="ml-auto text-[11px] text-gray-400 shrink-0">{m.department}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <Button onClick={submitComment} disabled={sending || !text.trim()} className="px-3 py-1.5">
            <Send size={13} />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 mt-4 max-h-64 overflow-y-auto pr-1">
        {!loaded ? (
          <p className="text-xs text-gray-400">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-400">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div key={c._id || c.createdAt} className="flex items-start gap-2.5 group">
              <Avatar name={c.userName || c.user?.name} size="sm" />
              <div className="min-w-0 flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900">{c.userName || c.user?.name || 'Unknown'}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400">{relativeTime(c.createdAt)}</span>
                    {c._id && (
                      <button
                        onClick={() => deleteComment(c._id)}
                        title="Delete"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[11px] font-medium text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  <CommentText text={c.text} members={team} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TimeTrackingSection({ task, onChanged }) {
  const { user } = useAuth()
  const [logs, setLogs] = useState(Array.isArray(task.timeLogs) ? task.timeLogs : [])
  const [minutes, setMinutes] = useState('')
  const [billable, setBillable] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const totalMinutes = logs.reduce((s, l) => s + (Number(l.minutes) || 0), 0)
  const billableMinutes = logs
    .filter((l) => l.billable)
    .reduce((s, l) => s + (Number(l.minutes) || 0), 0)

  const applyTask = (updated) => {
    if (updated && Array.isArray(updated.timeLogs)) {
      setLogs(updated.timeLogs)
      onChanged?.(updated)
    }
  }

  const logTime = async () => {
    const mins = parseInt(minutes, 10)
    if (!Number.isInteger(mins) || mins <= 0) {
      toast.error('Enter minutes as a positive number')
      return
    }
    setSaving(true)
    try {
      const res = await api.post(`/tasks/${task._id}/time`, { minutes: mins, billable, note })
      applyTask(res.data)
      setMinutes('')
      setNote('')
      toast.success('Time logged')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log time')
    } finally {
      setSaving(false)
    }
  }

  const deleteLog = async (logId) => {
    try {
      const res = await api.delete(`/tasks/${task._id}/time/${logId}`)
      applyTask(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete time log')
    }
  }

  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900">
          <Clock size={14} className="text-gray-400" />
          Time Tracking
        </h4>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{formatDuration(totalMinutes)}</p>
          {billableMinutes > 0 && (
            <p className="text-[11px] text-gray-400">{formatDuration(billableMinutes)} billable</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[15, 30, 60, 120].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(String(m))}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
              String(m) === minutes
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
            }`}
          >
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </button>
        ))}
        <input
          type="number"
          min="1"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Min"
          className="w-20 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="accent-indigo-600"
          />
          Billable
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
          className="flex-1 min-w-[140px] bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
        <Button onClick={logTime} disabled={saving} className="px-3 py-1.5 text-xs">
          Log
        </Button>
      </div>

      <div className="space-y-2 mt-3 max-h-48 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-400">No time logged yet</p>
        ) : (
          sorted.map((l) => {
            const canDelete =
              user && (user.role === 'manager' || String(l.userId) === String(user._id))
            return (
              <div key={l._id} className="flex items-start gap-2.5 group p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                <Avatar name={l.userName} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-900">{l.userName || 'Unknown'}</p>
                    <span className="text-xs text-gray-500">{formatDuration(l.minutes)}</span>
                    {l.billable && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        Billable
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {relativeTime(l.date)} · {formatDate(l.date)}
                    {l.note && ` · ${l.note}`}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteLog(l._id)}
                    title="Delete"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded text-gray-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function TaskModal({ open, onClose, task, onSaved }) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState(EMPTY)
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
  const [campaignOptions, setCampaignOptions] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([api.get('/clients'), api.get('/team')])
      .then(([cRes, tRes]) => {
        setClients(cRes.data || [])
        setTeam(tRes.data || [])
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load form data'))
  }, [open])

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        client: task.client?._id || task.client || '',
        serviceType: task.serviceType || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        department: task.department || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : '',
        status: task.status || 'Pending',
        recurrence: task.recurrence || 'none',
        campaignId: task.campaignId || task.campaign?._id || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [task, open])

  useEffect(() => {
    if (!open || !form.client) return
    let mounted = true
    api
      .get(`/campaigns`, { params: { clientId: form.client } })
      .then((res) => {
        if (mounted) setCampaignOptions(res.data || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [open, form.client])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'client') {
        const c = clients.find((x) => x._id === value)
        if (c && c.serviceType) next.serviceType = c.serviceType
        next.campaignId = ''
      }
      if (key === 'assignedTo') {
        const m = team.find((x) => x._id === value)
        if (m && m.department) next.department = m.department
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.client || !form.assignedTo || !form.dueDate) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.campaignId) delete payload.campaignId
      if (isEdit) {
        await api.put(`/tasks/${task._id}`, payload)
        toast.success('Task updated')
      } else {
        await api.post('/tasks', payload)
        toast.success('Task created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} task`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" required value={form.title} onChange={set('title')} placeholder="Task title" />
        <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Describe the task..." rows={3} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Client" required value={form.client} onChange={set('client')}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
          <Input label="Service Type" value={form.serviceType} onChange={set('serviceType')} placeholder="Auto-filled from client" />
        </div>

        {form.client && (
          <Select label="Campaign" value={form.campaignId} onChange={set('campaignId')}>
            <option value="">No campaign</option>
            {campaignOptions.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Assigned To" required value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">Select member</option>
            {team.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </Select>
          <Input label="Department" value={form.department} onChange={set('department')} placeholder="Auto-filled from assignee" />
        </div>

        <div className={`grid gap-4 ${isEdit ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
          <Input label="Due Date" required type="date" value={form.dueDate} onChange={set('dueDate')} />
          {isEdit && (
            <Select label="Status" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          )}
        </div>

        <div>
          <Select label="Recurrence" value={form.recurrence} onChange={set('recurrence')}>
            {RECURRENCES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <p className="text-[11px] text-gray-400 mt-1">Next task is created automatically when this is completed</p>
        </div>

        <Button type="submit" disabled={saving} className="w-full py-2.5">
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </form>

      {isEdit && task._id && (
        <TimeTrackingSection
          task={task}
          onChanged={() => {
            onSaved?.()
          }}
        />
      )}

      {isEdit && Array.isArray(task.updates) && task.updates.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 mb-3">
            <History size={14} className="text-gray-400" />
            Activity History
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {[...task.updates].reverse().map((u, i) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                <p className="text-gray-700">{u.note || 'Status updated'}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {u.updatedByName || 'Unknown'} � {formatDate(u.date)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEdit && task._id && <CommentsSection taskId={task._id} />}
    </Modal>
  )
}
