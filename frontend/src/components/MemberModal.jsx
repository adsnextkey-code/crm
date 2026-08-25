import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Modal, Input, Select, Button } from './ui'

const DEPARTMENTS = ['SEO', 'Social Media', 'Content', 'PPC', 'Design', 'Web Development', 'GBP', 'Backlinks', 'Reports', 'Management', 'Other']
const ROLES = ['team', 'manager']

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'team',
  department: 'SEO',
  designation: '',
  phone: '',
}

export default function MemberModal({ open, onClose, member, onSaved }) {
  const isEdit = Boolean(member)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || '',
        email: member.email || '',
        password: '',
        role: member.role || 'team',
        department: member.department || 'SEO',
        designation: member.designation || '',
        phone: member.phone || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [member, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!isEdit && !form.password) {
      toast.error('Password is required for new members')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      if (isEdit) {
        await api.put(`/team/${member._id}`, payload)
        toast.success('Member updated')
      } else {
        await api.post('/team', payload)
        toast.success('Member added')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} member`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Member' : 'Add Team Member'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" required value={form.name} onChange={set('name')} placeholder="e.g. Sara Ahmed" />
        <Input label="Email" required type="email" value={form.email} onChange={set('email')} placeholder="name@agency.com" />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'}
          minLength={isEdit ? undefined : 6}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Role" value={form.role} onChange={set('role')} disabled={member?.role !== 'manager'}>
            {(member?.role === 'manager' ? ROLES : ['team']).map((r) => (
              <option key={r} value={r}>{r === 'team' ? 'Team Member' : 'Manager'}</option>
            ))}
          </Select>
          <Select label="Department" value={form.department} onChange={set('department')}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Designation" value={form.designation} onChange={set('designation')} placeholder="e.g. SEO Specialist" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
        </div>

        <Button type="submit" disabled={saving} className="w-full py-2.5">
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Member'}
        </Button>
      </form>
    </Modal>
  )
}
