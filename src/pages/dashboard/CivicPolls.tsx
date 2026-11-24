import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatDate, timeAgo } from '../../lib/format'
import type { ProfileSummary } from '../../lib/types'

interface Poll {
  id: string
  creator_id: string
  question: string
  options: string[]
  location: string | null
  closes_at: string | null
  created_at: string
  creator: ProfileSummary | null
  poll_votes: { user_id: string; option_index: number }[]
}

export default function CivicPolls() {
  const { session, isAdmin, canParticipate } = useAuth()
  const uid = session!.user.id
  const [polls, setPolls] = useState<Poll[]>([])
  const [showForm, setShowForm] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [location, setLocation] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('polls')
      .select('*, creator:profiles(id, full_name, avatar_url), poll_votes(user_id, option_index)')
      .order('created_at', { ascending: false })
    setPolls((data as Poll[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const opts = options.map((o) => o.trim()).filter(Boolean)
    if (opts.length < 2) return setError('Add at least two options')
    setError('')
    const { error } = await supabase.from('polls').insert({
      creator_id: uid,
      question: question.trim(),
      options: opts,
      location: location.trim() || null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    })
    if (error) return setError(errorMessage(error))
    setQuestion('')
    setOptions(['', ''])
    setLocation('')
    setClosesAt('')
    setShowForm(false)
    load()
  }

  async function vote(pollId: string, idx: number) {
    setError('')
    const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: uid, option_index: idx })
    if (error) setError(errorMessage(error))
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this poll?')) return
    const { error } = await supabase.from('polls').delete().eq('id', id)
    if (error) setError(errorMessage(error))
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Civic Polls</h1>
          <p className="text-slate-600">Let the community decide together. One vote per person.</p>
        </div>
        {canParticipate && <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ New poll'}</button>}
      </div>
      {showForm && (
        <form onSubmit={create} className="card space-y-3">
          <div><label className="label">Question *</label><input className="input" required value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
          <div className="space-y-2">
            <label className="label">Options (2–6)</label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={o} placeholder={`Option ${i + 1}`} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
                {options.length > 2 && <button type="button" className="btn-secondary" onClick={() => setOptions(options.filter((_, j) => j !== i))}>✕</button>}
              </div>
            ))}
            {options.length < 6 && <button type="button" className="btn-secondary" onClick={() => setOptions([...options, ''])}>+ Add option</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Location</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div><label className="label">Closes at</label><input className="input" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><button className="btn-primary">Create poll</button></div>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {polls.length === 0 && <div className="card text-slate-500">No polls yet.</div>}
      {polls.map((p) => {
        const total = p.poll_votes.length
        const mine = p.poll_votes.find((v) => v.user_id === uid)
        const closed = p.closes_at !== null && new Date(p.closes_at) < new Date()
        const showResults = Boolean(mine) || closed || !canParticipate
        return (
          <div key={p.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.question}</h3>
                <p className="text-xs text-slate-400">
                  by {p.creator?.full_name} · {timeAgo(p.created_at)}{p.location && ` · 📍 ${p.location}`}
                  {p.closes_at && ` · ${closed ? 'Closed' : 'Closes'} ${formatDate(p.closes_at)}`}
                </p>
              </div>
              {(p.creator_id === uid || isAdmin) && <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => remove(p.id)}>Delete</button>}
            </div>
            <div className="space-y-2">
              {p.options.map((opt, i) => {
                const n = p.poll_votes.filter((v) => v.option_index === i).length
                const pct = total ? Math.round((n / total) * 100) : 0
                return showResults ? (
                  <div key={i} className="relative overflow-hidden rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="absolute inset-y-0 left-0 bg-brand-100" style={{ width: `${pct}%` }} />
                    <div className="relative flex justify-between">
                      <span className={mine?.option_index === i ? 'font-semibold' : ''}>{opt}{mine?.option_index === i && ' ✓'}</span>
                      <span>{pct}% ({n})</span>
                    </div>
                  </div>
                ) : (
                  <button key={i} className="btn-secondary w-full justify-start" onClick={() => vote(p.id, i)}>{opt}</button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">{total} {total === 1 ? 'vote' : 'votes'}</p>
          </div>
        )
      })}
    </div>
  )
}
