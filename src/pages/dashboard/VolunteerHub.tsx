import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { EVENT_SELECT, POST_SELECT, fetchLikedPostIds } from '../../lib/queries'
import type { EventRow, Post } from '../../lib/types'
import { countOf } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import EventCard from '../../components/EventCard'
import PostCard from '../../components/PostCard'
import { Loading } from '../../components/RequireAuth'

export default function VolunteerHub() {
  const { session } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('events').select(EVENT_SELECT).eq('status', 'published').gt('volunteers_needed', 0)
        .gte('start_at', new Date().toISOString()).order('start_at'),
      supabase.from('posts').select(POST_SELECT).eq('status', 'published').in('post_type', ['volunteer', 'help_request'])
        .order('created_at', { ascending: false }).limit(20),
    ]).then(async ([ev, ps]) => {
      const evs = ((ev.data as EventRow[]) ?? []).filter((e) => countOf(e.event_participants) < e.volunteers_needed)
      const pss = (ps.data as Post[]) ?? []
      setEvents(evs)
      setPosts(pss)
      setLiked(await fetchLikedPostIds(session?.user.id, pss.map((p) => p.id)))
      setLoading(false)
    })
  }, [session?.user.id])

  if (loading) return <Loading />
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteer Hub</h1>
        <p className="text-slate-600">Upcoming activities that still need volunteers, plus volunteering calls and help requests.</p>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Activities needing volunteers ({events.length})</h2>
        {events.length === 0 ? <div className="card text-slate-500">No open volunteer spots right now.</div> : (
          <div className="grid gap-4 sm:grid-cols-2">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Volunteering calls & help requests</h2>
        {posts.length === 0 ? <div className="card text-slate-500">No requests right now.</div> :
          posts.map((p) => (
            <PostCard key={p.id} post={p} liked={liked.has(p.id)}
              onLikeChange={(id, v) => setLiked((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n })}
              onDeleted={(id) => setPosts((x) => x.filter((p) => p.id !== id))} />
          ))}
      </section>
    </div>
  )
}
