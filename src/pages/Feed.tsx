import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { POST_SELECT, fetchLikedPostIds } from '../lib/queries'
import type { Post, PostType } from '../lib/types'
import { POST_TYPES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'
import PostComposer from '../components/PostComposer'
import JoinPrompt from '../components/JoinPrompt'
import { Loading } from '../components/RequireAuth'

const PAGE = 15

export default function Feed() {
  const { session, canParticipate } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<PostType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const userId = session?.user.id

  const load = useCallback(
    async (offset = 0) => {
      if (offset === 0) setLoading(true)
      let q = supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1)
      if (filter !== 'all') q = q.eq('post_type', filter)
      const { data } = await q
      const rows = (data as Post[]) ?? []
      const likedIds = await fetchLikedPostIds(userId, rows.map((p) => p.id))
      setPosts((prev) => (offset === 0 ? rows : [...prev, ...rows]))
      setLiked((prev) => (offset === 0 ? likedIds : new Set([...prev, ...likedIds])))
      setHasMore(rows.length === PAGE)
      setLoading(false)
    },
    [filter, userId],
  )

  useEffect(() => {
    load(0)
  }, [load])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Community Feed</h1>
          <p className="text-slate-600">Announcements, photographs, updates, volunteering calls and help requests from the community.</p>
        </div>
        {canParticipate ? <PostComposer onCreated={() => load(0)} /> : !session ? <JoinPrompt action="post, like and comment" /> : null}
        <div className="flex flex-wrap gap-2">
          {(['all', ...Object.keys(POST_TYPES)] as (PostType | 'all')[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`chip cursor-pointer px-3 py-1 ${filter === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
            >
              {t === 'all' ? 'All posts' : POST_TYPES[t].label}
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : posts.length === 0 ? (
          <div className="card text-center text-slate-500">No posts yet. Be the first to share something!</div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              liked={liked.has(p.id)}
              onLikeChange={(id, v) =>
                setLiked((s) => {
                  const n = new Set(s)
                  if (v) n.add(id)
                  else n.delete(id)
                  return n
                })
              }
              onDeleted={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
            />
          ))
        )}
        {hasMore && !loading && (
          <button className="btn-secondary w-full" onClick={() => load(posts.length)}>Load more</button>
        )}
      </div>
      <aside className="space-y-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <h2 className="mb-1 text-lg font-semibold">Looking for something to do?</h2>
          <p className="mb-3 text-sm text-brand-50">Find tree plantations, food drives, blood donation camps and more near you.</p>
          <Link to="/explore" className="btn bg-white text-brand-700 hover:bg-brand-50">Explore Activities</Link>
        </div>
        {canParticipate && (
          <div className="card space-y-2 text-sm">
            <h2 className="font-semibold">Quick actions</h2>
            <Link to="/dashboard/host-event" className="block text-brand-700 hover:underline">📅 Host an event</Link>
            <Link to="/dashboard/food" className="block text-brand-700 hover:underline">🍱 Donate or request food</Link>
            <Link to="/dashboard/issues" className="block text-brand-700 hover:underline">🚧 Report a local issue</Link>
            <Link to="/dashboard/polls" className="block text-brand-700 hover:underline">🗳️ Start a civic poll</Link>
          </div>
        )}
      </aside>
    </div>
  )
}
