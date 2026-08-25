import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Users, Pencil, UserX, MailPlus, RefreshCw, XCircle } from 'lucide-react'
import api from '../utils/api'
import { Avatar, Button, Card, Spinner, EmptyState, PageHeader, Badge, Modal, Input, Select } from '../components/ui'
import MemberModal from '../components/MemberModal'

function InviteModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'team' })
  const [sending, setSending] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/invites', form)
      toast.success('Invitation sent')
      setForm({ name: '', email: '', role: 'team' })
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite New Member">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full Name (optional)" value={form.name} onChange={set('name')} placeholder="e.g. Ahmed Raza" />
        <Input label="Work Email" required type="email" value={form.email} onChange={set('email')} placeholder="member@company.com" />
        <Select label="Account Type" value={form.role} onChange={set('role')}>
          <option value="team">Team Member</option>
          <option value="manager">Manager</option>
        </Select>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          They'll receive an invitation email with a link to create their own password. The link expires in 7 days.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Team() {
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [statsRes, invitesRes] = await Promise.allSettled([api.get('/team/stats'), api.get('/invites')])
      if (statsRes.status === 'fulfilled') {
        setMembers(
          (statsRes.value.data || []).map((m) => ({
            ...m,
            _id: m.id ?? m._id,
            stats: {
              total: m.assigned ?? 0,
              pending: m.pending ?? 0,
              completed: m.completed ?? 0,
              overdue: m.overdue ?? 0,
            },
          }))
        )
      } else {
        toast.error('Failed to load team')
      }
      if (invitesRes.status === 'fulfilled') setInvites(invitesRes.value.data || [])
    } finally {
      setLoading(false)
    }
  }

  const resendInvite = async (invite) => {
    try {
      await api.post(`/invites/${invite._id}/resend`)
      toast.success(`Invitation email sent to ${invite.email}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation')
    }
  }

  const cancelInvite = async (invite) => {
    if (!window.confirm(`Cancel the invite for "${invite.email}"?`)) return
    try {
      await api.delete(`/invites/${invite._id}`)
      toast.success('Invite cancelled')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invite')
    }
  }

  const handleDeactivate = async (member) => {
    if (!window.confirm(`Deactivate "${member.name}"? They will no longer be able to log in.`)) return
    try {
      await api.put(`/team/${member._id}`, { isActive: false })
      toast.success('Member deactivated')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate member')
    }
  }

  if (loading) return <Spinner label="Loading team..." />

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setInviteOpen(true)} className="px-4">
              <MailPlus size={16} />
              Invite
            </Button>
            <Button variant="secondary" onClick={() => { setEditingMember(null); setModalOpen(true) }} className="px-4">
              <Plus size={16} />
              Add Member
            </Button>
          </div>
        }
      />

      {invites.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv._id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-[11px] text-gray-400 capitalize">
                    {inv.role} · sent by {inv.invitedByName || 'manager'} · expires{' '}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => resendInvite(inv)}
                  title="Resend invitation email"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-150 shrink-0"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => cancelInvite(inv)}
                  title="Cancel invite"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 shrink-0"
                >
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {members.length === 0 ? (
        <EmptyState icon={Users} message="No team members yet" hint="Add your first team member to get started" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m) => (
            <Card key={m._id} className="p-5 hover:border-gray-300 transition-colors duration-150">
              <div className="flex items-start justify-between mb-4">
                <Avatar name={m.name} size="lg" src={m.avatar} />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingMember(m); setModalOpen(true) }}
                    title="Edit"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeactivate(m)}
                    title="Deactivate"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold tracking-tight text-gray-900">{m.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{m.designation || 'Team Member'}</p>
              <div className="mt-2"><Badge text={m.department || '—'} /></div>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 text-center">
                <div>
                  <p className="text-base font-semibold text-gray-900">{m.stats?.total ?? 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-amber-600">{m.stats?.pending ?? 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-emerald-600">{m.stats?.completed ?? 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Done</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-red-600">{m.stats?.overdue ?? 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Overdue</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MemberModal open={modalOpen} onClose={() => setModalOpen(false)} member={editingMember} onSaved={load} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onSaved={load} />
    </div>
  )
}
