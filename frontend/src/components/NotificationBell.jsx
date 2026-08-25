import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ListTodo, Building2, UserPlus, MessageSquare, AlertCircle, AlarmClock, Megaphone } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { relativeTime } from './ui'

const TYPE_ICONS = {
  task_assigned: ListTodo,
  task_completed: ListTodo,
  assignment: ListTodo,
  comment: MessageSquare,
  mention: MessageSquare,
  client: Building2,
  member: UserPlus,
  reminder: AlarmClock,
  announcement: Megaphone,
  default: AlertCircle,
}

const TASK_TYPES = new Set(['task_assigned', 'task_completed', 'assignment', 'comment', 'mention', 'reminder'])

function targetPath(user, n) {
  if (n.type === 'announcement') return user.role === 'manager' ? '/announcements' : '/my-dashboard'
  if (!n.targetId) return user.role === 'manager' ? '/tasks' : '/my-tasks'
  const isTaskType = TASK_TYPES.has(n.type) || n.type === 'default'
  if (user.role === 'manager') {
    if (isTaskType) return `/tasks?task=${n.targetId}`
    if (n.type === 'client') return '/clients'
    if (n.type === 'member') return '/team'
    return '/tasks'
  }
  return isTaskType ? `/my-tasks?task=${n.targetId}` : '/my-tasks'
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const load = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch {}
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markRead = async (n) => {
    if (!n.read) {
      try {
        await api.put(`/notifications/${n._id}/read`)
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)))
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {}
    }
    setOpen(false)
    navigate(targetPath(user, n))
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold tracking-tight text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</p>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || TYPE_ICONS.default
                return (
                  <button
                    key={n._id}
                    onClick={() => markRead(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors duration-150 ${
                      n.read ? '' : 'bg-indigo-50/60'
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 relative ${
                        n.type === 'reminder'
                          ? 'bg-red-50 border-red-200 text-red-500'
                          : n.type === 'announcement'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-500'
                            : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon size={14} />
                      {n.type === 'reminder' && !n.read && (
                        <span className="absolute h-2 w-2 rounded-full bg-red-500 -top-0.5 -right-0.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
