import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Send, Trash2, Loader2, Pin } from 'lucide-react'
import api from '../utils/api'
import { Card, Button, Input, Textarea, Spinner, EmptyState, PageHeader, relativeTime } from '../components/ui'

export default function Announcements() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [posting, setPosting] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/announcements')
      setItems(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const post = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error('Title and details are both required')
      return
    }
    setPosting(true)
    try {
      await api.post('/announcements', { title: title.trim(), body: body.trim(), pinned })
      toast.success('Announcement sent to all team members')
      setTitle('')
      setBody('')
      setPinned(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      setItems((prev) => prev.filter((a) => a._id !== id))
      toast.success('Announcement deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete announcement')
    }
  }

  if (loading) return <Spinner label="Loading notices..." />

  return (
    <div>
      <PageHeader title="Notices" subtitle="Post company-wide updates for your team" />

      <Card className="p-5 mb-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900 mb-4">
          <Megaphone size={15} className="text-indigo-500" />
          New Announcement
        </h3>
        <form onSubmit={post} className="space-y-4 max-w-2xl">
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office closed on Friday" />
          <Textarea
            label="Details"
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the full announcement..."
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Pin to top of team dashboard
          </label>
          <Button type="submit" disabled={posting} className="px-4 py-2">
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {posting ? 'Sending...' : 'Send Announcement'}
          </Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={Megaphone} message="No announcements yet" hint="Post your first company update above" />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a._id} className="p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                        <Pin size={9} /> PINNED
                      </span>
                    )}
                    <h4 className="text-sm font-semibold tracking-tight text-gray-900">{a.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {a.createdByName || 'Manager'} · {relativeTime(a.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => remove(a._id)}
                  title="Delete"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
