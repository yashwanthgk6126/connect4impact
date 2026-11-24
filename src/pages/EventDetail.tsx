import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { EventRow, ProfileSummary } from '../lib/types'
import { EVENT_CATEGORIES } from '../lib/constants'
import { errorMessage, formatDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import ReportButton from '../components/ReportButton'
import JoinPrompt from '../components/JoinPrompt'
import { Loading } from '../components/RequireAuth'

interface Participant {
  user_id: string
  created_at: string
  profile: ProfileSummary | null
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, canParticipate, isAdmin } = useAuth()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [{ data: ev }, { data: parts }] = await Promise.all([
      supabase.from('events').select('*, host:profiles!events_host_id_fkey(id, full_name, avatar_url)').eq('id', id!).maybeSingle(),
      supabase
        .from('event_participants')
        .select('user_id, created_at, profile:profiles!event_participants_user_id_fkey(id, full_name, avatar_url)')
        .eq('event_id', id!)
        .order('created_at'),
    ])
    setEvent(ev as EventRow | null)
    setParticipants((parts as unknown as Participant[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading />
  if (!event) return <div className="card text-center">This activity could not be found. <Link className="text-brand-700 underline" to="/explore">Back to Explore</Link></div>

  const userId = session?.user.id
  const isHost = userId === event.host_id
  const joined = participants.some((p) => p.user_id === userId)
  const past = new Date(event.start_at) < new Date()
  const full = event.volunteers_needed > 0 && participants.length >= event.volunteers_needed
  const open = event.status === 'published' && !past

  async function run(fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(true)
    setError('')
    const { error } = await fn()
    if (error) setError(errorMessage(error))
    await load()
    setBusy(false)
  }

  const join = () => run(() => supabase.from('event_participants').insert({ event_id: event.id, user_id: userId }))
  const leave = () => run(() => supabase.from('event_participants').delete().eq('event_id', event.id).eq('user_id', userId!))
  const setStatus = (status: string) => run(() => supabase.from('events').update({ status, updated_at: new Date().toISOString() }).eq('id', event.id))
  async function del() {
    if (!confirm('Delete this event permanently? It will also disappear from the Community Feed.')) return
    const { error } = await supabase.from('events').delete().eq('id', event!.id)
    if (error) return setError(errorMessage(error))
    navigate('/explore')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/explore" className="text-sm text-brand-700 hover:underline">← Back to Explore Activities</Link>
      <div className="card overflow-hidden p-0">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="max-h-80 w-full object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-5xl">🌱</div>
        )}
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-brand-50 text-brand-700">{EVENT_CATEGORIES[event.category] ?? event.category}</span>
            {event.status === 'cancelled' && <span className="chip bg-red-100 text-red-700">Cancelled</span>}
            {event.status === 'removed' && <span className="chip bg-red-100 text-red-700">Removed by admin</span>}
            {past && <span className="chip bg-slate-100 text-slate-600">Past event</span>}
            <span className="ml-auto"><ReportButton target={{ event_id: event.id, reported_user_id: event.host_id }} label="Report activity" /></span>
          </div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Location</div><div className="font-medium">📍 {event.location}</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Date</div><div className="font-medium">📅 {formatDate(event.start_at)}{event.end_at && <> – {formatDate(event.end_at)}</>}</div></div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-slate-500">{event.volunteers_needed > 0 ? 'Volunteers' : 'Participants'}</div>
              <div className="font-medium">🙋 {participants.length}{event.volunteers_needed > 0 && ` / ${event.volunteers_needed} needed`}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Avatar name={event.host?.full_name} url={event.host?.avatar_url} size={28} /> Hosted by <span className="font-medium">{event.host?.full_name}</span>
          </div>
          <p className="whitespace-pre-line text-slate-700">{event.description}</p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!session ? (
            <JoinPrompt action="join this activity" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {canParticipate && !isHost && (joined ? (
                <button className="btn-secondary" disabled={busy} onClick={leave}>Leave activity</button>
              ) : (
                <button className="btn-primary" disabled={busy || !open || full} onClick={join}>
                  {!open ? 'Not open for registration' : full ? 'All volunteer spots filled' : event.volunteers_needed > 0 ? 'Volunteer for this activity' : 'Join this activity'}
                </button>
              ))}
              {joined && <span className="self-center text-sm font-medium text-brand-700">✓ You are participating</span>}
              {isHost && (
                <>
                  <Link to={`/events/${event.id}/edit`} className="btn-secondary">Edit event</Link>
                  {event.status === 'published' && <button className="btn-secondary" disabled={busy} onClick={() => setStatus('cancelled')}>Cancel event</button>}
                  {event.status === 'cancelled' && <button className="btn-secondary" disabled={busy} onClick={() => setStatus('published')}>Re-open event</button>}
                  <button className="btn-danger" disabled={busy} onClick={del}>Delete</button>
                </>
              )}
              {isAdmin && !isHost && (event.status === 'removed' ? (
                <button className="btn-secondary" disabled={busy} onClick={() => setStatus('published')}>Restore (admin)</button>
              ) : (
                <button className="btn-danger" disabled={busy} onClick={() => setStatus('removed')}>Remove (admin)</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Who's participating ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-slate-500">No one has joined yet. Be the first!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {participants.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 text-sm">
                <Avatar name={p.profile?.full_name} url={p.profile?.avatar_url} size={26} />
                {p.profile?.full_name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
