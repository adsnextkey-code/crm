import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Megaphone, Target, Pencil, Trash2, Link2, Unlink } from 'lucide-react'
import api from '../utils/api'
import {
  Card,
  Badge,
  Avatar,
  Button,
  Spinner,
  EmptyState,
  PageHeader,
  Drawer,
  formatDate,
} from '../components/ui'
import CampaignModal from '../components/CampaignModal'

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']

const STATUS_PILL = {
  Planning: 'bg-gray-100 text-gray-600',
  Active: 'bg-emerald-50 text-emerald-700',
  'On Hold': 'bg-amber-50 text-amber-700',
  Completed: 'bg-blue-50 text-blue-700',
  Cancelled: 'bg-red-50 text-red-700',
}

const formatBudget = (budget) => `Rs ${(Number(budget) || 0).toLocaleString()}`

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        STATUS_PILL[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  )
}

function CampaignDrawer({ campaign, onClose, onChanged, onEdit }) {
  const [tasks, setTasks] = useState([])
  const [clientTasks, setClientTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [linkId, setLinkId] = useState('')

  const clientId = campaign?.clientId?._id || campaign?.clientId

  useEffect(() => {
    if (!campaign) return
    setLoading(true)
    setLinkId('')
    Promise.all([api.get(`/campaigns/${campaign._id}/tasks`), api.get(`/tasks?client=${clientId}`)])
      .then(([cRes, tRes]) => {
        setTasks(cRes.data || [])
        setClientTasks(tRes.data || [])
      })
      .catch(() => toast.error('Failed to load campaign tasks'))
      .finally(() => setLoading(false))
  }, [campaign?._id, clientId])

  if (!campaign) return null

  const linkTask = async () => {
    if (!linkId) return
    try {
      await api.put(`/tasks/${linkId}`, { campaignId: campaign._id })
      const res = await api.get(`/campaigns/${campaign._id}/tasks`)
      setTasks(res.data || [])
      setLinkId('')
      toast.success('Task linked')
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link task')
    }
  }

  const unlinkTask = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}`, { campaignId: null })
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
      toast.success('Task unlinked')
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink task')
    }
  }

  const linkedIds = new Set(tasks.map((t) => String(t._id)))
  const linkable = clientTasks.filter((t) => !linkedIds.has(String(t._id)))

  return (
    <Drawer open={Boolean(campaign)} onClose={onClose} title={campaign.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <StatusPill status={campaign.status} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onEdit(campaign)} className="px-2.5 py-1.5 text-xs">
              <Pencil size={13} />
              Edit
            </Button>
            <Button
              variant="danger"
              className="px-2.5 py-1.5 text-xs"
              onClick={async () => {
                if (!window.confirm(`Delete campaign "${campaign.name}"? Linked tasks will be unlinked.`)) return
                try {
                  await api.delete(`/campaigns/${campaign._id}`)
                  toast.success('Campaign deleted')
                  onClose()
                  onChanged()
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to delete campaign')
                }
              }}
            >
              <Trash2 size={13} />
              Delete
            </Button>
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Client</span>
            <span className="font-medium text-gray-900 truncate">{campaign.clientId?.name || '-'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Budget</span>
            <span className="font-medium text-gray-900">{formatBudget(campaign.budget)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Timeline</span>
            <span className="text-gray-700">
              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Owner</span>
            <span className="flex items-center gap-2 min-w-0">
              <Avatar name={campaign.ownerName} size="xs" />
              <span className="text-gray-700 truncate">{campaign.ownerName || 'Unassigned'}</span>
            </span>
          </div>
        </div>

        {campaign.channels?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Channels</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.channels.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-medium text-gray-600">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {campaign.objective && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Objective</p>
            <p className="text-sm text-gray-700 leading-relaxed">{campaign.objective}</p>
          </div>
        )}

        {campaign.kpis?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Target size={12} />
              KPIs
            </p>
            <div className="space-y-1.5">
              {campaign.kpis.map((kpi, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                  <span className="text-gray-700">{kpi.label}</span>
                  <span className="font-semibold text-gray-900 shrink-0">
                    {(Number(kpi.targetValue) || 0).toLocaleString()} {kpi.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {campaign.notes && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{campaign.notes}</p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Related Tasks ({tasks.length})</p>

          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-gray-400">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-gray-400">No tasks linked to this campaign</p>
            ) : (
              tasks.map((t) => (
                <div key={t._id} className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-200 rounded-lg group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge text={t.status} type="status" />
                      <span className="flex items-center gap-1 text-[11px] text-gray-500 min-w-0">
                        <Avatar name={t.assignedTo?.name} size="xs" />
                        <span className="truncate">{t.assignedTo?.name || 'Unassigned'}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => unlinkTask(t._id)}
                    title="Unlink task"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-3">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1.5">Link task</span>
              <div className="flex items-center gap-2">
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
                >
                  <option value="">Select task...</option>
                  {linkable.map((t) => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
                <Button onClick={linkTask} disabled={!linkId} className="px-3 py-2 shrink-0">
                  <Link2 size={14} />
                  Link
                </Button>
              </div>
            </label>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, clRes] = await Promise.all([api.get('/campaigns'), api.get('/clients')])
        setCampaigns(cRes.data || [])
        setClients(clRes.data || [])
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load campaigns')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(
    () =>
      campaigns.filter((c) => {
        if (statusFilter && c.status !== statusFilter) return false
        if (clientFilter && String(c.clientId?._id || c.clientId) !== clientFilter) return false
        return true
      }),
    [campaigns, statusFilter, clientFilter]
  )

  const refresh = async () => {
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reload campaigns')
    }
  }

  const selected = campaigns.find((c) => c._id === selectedId) || null

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (campaign) => {
    setSelectedId(null)
    setEditing(campaign)
    setModalOpen(true)
  }

  if (loading) return <Spinner label="Loading campaigns..." />

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={`${filtered.length} campaign${filtered.length === 1 ? '' : 's'}`}
        actions={
          <Button onClick={openCreate} className="px-4">
            <Plus size={16} />
            New Campaign
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        {[
          [statusFilter, setStatusFilter, 'All Statuses', STATUSES],
          [
            clientFilter,
            setClientFilter,
            'All Clients',
            clients.map((c) => ({ v: c._id, l: c.name })),
          ],
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
        <EmptyState icon={Megaphone} message="No campaigns found" hint="Create your first campaign to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className="p-4 cursor-pointer hover:border-indigo-300 transition-colors duration-150 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{c.clientId?.name || '-'}</p>
                </div>
                <StatusPill status={c.status} />
              </div>

              {c.channels?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.channels.map((ch) => (
                    <span key={ch} className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-medium text-gray-600">
                      {ch}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-end justify-between gap-2 mt-auto">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatBudget(c.budget)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(c.startDate)} - {formatDate(c.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.kpis?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                      {c.kpis.length} KPI{c.kpis.length === 1 ? '' : 's'}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Avatar name={c.ownerName} size="xs" />
                    <span className="text-[11px] text-gray-500 max-w-[80px] truncate">{c.ownerName || '-'}</span>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        campaign={editing}
        defaultClientId={clientFilter}
        onSaved={refresh}
      />

      <CampaignDrawer
        campaign={selected}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
        onEdit={openEdit}
      />
    </div>
  )
}
