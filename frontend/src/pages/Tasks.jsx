import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search, Download, KanbanSquare, GripVertical, Clock, Repeat } from 'lucide-react'
import api from '../utils/api'
import { Badge, Avatar, Button, Spinner, EmptyState, PageHeader, formatDate, isOverdue, downloadCSV } from '../components/ui'
import TaskModal, { formatDuration } from '../components/TaskModal'

const COLUMNS = ['Pending', 'In Progress', 'Review', 'Completed', 'On Hold']
const RECURRENCE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [dragTaskId, setDragTaskId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  useEffect(() => {
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
    load()
    api.get('/team').then((r) => setTeam(r.data || [])).catch(() => {})
  }, [])

  const serviceTypes = useMemo(
    () => [...new Set(tasks.map((t) => t.serviceType).filter(Boolean))],
    [tasks]
  )

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !`${t.title} ${t.taskId || ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (assigneeFilter) {
        const id = t.assignedTo?._id || t.assignedTo
        if (id !== assigneeFilter) return false
      }
      if (serviceFilter && t.serviceType !== serviceFilter) return false
      return true
    })
  }, [tasks, search, statusFilter, assigneeFilter, serviceFilter])

  const openCreate = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const openEdit = (task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  const handleDrop = async (column) => {
    setDragOverCol(null)
    const task = tasks.find((t) => t._id === dragTaskId)
    setDragTaskId(null)
    if (!task || task.status === column) return
    const prev = tasks
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status: column } : t)))
    try {
      await api.put(`/tasks/${task._id}`, { status: column })
      toast.success(`Moved to ${column}`)
    } catch (err) {
      setTasks(prev)
      toast.error(err.response?.data?.message || 'Failed to update task status')
    }
  }

  const exportCsv = () => {
    downloadCSV(
      'tasks.csv',
      filtered.map((t) => ({
        ID: t.taskId || '',
        Title: t.title,
        Client: t.client?.name || '',
        Service: t.serviceType || '',
        Assignee: t.assignedTo?.name || '',
        Department: t.department || '',
        Priority: t.priority,
        Status: t.status,
        DueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
      }))
    )
  }

  if (loading) return <Spinner label="Loading tasks..." />

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${filtered.length} task${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download size={15} />
              Export CSV
            </Button>
            <Button onClick={openCreate} className="px-4">
              <Plus size={16} />
              New Task
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150"
          />
        </div>
        {[
          [statusFilter, setStatusFilter, 'All Statuses', COLUMNS],
          [assigneeFilter, setAssigneeFilter, 'All Assignees', team.map((m) => ({ v: m._id, l: m.name }))],
          [serviceFilter, setServiceFilter, 'All Services', serviceTypes],
        ].map(([value, setter, label, options], i) => (
          <select
            key={i}
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">{label}</option>
            {options.map((o) => {
              const v = typeof o === 'string' ? o : o.v
              const l = typeof o === 'string' ? o : o.l
              return (
                <option key={v} value={v}>{l}</option>
              )
            })}
          </select>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={KanbanSquare} message="No tasks found" hint="Adjust filters or create a new task" />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col)
            const isTarget = dragOverCol === col
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOverCol !== col) setDragOverCol(col)
                }}
                onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
                onDrop={() => handleDrop(col)}
                className={`w-[290px] shrink-0 rounded-xl p-1.5 transition-all duration-150 ${
                  isTarget ? 'ring-2 ring-indigo-200 bg-indigo-50/40' : ''
                }`}
              >
                <div className="flex items-center justify-between px-2.5 py-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">{col}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                    {colTasks.length}
                  </span>
                </div>
                <div className={`space-y-2 min-h-[80px] rounded-lg ${isTarget ? 'border-2 border-dashed border-indigo-300 p-1.5' : ''}`}>
                  {colTasks.map((t) => {
                    const overdue = isOverdue(t.dueDate) && t.status !== 'Completed' && t.status !== 'Cancelled'
                    return (
                      <div
                        key={t._id}
                        draggable
                        onDragStart={() => setDragTaskId(t._id)}
                        onDragEnd={() => {
                          setDragTaskId(null)
                          setDragOverCol(null)
                        }}
                        onClick={() => openEdit(t)}
                        className={`bg-white border border-gray-200 rounded-xl shadow-card p-3.5 cursor-pointer hover:border-gray-300 transition-all duration-150 ${
                          dragTaskId === t._id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={13} className="text-gray-300 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{t.title}</h4>
                            {t.taskId && <p className="text-[11px] text-gray-400 mt-1">#{t.taskId}</p>}
                            <div className="mt-2"><Badge text={t.priority} type="priority" /></div>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar name={t.assignedTo?.name} size="xs" />
                            <span className="text-[11px] text-gray-500 truncate">{t.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2 min-w-0">
                            {t.totalMinutes > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0" title={`${formatDuration(t.totalMinutes)} logged`}>
                                <Clock size={11} />
                                {formatDuration(t.totalMinutes)}
                              </span>
                            )}
                            {t.dueDate && (
                              <span className={`text-[11px] shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                {formatDate(t.dueDate)}
                              </span>
                            )}
                            {t.recurrence && t.recurrence !== 'none' && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
                                <Repeat size={11} />
                                {RECURRENCE_LABELS[t.recurrence]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {colTasks.length === 0 && (
                    <p className="text-center text-[11px] text-gray-300 py-6">Drop tasks here</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
