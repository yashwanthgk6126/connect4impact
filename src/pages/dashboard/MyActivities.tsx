import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_SELECT } from '../../lib/queries'
import type { EventRow, Post } from '../../lib/types'
import { POST_TYPES } from '../../lib/constants'
import { errorMessage, timeAgo } from '../../lib/format'
import EventCard from '../../components/EventCard'
import { Loading } from '../../components/RequireAuth'

export default function MyActivities() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [tab, setTab] = useState<'joined' | 'hosted' | 'posts'>('joined')
  const [joined, setJoined] = useState<EventRow[]>([])
  const [hosted, setHosted] = useState<EventRow[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('event_participants').select(`event:events(${EVENT_SELECT})`).eq('user_id', uid),
      supabase.from('events').select(EVENT_SELECT).eq('host_id', uid).order('start_at', { ascending: false }),
      supabase.from('posts').select('*').eq('author_id', uid).is('event_id', null).order('created_at', { ascending: false }),
    ]).then(([j, h, p]) => {
      const js = ((j.data ?? []) as unknown as { event: EventRow | null }[]).map((x) => x.event).filter(Boolean) as EventRow[]
      setJoined(js.sort((a, b) => a.start_at.localeCompare(b.start_at)))
      setHosted((h.data as EventRow[]) ?? [])
      setPosts((p.data as Post[]) ?? [])
      setLoading(false)
    })
  }, [uid])

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) return alert(errorMessage(error))
    setPosts((ps) => ps.filter((p) => p.id !== id))
  }

  if (loading) return <Loading />
  const tabs = [['joined', `Joined (${joined.length})`], ['hosted', `Hosting (${hosted.length})`], ['posts', `My posts (${posts.length})`]] as const

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Activities</h1>
      <div className="flex gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{l}</button>
        ))}
      </div>
      {tab === 'joined' && (joined.length === 0 ? (
        <div className="card text-slate-500">You haven't joined any activities. <Link to="/explore" className="text-brand-700 underline">Explore activities</Link></div>
      ) : <div className="grid gap-4 sm:grid-cols-2">{joined.map((e) => <EventCard key={e.id} event={e} />)}</div>)}
      {tab === 'hosted' && (hosted.length === 0 ? (
        <div className="card text-slate-500">You haven't hosted any events. <Link to="/dashboard/host-event" className="text-brand-700 underline">Host one now</Link></div>
      ) : <div className="grid gap-4 sm:grid-cols-2">{hosted.map((e) => <EventCard key={e.id} event={e} />)}</div>)}
      {tab === 'posts' && (posts.length === 0 ? (
        <div className="card text-slate-500">No posts yet. <Link to="/dashboard/create-post" className="text-brand-700 underline">Create a post</Link></div>
      ) : posts.map((p) => (
        <div key={p.id} className="card flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`chip ${POST_TYPES[p.post_type].color}`}>{POST_TYPES[p.post_type].label}</span>
              {p.status === 'removed' && <span className="chip bg-red-100 text-red-700">Removed by admin</span>}
              <span className="text-xs text-slate-400">{timeAgo(p.created_at)}</span>
            </div>
            {p.title && <div className="mt-1 font-semibold">{p.title}</div>}
            <p className="line-clamp-2 text-sm text-slate-600">{p.content}</p>
          </div>
          <button className="btn-secondary" onClick={() => deletePost(p.id)}>Delete</button>
        </div>
      )))}
    </div>
  )
}
