import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, User, Camera, Trash2 } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Avatar, Card, PageHeader, Badge, Input, Field, Button, EmptyState } from '../components/ui'

const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image file'))
      img.onload = () => {
        const max = 256
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

export default function MyProfile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    designation: user?.designation || '',
    password: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const saveAvatar = async (avatar) => {
    setAvatarBusy(true)
    try {
      await api.put('/auth/profile', { avatar })
      updateUser({ avatar })
      toast.success(avatar ? 'Photo updated' : 'Photo removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update photo')
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    try {
      const dataUrl = await resizeImage(file)
      await saveAvatar(dataUrl)
    } catch (err) {
      toast.error(err.message || 'Failed to process image')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        designation: form.designation,
      }
      if (form.password) payload.password = form.password
      await api.put('/auth/profile', payload)
      updateUser(payload)
      setForm((f) => ({ ...f, password: '', confirmPassword: '' }))
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <EmptyState icon={User} message="Could not load profile" />

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your personal information" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center text-center h-fit">
          <div className="relative group">
            <Avatar name={user.name} size="xl" src={user.avatar} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              title="Change photo"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow hover:bg-indigo-700 transition-colors duration-150 disabled:opacity-60"
            >
              {avatarBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
          </div>
          {user.avatar && (
            <button
              onClick={() => saveAvatar('')}
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-600"
            >
              <Trash2 size={11} /> Remove photo
            </button>
          )}
          <h2 className="mt-4 font-semibold tracking-tight text-gray-900">{user.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{user.designation || 'Team Member'}</p>
          <div className="mt-3"><Badge text={user.department || '—'} /></div>

          <div className="w-full mt-5 pt-5 border-t border-gray-100 space-y-2.5 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Email</span>
              <span className="text-gray-700 truncate ml-3">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Phone</span>
              <span className="text-gray-700">{user.phone || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Role</span>
              <span className="text-gray-700 capitalize">{user.role}</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h3 className="text-sm font-semibold tracking-tight text-gray-900 mb-4">Update Information</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <Input label="Full Name" required value={form.name} onChange={set('name')} />
            <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" />
            <Input label="Designation" value={form.designation} onChange={set('designation')} placeholder="e.g. SEO Specialist" />

            <Field label="New Password">
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Leave blank to keep current"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-150"
              />
            </Field>
            {form.password && (
              <Input label="Confirm New Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} />
            )}

            <Button type="submit" disabled={saving} className="w-full py-2.5">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
