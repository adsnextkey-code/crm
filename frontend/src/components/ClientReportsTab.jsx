import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Download, Trash2, FileText } from 'lucide-react'
import api from '../utils/api'
import { Modal, Button, Input, Select, Textarea, relativeTime } from './ui'
import { useAuth } from '../context/AuthContext'

const PERIOD_STYLES = {
  Weekly: 'bg-blue-50 text-blue-700',
  Monthly: 'bg-violet-50 text-violet-700',
}

export default function ClientReportsTab({ clientId }) {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', period: 'Weekly', note: '' })
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/clients/${clientId}/reports`)
      .then((res) => active && setReports(res.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load reports'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [clientId])

  const openModal = () => {
    setForm({ title: '', period: 'Weekly', note: '' })
    setFile(null)
    setModalOpen(true)
  }

  const handleFile = (e) => {
    const picked = e.target.files[0]
    e.target.value = ''
    if (!picked) return
    if (picked.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      setFile({ name: picked.name, type: picked.type, size: picked.size, fileData: String(reader.result) })
    reader.onerror = () => toast.error(`Failed to read ${picked.name}`)
    reader.readAsDataURL(picked)
  }

  const submit = async () => {
    if (!form.title.trim() || !form.period) return
    setSubmitting(true)
    try {
      await api.post(`/clients/${clientId}/reports`, {
        title: form.title,
        period: form.period,
        note: form.note,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
        fileData: file?.fileData,
      })
      toast.success('Report added')
      setModalOpen(false)
      const res = await api.get(`/clients/${clientId}/reports`)
      setReports(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add report')
    } finally {
      setSubmitting(false)
    }
  }

  const download = (r) => {
    const a = document.createElement('a')
    a.href = r.fileData
    a.download = r.fileName || 'report'
    a.click()
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete report "${r.title}"?`)) return
    try {
      await api.delete(`/clients/${clientId}/reports/${r._id}`)
      toast.success('Report deleted')
      setReports((prev) => prev.filter((x) => x._id !== r._id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report')
    }
  }

  const canDelete = (r) => user?.role === 'manager' || String(r.createdBy) === String(user?._id)

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-7 w-7 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading reports...</p>
      </div>
    )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Reports ({reports.length})
        </h4>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-1.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
        >
          <Plus size={12} />
          Add Report
        </button>
      </div>

      {reports.length === 0 ? (
        <p className="text-xs text-gray-400">No reports yet</p>
      ) : (
        <div className="space-y-1.5">
          {reports.map((r) => (
            <div key={r._id} className="p-2.5 border border-gray-200 rounded-lg bg-white shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        PERIOD_STYLES[r.period] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.period}
                    </span>
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  </div>
                  {r.note && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">{r.note}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {r.createdByName || 'Unknown'} · {relativeTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {r.fileData && (
                    <button
                      type="button"
                      onClick={() => download(r)}
                      title={`Download ${r.fileName || 'attachment'}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {canDelete(r) && (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {r.fileName && r.fileData && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md max-w-full">
                  <FileText size={11} className="shrink-0" />
                  <span className="truncate">{r.fileName}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Report"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={submitting || !form.title.trim() || !form.period}
            >
              {submitting ? 'Saving...' : 'Add Report'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Weekly SEO Progress - Week 32"
          />
          <Select
            label="Period"
            required
            value={form.period}
            onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
          >
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </Select>
          <Textarea
            label="Note"
            rows={3}
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Summary of deliverables..."
          />
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1.5">Attachment (optional)</span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFile}
              className="w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:font-medium hover:file:bg-indigo-100 cursor-pointer"
            />
            {file && (
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
