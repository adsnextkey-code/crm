import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import { Avatar, Spinner, PageHeader } from '../components/ui'
import TaskModal from '../components/TaskModal'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PRIORITY_BORDER = {
  High: 'border-l-red-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-emerald-500',
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function Calendar() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/tasks')
        setTasks(res.data || [])
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const days = useMemo(() => {
    const first = startOfMonth(viewDate)
    const dayOfWeek = (first.getDay() + 6) % 7
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - dayOfWeek)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      return d
    })
  }, [viewDate])

  const tasksByDay = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (!t.dueDate) continue
      const d = new Date(t.dueDate)
      if (d.getFullYear() !== viewDate.getFullYear() || d.getMonth() !== viewDate.getMonth()) continue
      const key = String(t.dueDate).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.priority === 'High' ? -1 : b.priority === 'High' ? 1 : 0))
    )
    return map
  }, [tasks, viewDate])

  const openTask = (task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  if (loading) return <Spinner label="Loading calendar..." />

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewDate((d) => addMonths(d, -1))}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors duration-150"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewDate(startOfMonth(new Date()))}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              Today
            </button>
            <button
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors duration-150"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

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
            const isToday = sameDay(day, new Date())
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
            const dayTasks = tasksByDay[key] || []
            return (
              <div
                key={i}
                className={`min-h-[110px] p-1.5 border-b border-r border-gray-100 last:border-r-0 ${
                  i >= 35 ? 'border-b-0' : ''
                } ${inMonth ? 'bg-white' : 'bg-gray-50/60'}`}
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
                  {dayTasks.slice(0, 3).map((t) => (
                    <button
                      key={t._id}
                      onClick={() => openTask(t)}
                      className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-white border border-l-2 border-gray-100 ${
                        PRIORITY_BORDER[t.priority] || 'border-l-gray-400'
                      } hover:bg-gray-50 transition-colors duration-150 text-left`}
                    >
                      <Avatar name={t.assignedTo?.name} size="xs" />
                      <span className={`text-[11px] truncate flex-1 ${inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                        {t.title}
                      </span>
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-gray-400 pl-1.5">+{dayTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tasks.some((t) => !t.dueDate) && tasks.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
          <CalendarDays size={13} />
          Tasks without a due date are not shown
        </p>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editingTask}
        onSaved={async () => {
          try {
            const res = await api.get('/tasks')
            setTasks(res.data || [])
          } catch {
            window.location.reload()
          }
        }}
      />
    </div>
  )
}
