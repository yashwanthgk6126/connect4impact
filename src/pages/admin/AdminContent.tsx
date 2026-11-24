import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { POST_TYPES } from '../../lib/constants'
import { errorMessage, timeAgo } from '../../lib/format'
import type { Post } from '../../lib/types'

export default function AdminContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [show, setShow] = useState<'published' | 'removed'>('published')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)')
      .eq('status', show)
      .order('created_at', { ascending: false })
      .limit(100)
    setPosts((data as Post[]) ?? [])
  }, [show])

  useEffect(() => {
    load()
  }, [load])

  async function setStatus(p: Post, status: 'published' | 'removed') {
    setError('')
    const { error } = p.event_id
      ? await supabase.from('events').update({ status }).eq('id', p.event_id)
      : await supabase.from('posts').update({ status }).eq('id', p.id)
    if (error) setError(errorMessage(error))
    load()
  }

  async function del(p: Post) {
    if (!confirm('Permanently delete this content?')) return
    const { error } = p.event_id ? await supabase.from('events').delete().eq('id', p.event_id) : await supabase.from('posts').delete().eq('id', p.id)
    if (error) setError(errorMessage(error))
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['published', 'removed'] as const).map((s) => (
          <button key={s} onClick={() => setShow(s)} className={`chip cursor-pointer px-3 py-1 capitalize ${show === s ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{s}</button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {posts.length === 0 && <div className="card text-slate-500">Nothing here.</div>}
      {posts.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`chip ${POST_TYPES[p.post_type].color}`}>{POST_TYPES[p.post_type].label}</span>
              <span className="text-slate-500">{p.author?.full_name} · {timeAgo(p.created_at)}</span>
            </div>
            {p.title && <div className="mt-1 font-semibold">{p.event_id ? <Link to={`/events/${p.event_id}`} className="hover:underline">{p.title}</Link> : p.title}</div>}
            <p className="line-clamp-2 text-sm text-slate-600">{p.content}</p>
          </div>
          <div className="flex gap-2">
            {show === 'published'
              ? <button className="btn-danger" onClick={() => setStatus(p, 'removed')}>Remove</button>
              : <button className="btn-secondary" onClick={() => setStatus(p, 'published')}>Restore</button>}
            <button className="btn-secondary" onClick={() => del(p)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
