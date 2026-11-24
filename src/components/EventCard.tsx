import { Link } from 'react-router-dom'
import type { EventRow } from '../lib/types'
import { EVENT_CATEGORIES } from '../lib/constants'
import { countOf, formatDate } from '../lib/format'

export default function EventCard({ event }: { event: EventRow }) {
  const joined = countOf(event.event_participants)
  const past = new Date(event.start_at) < new Date()
  return (
    <Link to={`/events/${event.id}`} className="card flex flex-col overflow-hidden p-0 transition hover:shadow-md">
      {event.image_url ? (
        <img src={event.image_url} alt={event.title} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-3xl">🌱</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-brand-50 text-brand-700">{EVENT_CATEGORIES[event.category] ?? event.category}</span>
          {event.status === 'cancelled' && <span className="chip bg-red-100 text-red-700">Cancelled</span>}
          {past && event.status !== 'cancelled' && <span className="chip bg-slate-100 text-slate-600">Past</span>}
          {event.volunteers_needed > 0 && <span className="chip bg-sky-100 text-sky-700">Volunteers needed</span>}
        </div>
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <div className="space-y-0.5 text-sm text-slate-600">
          <div>📍 {event.location}</div>
          <div>📅 {formatDate(event.start_at)}</div>
          {event.volunteers_needed > 0 ? (
            <div>🙋 {joined}/{event.volunteers_needed} volunteers joined</div>
          ) : (
            <div>👥 {joined} participating</div>
          )}
        </div>
        <div className="mt-auto pt-2 text-xs text-slate-500">Hosted by {event.host?.full_name ?? 'community member'}</div>
      </div>
    </Link>
  )
}
