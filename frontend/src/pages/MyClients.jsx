import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, ChevronRight, ListTodo, FileText } from 'lucide-react'
import api from '../utils/api'
import { Badge, Card, Drawer, Spinner, EmptyState, PageHeader, formatDate, isOverdue } from '../components/ui'
import ClientReportsTab from '../components/ClientReportsTab'

const STATUS_TONE = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Paused: 'bg-amber-50 text-amber-700 border-amber-100',
  Churned: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function MyClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [detailLoading, setDetailLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/clients')
      .then((res) => setClients(res.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.name, c.serviceType, c.clientId, c.partnerName].some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [clients, search])

  const openDetail = async (client, initialTab = 'tasks') => {
    setActiveTab(initialTab)
    setSelected({ ...client, tasks: null })
    setDetailLoading(true)
    try {
      const res = await api.get(`/clients/${client._id}`)
      setSelected({ ...client, ...(res.data || {}), tasks: res.data?.tasks || [] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load client details')
      setSelected({ ...client, tasks: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) return <Spinner label="Loading your clients..." />

  return (
    <div>
      <PageHeader
        title="My Projects & Clients"
        subtitle={`${filtered.length} project${filtered.length === 1 ? '' : 's'} you are actively working on`}
        actions={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects / clients..."
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-56"
          />
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} message="No projects assigned yet" hint="Projects appear here automatically when tasks are assigned to you" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c._id} className="p-4 hover:border-gray-300 transition-colors duration-150 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold tracking-tight text-gray-900 truncate">{c.name}</h3>
                      <p className="text-[11px] text-gray-400 truncate">{c.serviceType || 'Marketing Project'}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      STATUS_TONE[c.status] || STATUS_TONE.Churned
                    }`}
                  >
                    {c.status || 'Active'}
                  </span>
                </div>
                {c.partnerName && (
                  <p className="text-xs text-gray-500 mt-2.5">
                    Partner: <span className="font-semibold text-indigo-700">{c.partnerName}</span>
                  </p>
                )}
                {c.package && (
                  <p className="text-xs text-gray-500 mt-1">
                    Package: <span className="font-medium text-gray-700">{c.package}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => openDetail(c, 'tasks')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors duration-150"
                >
                  <ListTodo size={13} />
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => openDetail(c, 'reports')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors duration-150"
                >
                  <FileText size={13} />
                  Reports / Deliverables
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || 'Project Details'}
      >
        {detailLoading || !selected ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading project...</div>
        ) : (
          <div>
            <div className="flex border-b border-gray-200 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors duration-150 ${
                  activeTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Tasks ({(selected.tasks || []).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors duration-150 ${
                  activeTab === 'reports'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Weekly & Monthly Reports
              </button>
            </div>

            {activeTab === 'tasks' && (
              <div>
                {(selected.tasks || []).length === 0 ? (
                  <EmptyState icon={ListTodo} message="No tasks assigned for this client" />
                ) : (
                  <div className="space-y-2">
                    {selected.tasks.map((t) => {
                      const overdue = isOverdue(t.dueDate) && t.status !== 'Completed' && t.status !== 'Cancelled'
                      return (
                        <button
                          key={t._id}
                          onClick={() => navigate(`/my-tasks?task=${t._id}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                            {t.dueDate && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Due {formatDate(t.dueDate)}
                                {overdue && <span className="text-red-600 font-medium"> · Overdue</span>}
                              </p>
                            )}
                          </div>
                          <Badge text={t.priority} type="priority" />
                          <Badge text={t.status} type="status" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <ClientReportsTab clientId={selected._id} />
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
