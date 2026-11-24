import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_CATEGORIES } from '../../lib/constants'
import { errorMessage, formatDate } from '../../lib/format'
import type { EventRow, ProfileSummary } from '../../lib/types'
import Avatar from '../../components/Avatar'
import { Loading } from '../../components/RequireAuth'

type Participant = { event_id: string; created_at: string; profile: ProfileSummary | null }

export default function HostDashboard() {
  const { session, canParticipate } = useAuth()
  const uid = session!.user.id
  const [events, setEvents] = useState<EventRow[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [open, setOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').eq('host_id', uid).order('start_at')
    const evs = (data as EventRow[]) ?? []
    setEvents(evs)
    if (evs.length) {
      const { data: ps } = await supabase
        .from('event_participants')
        .select('event_id, created_at, profile:profiles!event_participants_user_id_fkey(id, full_name, avatar_url)')
        .in('event_id', evs.map((e) => e.id))
        .order('created_at')
      setParticipants((ps as unknown as Participant[]) ?? [])
    } else setParticipants([])
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  async function setStatus(id: string, status: EventRow['status']) {
    if (status === 'cancelled' && !confirm('Cancel this event? Participants will see it as cancelled.')) return
    const { error } = await supabase.from('events').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return alert(errorMessage(error))
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this event permanently? It will also disappear from the Community Feed.')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) return alert(errorMessage(error))
    load()
  }

  if (loading) return <Loading />

  const now = new Date().toISOString()
  const upcoming = events.filter((e) => e.start_at >= now)
  const past = events.filter((e) => e.start_at < now)
  const list = tab === 'upcoming' ? upcoming : [...past].reverse()
  const byEvent = (id: string) => participants.filter((p) => p.event_id === id)
  const volunteerGoal = upcoming.filter((e) => e.status === 'published').reduce((s, e) => s + e.volunteers_needed, 0)
  const volunteerFilled = upcoming.filter((e) => e.status === 'published' && e.volunteers_needed > 0)
    .reduce((s, e) => s + Math.min(byEvent(e.id).length, e.volunteers_needed), 0)

  const stats = [
    ['Events hosted', events.length],
    ['Upcoming', upcoming.filter((e) => e.status === 'published').length],
    ['Total participants', participants.length],
    ['Volunteer spots filled', volunteerGoal ? `${volunteerFilled}/${volunteerGoal}` : '—'],
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Host Dashboard</h1>
          <p className="text-slate-600">Create and manage the events you organize. New events appear automatically in Explore Activities and on the Home feed.</p>
        </div>
        {canParticipate && <Link to="/host/new" className="btn-primary">+ Host a new event</Link>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold text-brand-700">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['upcoming', 'past'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>
            {k === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card text-center text-slate-500">
          {tab === 'upcoming' ? (
            <>You have no upcoming events. {canParticipate && <Link to="/host/new" className="text-brand-700 underline">Host your first event</Link>}</>
          ) : 'No past events yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((e) => {
            const ps = byEvent(e.id)
            return (
              <div key={e.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-brand-50 text-brand-700">{EVENT_CATEGORIES[e.category] ?? e.category}</span>
                      {e.status === 'cancelled' && <span className="chip bg-red-100 text-red-700">Cancelled</span>}
                      {e.status === 'removed' && <span className="chip bg-red-100 text-red-700">Removed by admin</span>}
                    </div>
                    <Link to={`/events/${e.id}`} className="mt-1 block text-lg font-semibold hover:underline">{e.title}</Link>
                    <div className="text-sm text-slate-600">{e.location} · {formatDate(e.start_at)}</div>
                    <div className="text-sm text-slate-600">
                      {e.volunteers_needed > 0 ? `${ps.length}/${e.volunteers_needed} volunteers joined` : `${ps.length} participating`}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => setOpen(open === e.id ? null : e.id)}>
                      {open === e.id ? 'Hide participants' : `Participants (${ps.length})`}
                    </button>
                    {e.status !== 'removed' && <Link to={`/events/${e.id}/edit`} className="btn-secondary">Edit</Link>}
                    {e.status === 'published' && <button className="btn-secondary" onClick={() => setStatus(e.id, 'cancelled')}>Cancel</button>}
                    {e.status === 'cancelled' && <button className="btn-secondary" onClick={() => setStatus(e.id, 'published')}>Re-open</button>}
                    <button className="btn-secondary text-red-600" onClick={() => remove(e.id)}>Delete</button>
                  </div>
                </div>
                {e.volunteers_needed > 0 && (
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, (ps.length / e.volunteers_needed) * 100)}%` }} />
                  </div>
                )}
                {open === e.id && (
                  ps.length === 0 ? <p className="text-sm text-slate-500">No one has joined yet.</p> : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {ps.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="flex items-center gap-2"><Avatar name={p.profile?.full_name} url={p.profile?.avatar_url} size={24} />{p.profile?.full_name ?? 'Member'}</span>
                          <span className="text-xs text-slate-400">joined {formatDate(p.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
