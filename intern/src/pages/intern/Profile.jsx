import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getBadge, formatDate } from '../../lib/utils'
import Button from '../../components/ui/Button'
import PageWrapper from '../../components/layout/PageWrapper'
import toast from 'react-hot-toast'

export default function InternProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit } = useForm({ defaultValues: { name: profile?.name, whatsapp_number: profile?.whatsapp_number } })

  const badge = getBadge(profile?.points || 0)

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setUploading(true)
    const fname = `${user.id}/avatar_${Date.now()}`
    const { error } = await supabase.storage.from('avatars').upload(fname, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fname)
    await supabase.from('interns').update({ avatar_url: data.publicUrl }).eq('id', user.id)
    await refreshProfile()
    toast.success('Avatar updated!')
    setUploading(false)
  }

  async function handleSave(data) {
    setSaving(true)
    const { error } = await supabase.from('interns').update({ name: data.name, whatsapp_number: data.whatsapp_number }).eq('id', user.id)
    if (error) toast.error(error.message)
    else { toast.success('Profile updated!'); await refreshProfile() }
    setSaving(false)
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    const newPass = e.target.password.value
    if (newPass.length < 8) { toast.error('Min 8 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) toast.error(error.message)
    else { toast.success('Password updated!'); e.target.reset() }
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1B2A5C] font-heading">My Profile</h1>

        {/* Avatar & Info */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#1B2A5C] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile?.name?.[0]}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F26522] rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors">
                <span className="text-white text-xs">✏️</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1B2A5C] font-heading">{profile?.name}</h2>
              <p className="text-gray-500 text-sm">{profile?.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-semibold ${badge.color}`}>{badge.emoji} {badge.label}</span>
                <span className="text-xs text-gray-400">· {profile?.points || 0} points</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div className="bg-[#E8EDF5] rounded-xl p-3">
              <p className="text-gray-500 text-xs">Login ID</p>
              <p className="font-semibold text-[#1B2A5C]">{profile?.login_id || user?.email}</p>
            </div>
            <div className="bg-[#E8EDF5] rounded-xl p-3">
              <p className="text-gray-500 text-xs">Member Since</p>
              <p className="font-semibold text-[#1B2A5C]">{formatDate(profile?.created_at)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input {...register('name')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Number</label>
              <input {...register('whatsapp_number')} type="tel" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm" />
            </div>
            <Button type="submit" loading={saving || uploading}>Save Changes</Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-[#1B2A5C] font-heading mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input name="password" type="password" minLength={8} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F26522] text-sm"
                placeholder="Min 8 characters" />
            </div>
            <Button type="submit" variant="outline">Update Password</Button>
          </form>
        </div>
      </div>
    </PageWrapper>
  )
}
