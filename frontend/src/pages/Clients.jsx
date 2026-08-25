import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search, Building2, Pencil, Trash2, Download } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Badge, Avatar, Button, Spinner, EmptyState, PageHeader, Card, Drawer, formatDate, isOverdue, downloadCSV } from '../components/ui'
import ClientModal from '../components/ClientModal'
import ClientReportsTab from '../components/ClientReportsTab'
import ClientVaultTab from '../components/ClientVaultTab'

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 shrink-0">{label}</span>
      {value ? (
        typeof value === 'string' && value.startsWith('http') ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline truncate">
            {value}
          </a>
        ) : (
          <span className="text-sm text-gray-700 text-right truncate">{value}</span>
        )
      ) : (
        <span className="text-sm text-gray-300">—</span>
      )}
    </div>
  )
}

export default function Clients() {
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [drawerClient, setDrawerClient] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [cRes, tRes] = await Promise.all([api.get('/clients'), api.get('/tasks')])
      setClients(cRes.data || [])
      setTasks(tRes.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const serviceTypes = useMemo(
    () => [...new Set(clients.map((c) => c.serviceType).filter(Boolean))],
    [clients]
  )

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search && !`${c.name} ${c.clientId || ''} ${c.contactPerson || ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (serviceFilter && c.serviceType !== serviceFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      return true
    })
  }, [clients, search, serviceFilter, statusFilter])

  const clientTasks = useMemo(
    () =>
      drawerClient
        ? tasks.filter((t) => {
            const id = t.client?._id || t.client
            return id === drawerClient._id
          })
        : [],
    [drawerClient, tasks]
  )

  const openDrawer = (client) => {
    setDrawerClient(client)
    setActiveTab('overview')
  }

  const drawerTabs = useMemo(() => {
    const tabs = [
      { key: 'overview', label: 'Overview' },
      { key: 'tasks', label: `Tasks${drawerClient ? ` (${clientTasks.length})` : ''}` },
      { key: 'reports', label: 'Reports' },
    ]
    if (isManager) tabs.push({ key: 'vault', label: 'Vault' })
    return tabs
  }, [isManager, drawerClient, clientTasks])

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/clients/${client._id}`)
      toast.success('Client deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete client')
    }
  }

  const exportCsv = () => {
    downloadCSV(
      'clients.csv',
      filtered.map((c) => ({
        ID: c.clientId || '',
        Name: c.name,
        Service: c.serviceType || '',
        SubService: c.subService || '',
        Status: c.status || '',
        Package: c.package || '',
        MonthlyFee: c.monthlyFee ?? '',
        ContactPerson: c.contactPerson || '',
        ContactEmail: c.contactEmail || '',
        ContactPhone: c.contactPhone || '',
        StartDate: c.startDate ? String(c.startDate).slice(0, 10) : '',
      }))
    )
  }

  if (loading) return <Spinner label="Loading clients..." />

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${filtered.length} client${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download size={15} />
              Export CSV
            </Button>
            <Button onClick={() => { setEditingClient(null); setModalOpen(true) }} className="px-4">
              <Plus size={16} />
              Add Client
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
            placeholder="Search clients..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Services</option>
          {serviceTypes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Churned">Churned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} message="No clients found" hint="Adjust filters or add a new client" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-400 font-medium">
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Package</th>
                  <th className="px-4 py-2.5">Monthly Fee</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => openDrawer(c)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.clientId || ''}</p>
                    </td>
                    <td className="px-4 py-2.5"><Badge text={c.serviceType} /></td>
                    <td className="px-4 py-2.5"><Badge text={c.status} type="status" /></td>
                    <td className="px-4 py-2.5 text-gray-500">{c.package || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">
                      {c.monthlyFee != null && c.monthlyFee !== ''
                        ? Number(c.monthlyFee).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.contactPerson || '—'}</td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingClient(c); setModalOpen(true) }}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer open={Boolean(drawerClient)} onClose={() => setDrawerClient(null)} title={drawerClient?.name || ''}>
        {drawerClient && (
          <div>
            <div className="flex items-center gap-1 border-b border-gray-200 -mx-5 px-5 mb-4">
              {drawerTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-2.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors duration-150 ${
                    activeTab === t.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={drawerClient.name} size="lg" />
                  <div>
                    <Badge text={drawerClient.status} type="status" />
                    <p className="text-xs text-gray-400 mt-1.5">Since {formatDate(drawerClient.startDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  <Card className="p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Open Tasks</p>
                    <p className="text-xl font-semibold tracking-tight text-gray-900 mt-0.5">
                      {clientTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Completed</p>
                    <p className="text-xl font-semibold tracking-tight text-gray-900 mt-0.5">
                      {clientTasks.filter((t) => t.status === 'Completed').length}
                    </p>
                  </Card>
                </div>

                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Details</h4>
                <DetailRow label="Service" value={drawerClient.serviceType} />
                {drawerClient.subService && <DetailRow label="Sub Service" value={drawerClient.subService} />}
                {drawerClient.package && <DetailRow label="Package" value={drawerClient.package} />}
                {drawerClient.monthlyFee != null && drawerClient.monthlyFee !== '' && (
                  <DetailRow label="Monthly Fee" value={Number(drawerClient.monthlyFee).toLocaleString()} />
                )}
                {drawerClient.contactPerson && <DetailRow label="Contact" value={drawerClient.contactPerson} />}
                {drawerClient.contactEmail && <DetailRow label="Email" value={drawerClient.contactEmail} />}
                {drawerClient.contactPhone && <DetailRow label="Phone" value={drawerClient.contactPhone} />}
                {drawerClient.websiteUrl && <DetailRow label="Website" value={drawerClient.websiteUrl} />}
                {drawerClient.gbpUrl && <DetailRow label="GBP" value={drawerClient.gbpUrl} />}
                {drawerClient.notes && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 whitespace-pre-wrap">
                    {drawerClient.notes}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                {clientTasks.length === 0 ? (
                  <p className="text-xs text-gray-400">No tasks for this client yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {clientTasks.map((t) => (
                      <div key={t._id} className={`flex items-center gap-2.5 p-2.5 bg-white border-l-2 rounded-lg ${
                        isOverdue(t.dueDate) && t.status !== 'Completed'
                          ? 'border-red-400'
                          : t.status === 'Completed'
                            ? 'border-emerald-400'
                            : 'border-blue-400'
                      } border border-gray-100 shadow-card`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                          <p className="text-[11px] text-gray-400">
                            {t.assignedTo?.name || 'Unassigned'} · Due {formatDate(t.dueDate)}
                          </p>
                        </div>
                        <Badge text={t.status} type="status" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reports' && <ClientReportsTab clientId={drawerClient._id} />}

            {activeTab === 'vault' && isManager && <ClientVaultTab clientId={drawerClient._id} />}
          </div>
        )}
      </Drawer>

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={editingClient}
        onSaved={load}
      />
    </div>
  )
}
