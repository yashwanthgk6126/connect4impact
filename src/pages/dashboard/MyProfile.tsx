import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatDate } from '../../lib/format'
import { uploadImage } from '../../lib/upload'
import Avatar from '../../components/Avatar'

export default function MyProfile() {
  const { session, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  if (!profile || !session) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), location: location.trim() || null, bio: bio.trim() || null })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) return setError(errorMessage(error))
    setMsg('Profile saved')
    refreshProfile()
  }

  async function changeAvatar(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const url = await uploadImage(file, session!.user.id)
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile!.id)
      if (error) throw error
      refreshProfile()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="card flex items-center gap-4">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={72} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{profile.full_name}</div>
          <div className="text-sm text-slate-500">{session.user.email}</div>
          <div className="mt-1 flex gap-2">
            <span className="chip bg-slate-100 text-slate-700">{profile.role === 'admin' ? 'Administrator' : 'Community member'}</span>
            <span className="text-xs text-slate-400">Joined {formatDate(profile.created_at, false)}</span>
          </div>
        </div>
        <label className="btn-secondary cursor-pointer">
          Change photo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => changeAvatar(e.target.files?.[0])} />
        </label>
      </div>
      <form onSubmit={save} className="card space-y-3">
        <div><label className="label">Full name</label><input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div><label className="label">City / area</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Used for activity recommendations" /></div>
        <div><label className="label">Bio</label><textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Causes you care about…" /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-brand-700">{msg}</p>}
        <div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
      </form>
    </div>
  )
}
