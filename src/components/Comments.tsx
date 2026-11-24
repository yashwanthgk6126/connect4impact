import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Comment } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { errorMessage, timeAgo } from '../lib/format'
import Avatar from './Avatar'
import ReportButton from './ReportButton'

export default function Comments({ postId, onCountChange }: { postId: string; onCountChange: (delta: number) => void }) {
  const { session, canParticipate, isAdmin } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at')
      .then(({ data }) => {
        setComments((data as Comment[]) ?? [])
        setLoading(false)
      })
  }, [postId])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !session) return
    setError('')
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: session.user.id, content: text.trim() })
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single()
    if (error) return setError(errorMessage(error))
    setComments((c) => [...c, data as Comment])
    setText('')
    onCountChange(1)
  }

  async function remove(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) return alert(errorMessage(error))
    setComments((c) => c.filter((x) => x.id !== id))
    onCountChange(-1)
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {loading && <p className="text-sm text-slate-500">Loading comments…</p>}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar name={c.author?.full_name} url={c.author?.avatar_url} size={28} />
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">{c.author?.full_name}</span>
              <span className="text-slate-400">{timeAgo(c.created_at)}</span>
              <span className="ml-auto flex gap-2">
                {(c.author_id === session?.user.id || isAdmin) && (
                  <button className="text-slate-400 hover:text-red-600" onClick={() => remove(c.id)}>Delete</button>
                )}
                <ReportButton target={{ comment_id: c.id, reported_user_id: c.author_id }} />
              </span>
            </div>
            <p className="whitespace-pre-line text-sm">{c.content}</p>
          </div>
        </div>
      ))}
      {canParticipate ? (
        <form onSubmit={add} className="flex gap-2">
          <input className="input" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <button className="btn-primary" disabled={!text.trim()}>Post</button>
        </form>
      ) : !session ? (
        <p className="text-sm text-slate-500"><Link to="/login" className="text-brand-700 underline">Sign in</Link> to join the conversation.</p>
      ) : null}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
