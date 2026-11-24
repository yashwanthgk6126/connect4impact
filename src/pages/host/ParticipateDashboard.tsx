import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_SELECT } from '../../lib/queries'
import { EVENT_CATEGORIES } from '../../lib/constants'
import { countOf, errorMessage, formatDate } from '../../lib/format'
import type { EventRow } from '../../lib/types'
import { Loading } from '../../components/RequireAuth'

export default function ParticipateDashboard() {
  const { session, profile, canParticipate } = useAuth()
  const uid = session!.user.id
  const [events, setEvents] = useState<EventRow[]>([])
  const [mine, setMine] = useState<EventRow[]>([])
  const [tab, setTab] = useState<'find' | 'joined' | 'past'>('find')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [category, setCategory] = useState('')
  const [volunteerOnly, setVolunteerOnly] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [up, j] = await Promise.all([
      supabase.from('events').select(EVENT_SELECT).eq('status', 'published').gte('start_at', new Date().toISOString()).order('start_at'),
      supabase.from('event_participants').select(`event:events!event_participants_event_id_fkey(${EVENT_SELECT})`).eq('user_id', uid),
    ])
    setEvents((up.data as EventRow[]) ?? [])
    const js = ((j.data ?? []) as unknown as { event: EventRow | null }[]).map((x) => x.event).filter(Boolean) as EventRow[]
    setMine(js.sort((a, b) => a.start_at.localeCompare(b.start_at)))
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  const joinedIds = useMemo(() => new Set(mine.map((e) => e.id)), [mine])
  const now = new Date().toISOString()
  const joinedUpcoming = mine.filter((e) => e.start_at >= now)
  const joinedPast = mine.filter((e) => e.start_at < now).reverse()
  const find = events.filter((e) =>
    !joinedIds.has(e.id) && e.host_id !== uid &&
    (!location.trim() || e.location.toLowerCase().includes(location.trim().toLowerCase())) &&
    (!category || e.category === category) &&
    (!volunteerOnly || (e.volunteers_needed > 0 && countOf(e.event_participants) < e.volunteers_needed)))

  async function toggle(e: EventRow, join: boolean) {
    setBusy(e.id)
    const { error } = join
      ? await supabase.from('event_participants').insert({ event_id: e.id, user_id: uid })
      : await supabase.from('event_participants').delete().eq('event_id', e.id).eq('user_id', uid)
    setBusy(null)
    if (error) return alert(errorMessage(error))
    load()
  }

  if (loading) return <Loading />

  const row = (e: EventRow, action: 'join' | 'leave' | null) => {
    const joined = countOf(e.event_participants)
    const full = e.volunteers_needed > 0 && joined >= e.volunteers_needed
    return (
      <div key={e.id} className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-brand-50 text-brand-700">{EVENT_CATEGORIES[e.category] ?? e.category}</span>
            {e.status === 'cancelled' && <span className="chip bg-red-100 text-red-700">Cancelled</span>}
            {e.volunteers_needed > 0 && !full && <span className="chip bg-sky-100 text-sky-700">Volunteers needed</span>}
          </div>
          <Link to={`/events/${e.id}`} className="mt-1 block text-lg font-semibold hover:underline">{e.title}</Link>
          <div className="text-sm text-slate-600">{e.location} · {formatDate(e.start_at)} · hosted by {e.host?.full_name ?? 'community member'}</div>
          <div className="text-sm text-slate-600">{e.volunteers_needed > 0 ? `${joined}/${e.volunteers_needed} volunteers joined` : `${joined} participating`}</div>
        </div>
        <div className="flex gap-2">
          <Link to={`/events/${e.id}`} className="btn-secondary">Details</Link>
          {action === 'join' && canParticipate && (
            <button className="btn-primary" disabled={busy === e.id} onClick={() => toggle(e, true)}>{busy === e.id ? 'Joining…' : 'Join'}</button>
          )}
          {action === 'leave' && (
            <button className="btn-secondary" disabled={busy === e.id} onClick={() => toggle(e, false)}>Leave</button>
          )}
        </div>
      </div>
    )
  }

  const tabs = [['find', `Find activities (${find.length})`], ['joined', `My upcoming (${joinedUpcoming.length})`], ['past', `Attended (${joinedPast.length})`]] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Participate</h1>
        <p className="text-slate-600">Find activities to join, and keep track of the events you're taking part in.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Upcoming joined', joinedUpcoming.length], ['Attended', joinedPast.length], ['Open activities', events.filter((e) => !joinedIds.has(e.id) && e.host_id !== uid).length]].map(([l, v]) => (
          <div key={l} className="card"><div className="text-2xl font-bold text-brand-700">{v}</div><div className="text-sm text-slate-500">{l}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>

      {tab === 'find' && (
        <>
          <div className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><label className="label">Location</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru" /></div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {Object.entries(EVENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={volunteerOnly} onChange={(e) => setVolunteerOnly(e.target.checked)} /> Needs volunteers</label>
          </div>
          {find.length === 0 ? (
            <div className="card text-center text-slate-500">No matching upcoming activities. Try clearing the filters, or <Link to="/explore" className="text-brand-700 underline">browse all activities</Link>.</div>
          ) : <div className="space-y-3">{find.map((e) => row(e, 'join'))}</div>}
        </>
      )}
      {tab === 'joined' && (joinedUpcoming.length === 0
        ? <div className="card text-center text-slate-500">You haven't joined any upcoming activities yet.</div>
        : <div className="space-y-3">{joinedUpcoming.map((e) => row(e, 'leave'))}</div>)}
      {tab === 'past' && (joinedPast.length === 0
        ? <div className="card text-center text-slate-500">No attended activities yet.</div>
        : <div className="space-y-3">{joinedPast.map((e) => row(e, null))}</div>)}
    </div>
  )
}
