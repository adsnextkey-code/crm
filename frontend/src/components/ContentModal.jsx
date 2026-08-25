import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FileText, Upload, X } from 'lucide-react'
import api from '../utils/api'
import { Modal, Input, Select, Textarea, Button } from './ui'
import { useAuth } from '../context/AuthContext'

export const CONTENT_TYPES = ['Post', 'Blog', 'Ad', 'Video', 'Email']
export const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'Google', 'TikTok', 'Website']

const MAX_FILE_BYTES = 2 * 1024 * 1024

const EMPTY = {
  title: '',
  clientId: '',
  campaignId: '',
  contentType: 'Post',
  platform: 'Facebook',
  caption: '',
  scheduledDate: '',
  assignedTo: '',
}

export default function ContentModal({ open, onClose, content, defaultClientId, onSaved }) {
  const isEdit = Boolean(content)
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [form, setForm] = useState(EMPTY)
  const [creative, setCreative] = useState(null)
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const requests = [api.get('/clients')]
    if (isManager) requests.push(api.get('/team'))
    Promise.all(requests)
      .then((results) => {
        setClients(results[0].data || [])
        if (results[1]) setTeam(results[1].data || [])
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load form data'))
  }, [open, isManager])

  useEffect(() => {
    if (content) {
      setForm({
        title: content.title || '',
        clientId: content.clientId?._id || content.clientId || '',
        campaignId: content.campaignId?._id || content.campaignId || '',
        contentType: content.contentType || 'Post',
        platform: content.platform || 'Facebook',
        caption: content.caption || '',
        scheduledDate: content.scheduledDate ? String(content.scheduledDate).slice(0, 10) : '',
        assignedTo: isManager ? content.assignedTo || '' : undefined,
      })
      setCreative(content.creativeFile || null)
    } else {
      setForm({ ...EMPTY, clientId: defaultClientId || '', assignedTo: isManager ? '' : undefined })
      setCreative(null)
    }
  }, [content, defaultClientId, open, isManager])

  useEffect(() => {
    if (!open || !form.clientId) {
      setCampaigns([])
      return
    }
    api
      .get('/campaigns', { params: { clientId: form.clientId } })
      .then((res) => setCampaigns(res.data || []))
      .catch(() => setCampaigns([]))
  }, [open, form.clientId])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File exceeds the 2MB limit')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCreative({ name: file.name, type: file.type, size: file.size, fileData: reader.result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.clientId) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        campaignId: form.campaignId || null,
        creativeFile: creative,
        assignedTo: isManager ? form.assignedTo || null : undefined,
      }
      if (isEdit) {
        await api.put(`/content/${content._id}`, payload)
        toast.success('Content updated')
      } else {
        await api.post('/content', payload)
        toast.success('Content created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} content`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Content' : 'New Content'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" required value={form.title} onChange={set('title')} placeholder="Content title" />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Client" required value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, campaignId: '' }))}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>

          <Select label="Campaign" value={form.campaignId} onChange={set('campaignId')}>
            <option value="">No campaign</option>
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Content Type" required value={form.contentType} onChange={set('contentType')}>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select label="Platform" required value={form.platform} onChange={set('platform')}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>

        <Textarea label="Caption" value={form.caption} onChange={set('caption')} placeholder="Caption or content notes..." rows={3} />

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1.5">Creative File (max 2MB)</span>
          {creative?.fileData ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                <FileText size={15} className="text-indigo-600 shrink-0" />
                <span className="truncate">{creative.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setCreative(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors duration-150"
            >
              <Upload size={15} />
              Upload creative
            </button>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
          {isManager && (
            <Select label="Assignee" value={form.assignedTo || ''} onChange={set('assignedTo')}>
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </Select>
          )}
        </div>

        <Button type="submit" disabled={saving} className="w-full py-2.5">
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Content'}
        </Button>
      </form>
    </Modal>
  )
}
