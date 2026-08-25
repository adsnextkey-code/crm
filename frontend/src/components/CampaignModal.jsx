import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import api from '../utils/api'
import { Modal, Input, Select, Textarea, Button } from './ui'

export const CHANNELS = ['SEO', 'GBP', 'Social Media', 'Ads', 'Email', 'Content', 'Development']
const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']

const EMPTY = {
  name: '',
  clientId: '',
  objective: '',
  channels: [],
  budget: '',
  startDate: '',
  endDate: '',
  ownerId: '',
  status: 'Planning',
  notes: '',
}

const EMPTY_KPI = { label: '', targetValue: '', unit: '' }

export default function CampaignModal({ open, onClose, campaign, defaultClientId, onSaved }) {
  const isEdit = Boolean(campaign)
  const [form, setForm] = useState(EMPTY)
  const [kpis, setKpis] = useState([EMPTY_KPI])
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
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
    if (campaign) {
      setForm({
        name: campaign.name || '',
        clientId: campaign.clientId?._id || campaign.clientId || '',
        objective: campaign.objective || '',
        channels: Array.isArray(campaign.channels) ? campaign.channels : [],
        budget: campaign.budget ?? '',
        startDate: campaign.startDate ? String(campaign.startDate).slice(0, 10) : '',
        endDate: campaign.endDate ? String(campaign.endDate).slice(0, 10) : '',
        ownerId: campaign.ownerId || '',
        status: campaign.status || 'Planning',
        notes: campaign.notes || '',
      })
      setKpis(
        Array.isArray(campaign.kpis) && campaign.kpis.length
          ? campaign.kpis.map((k) => ({
              label: k.label || '',
              targetValue: k.targetValue ?? '',
              unit: k.unit || '',
            }))
          : [{ ...EMPTY_KPI }]
      )
    } else {
      setForm({ ...EMPTY, clientId: defaultClientId || '' })
      setKpis([{ ...EMPTY_KPI }])
    }
  }, [campaign, defaultClientId, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const toggleChannel = (channel) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(channel)
        ? f.channels.filter((c) => c !== channel)
        : [...f.channels, channel],
    }))

  const setKpi = (i, key) => (e) =>
    setKpis((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: e.target.value } : r)))

  const removeKpi = (i) => setKpis((rows) => rows.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.clientId) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const cleanKpis = kpis.filter((k) => k.label.trim())
      const payload = {
        ...form,
        budget: form.budget === '' ? undefined : Number(form.budget),
        kpis: cleanKpis.map((k) => ({
          label: k.label.trim(),
          targetValue: Number(k.targetValue) || 0,
          unit: k.unit.trim(),
        })),
      }
      if (isEdit) {
        await api.put(`/campaigns/${campaign._id}`, payload)
        toast.success('Campaign updated')
      } else {
        await api.post('/campaigns', payload)
        toast.success('Campaign created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} campaign`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Campaign' : 'New Campaign'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" required value={form.name} onChange={set('name')} placeholder="Campaign name" />

        <Select label="Client" required value={form.clientId} onChange={set('clientId')}>
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </Select>

        <Textarea label="Objective" value={form.objective} onChange={set('objective')} placeholder="What is this campaign trying to achieve?" rows={2} />

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1.5">Channels</span>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CHANNELS.map((channel) => {
              const active = form.channels.includes(channel)
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                    active
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  }`}
                >
                  {channel}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Budget (PKR)" type="number" min="0" value={form.budget} onChange={set('budget')} placeholder="150000" />
          <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input label="End Date" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Owner" value={form.ownerId} onChange={set('ownerId')}>
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1.5">KPIs</span>
          <div className="space-y-2">
            {kpis.map((kpi, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={kpi.label}
                  onChange={setKpi(i, 'label')}
                  placeholder="Label (e.g. Leads)"
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="number"
                  value={kpi.targetValue}
                  onChange={setKpi(i, 'targetValue')}
                  placeholder="Target"
                  className="w-28 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  value={kpi.unit}
                  onChange={setKpi(i, 'unit')}
                  placeholder="Unit (leads, %)"
                  className="w-32 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => removeKpi(i)}
                  title="Remove KPI"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setKpis((rows) => [...rows, { ...EMPTY_KPI }])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-150"
          >
            <Plus size={13} />
            Add KPI
          </button>
        </div>

        <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Internal notes..." rows={2} />

        <Button type="submit" disabled={saving} className="w-full py-2.5">
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </form>
    </Modal>
  )
}
