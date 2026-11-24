import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EVENT_SELECT } from '../lib/queries'
import type { EventRow } from '../lib/types'
import { EVENT_CATEGORIES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import EventCard from '../components/EventCard'
import { Loading } from '../components/RequireAuth'

type When = 'upcoming' | 'all' | 'past'
type Sort = 'recent' | 'soonest'

export default function Explore() {
  const { canParticipate } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [category, setCategory] = useState('')
  const [when, setWhen] = useState<When>('upcoming')
  const [volunteerOnly, setVolunteerOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('recent')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(location.trim()), 300)
    return () => clearTimeout(t)
  }, [location])

  useEffect(() => {
    setLoading(true)
    const now = new Date().toISOString()
    let q = supabase.from('events').select(EVENT_SELECT).neq('status', 'removed')
    if (debouncedLocation) q = q.ilike('location', `%${debouncedLocation.replace(/[%_,()]/g, '')}%`)
    if (category) q = q.eq('category', category)
    if (when === 'upcoming') q = q.gte('start_at', now)
    if (when === 'past') q = q.lt('start_at', now)
    if (volunteerOnly) q = q.gt('volunteers_needed', 0)
    q = sort === 'recent' ? q.order('created_at', { ascending: false }) : q.order('start_at', { ascending: true })
    q.limit(60).then(({ data }) => {
      setEvents((data as EventRow[]) ?? [])
      setLoading(false)
    })
  }, [debouncedLocation, category, when, volunteerOnly, sort])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore Activities</h1>
          <p className="text-slate-600">Organized activities and events you can join.</p>
        </div>
        {canParticipate && <Link to="/host/new" className="btn-primary">+ Host an event</Link>}
      </div>

      <div className="card grid gap-3 md:grid-cols-5">
        <div>
          <label className="label">Location</label>
          <input className="input" placeholder="e.g. Bengaluru" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {Object.entries(EVENT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">When</label>
          <select className="input" value={when} onChange={(e) => setWhen(e.target.value as When)}>
            <option value="upcoming">Upcoming events</option>
            <option value="all">All dates</option>
            <option value="past">Past events</option>
          </select>
        </div>
        <div>
          <label className="label">Sort by</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Recently published</option>
            <option value="soonest">Event date (soonest)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={volunteerOnly} onChange={(e) => setVolunteerOnly(e.target.checked)} />
          Volunteer opportunities only
        </label>
      </div>

      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <div className="card text-center text-slate-500">No activities match these filters.</div>
      ) : (
        <>
          <p className="text-sm text-slate-500">{events.length} {events.length === 1 ? 'activity' : 'activities'} found</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </>
      )}
    </div>
  )
}
