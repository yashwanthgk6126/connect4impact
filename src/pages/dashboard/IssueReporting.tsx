import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ISSUE_CATEGORIES } from '../../lib/constants'
import { errorMessage, timeAgo } from '../../lib/format'
import { uploadImage } from '../../lib/upload'
import ImagePicker from '../../components/ImagePicker'
import type { ProfileSummary } from '../../lib/types'

interface Issue {
  id: string
  reporter_id: string
  title: string
  description: string
  category: string
  location: string
  image_url: string | null
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  reporter: ProfileSummary | null
}

const STATUS = { open: ['Open', 'bg-red-100 text-red-700'], in_progress: ['In progress', 'bg-amber-100 text-amber-800'], resolved: ['Resolved', 'bg-brand-100 text-brand-700'] } as const

export default function IssueReporting() {
  const { session, isAdmin, canParticipate } = useAuth()
  const uid = session!.user.id
  const [issues, setIssues] = useState<Issue[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'roads', location: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    let q = supabase.from('issue_reports').select('*, reporter:profiles(id, full_name, avatar_url)').order('created_at', { ascending: false })
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data } = await q
    setIssues((data as Issue[]) ?? [])
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const image_url = file ? await uploadImage(file, uid) : null
      const { error } = await supabase.from('issue_reports').insert({ ...form, reporter_id: uid, image_url })
      if (error) throw error
      setForm({ title: '', description: '', category: 'roads', location: '' })
      setFile(null)
      setShowForm(false)
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function update(id: string, status: string) {
    const { error } = await supabase.from('issue_reports').update({ status }).eq('id', id)
    if (error) setError(errorMessage(error))
    load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this issue report?')) return
    const { error } = await supabase.from('issue_reports').delete().eq('id', id)
    if (error) setError(errorMessage(error))
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Issue Reporting</h1>
          <p className="text-slate-600">Report local problems so the community can act on them together.</p>
        </div>
        {canParticipate && <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ Report an issue'}</button>}
      </div>
      {showForm && (
        <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Broken streetlight on 5th Cross" /></div>
          <div><label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(ISSUE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Location *</label><input className="input" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><ImagePicker file={file} onChange={setFile} /></div>
          <div className="sm:col-span-2 flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'}</button></div>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {[['', 'All'], ['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} className={`chip cursor-pointer px-3 py-1 ${statusFilter === v ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {issues.length === 0 && <div className="card text-slate-500">No issues reported.</div>}
        {issues.map((i) => (
          <div key={i.id} className="card space-y-2">
            {i.image_url && <img src={i.image_url} alt="" className="max-h-48 w-full rounded-lg object-cover" />}
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{i.title}</h3>
              <span className={`chip ${STATUS[i.status][1]}`}>{STATUS[i.status][0]}</span>
            </div>
            <p className="text-sm text-slate-600">🏷️ {ISSUE_CATEGORIES[i.category]} · 📍 {i.location}</p>
            {i.description && <p className="text-sm">{i.description}</p>}
            <p className="text-xs text-slate-400">Reported by {i.reporter?.full_name} · {timeAgo(i.created_at)}</p>
            {(i.reporter_id === uid || isAdmin) && (
              <div className="flex flex-wrap gap-2">
                <select className="input w-auto" value={i.status} onChange={(e) => update(i.id, e.target.value)}>
                  <option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
                </select>
                <button className="btn-secondary" onClick={() => remove(i.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
