import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_CATEGORIES } from '../../lib/constants'
import { errorMessage, toLocalInput } from '../../lib/format'
import { uploadImage } from '../../lib/upload'
import ImagePicker from '../../components/ImagePicker'
import type { EventRow } from '../../lib/types'
import { Loading } from '../../components/RequireAuth'

export default function HostEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile, canParticipate } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'environment',
    location: profile?.location ?? '',
    start_at: '',
    end_at: '',
    volunteers_needed: 0,
  })
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.from('events').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      const e = data as EventRow | null
      if (e) {
        setForm({
          title: e.title,
          description: e.description,
          category: e.category,
          location: e.location,
          start_at: toLocalInput(new Date(e.start_at)),
          end_at: e.end_at ? toLocalInput(new Date(e.end_at)) : '',
          volunteers_needed: e.volunteers_needed,
        })
        setExistingImage(e.image_url)
      }
      setLoading(false)
    })
  }, [id])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'volunteers_needed' ? Math.max(0, Number(e.target.value)) : e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    if (form.end_at && form.end_at < form.start_at) return setError('End time must be after the start time')
    setSaving(true)
    setError('')
    try {
      const image_url = file ? await uploadImage(file, session.user.id) : existingImage
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location.trim(),
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        volunteers_needed: form.volunteers_needed,
        image_url,
      }
      const { data, error } = id
        ? await supabase.from('events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select('id').single()
        : await supabase.from('events').insert({ ...payload, host_id: session.user.id }).select('id').single()
      if (error) throw error
      navigate(`/events/${data.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (!canParticipate) return <div className="card">Suspended accounts cannot host events.</div>

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{id ? 'Edit event' : 'Host an Event'}</h1>
        <p className="text-slate-600">Your event is published once and automatically appears in both Explore Activities and the Community Feed.</p>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">Event title *</label>
          <input className="input" required minLength={3} maxLength={150} value={form.title} onChange={set('title')} placeholder="e.g. Tree Plantation Drive" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {Object.entries(EVENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location *</label>
            <input className="input" required value={form.location} onChange={set('location')} placeholder="e.g. Bengaluru" />
          </div>
          <div>
            <label className="label">Starts *</label>
            <input className="input" type="datetime-local" required value={form.start_at} onChange={set('start_at')} />
          </div>
          <div>
            <label className="label">Ends</label>
            <input className="input" type="datetime-local" value={form.end_at} onChange={set('end_at')} />
          </div>
          <div>
            <label className="label">Volunteers needed</label>
            <input className="input" type="number" min={0} value={form.volunteers_needed} onChange={set('volunteers_needed')} />
            <p className="mt-1 text-xs text-slate-500">Set to 0 if this is an open event without volunteer roles.</p>
          </div>
        </div>
        <div>
          <label className="label">Description *</label>
          <textarea className="input" rows={5} required value={form.description} onChange={set('description')} placeholder="What will participants do? What should they bring?" />
        </div>
        <div>
          <label className="label">Cover photograph</label>
          {existingImage && !file && <img src={existingImage} alt="" className="mb-2 max-h-48 rounded-lg" />}
          <ImagePicker file={file} onChange={setFile} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Publish event'}</button>
        </div>
      </form>
    </div>
  )
}
