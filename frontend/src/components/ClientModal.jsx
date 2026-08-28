import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Modal, Input, Select, Textarea, Button } from './ui'

const STATUSES = ['Active', 'Paused', 'Churned']

const EMPTY = {
  name: '',
  partnerName: '',
  serviceType: '',
  subService: '',
  status: 'Active',
  startDate: '',
  package: '',
  monthlyFee: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  gbpUrl: '',
  socialProfiles: '',
  notes: '',
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function ClientModal({ open, onClose, client, onSaved }) {
  const isEdit = Boolean(client)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        partnerName: client.partnerName || '',
        serviceType: client.serviceType || '',
        subService: client.subService || '',
        status: client.status || 'Active',
        startDate: client.startDate ? String(client.startDate).slice(0, 10) : '',
        package: client.package || '',
        monthlyFee: client.monthlyFee ?? '',
        contactPerson: client.contactPerson || '',
        contactEmail: client.contactEmail || '',
        contactPhone: client.contactPhone || '',
        websiteUrl: client.websiteUrl || '',
        gbpUrl: client.gbpUrl || '',
        socialProfiles: client.socialProfiles || '',
        notes: client.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [client, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.serviceType.trim()) {
      toast.error('Name and Service Type are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, monthlyFee: form.monthlyFee === '' ? undefined : Number(form.monthlyFee) }
      if (isEdit) {
        await api.put(`/clients/${client._id}`, payload)
        toast.success('Client updated')
      } else {
        await api.post('/clients', payload)
        toast.success('Client added')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} client`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Client' : 'Add Client'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basic Information">
          <Input label="Client Name" required value={form.name} onChange={set('name')} placeholder="Business name" />
          <Input label="Partner Name" value={form.partnerName} onChange={set('partnerName')} placeholder="e.g. Partner / Co-owner" />
          <Input label="Service Type" required value={form.serviceType} onChange={set('serviceType')} placeholder="e.g. SEO" />
          <Input label="Sub Service" value={form.subService} onChange={set('subService')} placeholder="e.g. Local SEO" />
          <Select label="Status" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input label="Start Date" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input label="Package" value={form.package} onChange={set('package')} placeholder="e.g. Growth" />
          <Input label="Monthly Fee" type="number" min="0" value={form.monthlyFee} onChange={set('monthlyFee')} placeholder="e.g. 50000" />
        </Section>

        <Section title="Contact Details">
          <Input label="Contact Person" value={form.contactPerson} onChange={set('contactPerson')} placeholder="Full name" />
          <Input label="Contact Phone" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+92 300 0000000" />
          <Input label="Contact Email" type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="name@company.com" />
        </Section>

        <Section title="Links & Notes">
          <Input label="Website URL" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://" />
          <Input label="GBP URL" value={form.gbpUrl} onChange={set('gbpUrl')} placeholder="Google Business Profile" />
          <Textarea label="Social Profiles" rows={2} value={form.socialProfiles} onChange={set('socialProfiles')} placeholder="Facebook, Instagram..." />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={set('notes')} placeholder="Internal notes..." />
        </Section>

        <Button type="submit" disabled={saving} className="w-full py-2.5">
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Client'}
        </Button>
      </form>
    </Modal>
  )
}
