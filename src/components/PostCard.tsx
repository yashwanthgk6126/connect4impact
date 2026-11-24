import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../lib/types'
import { POST_TYPES, EVENT_CATEGORIES } from '../lib/constants'
import { countOf, formatDate, timeAgo, errorMessage } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import ReportButton from './ReportButton'
import Comments from './Comments'

interface Props {
  post: Post
  liked: boolean
  onLikeChange: (postId: string, liked: boolean) => void
  onDeleted?: (postId: string) => void
}

export default function PostCard({ post, liked, onLikeChange, onDeleted }: Props) {
  const { session, canParticipate, isAdmin } = useAuth()
  const [likeCount, setLikeCount] = useState(countOf(post.post_likes))
  const [commentCount, setCommentCount] = useState(countOf(post.comments))
  const [showComments, setShowComments] = useState(false)
  const [busy, setBusy] = useState(false)
  const type = POST_TYPES[post.post_type]
  const isOwner = session?.user.id === post.author_id

  async function toggleLike() {
    if (!session || !canParticipate || busy) return
    setBusy(true)
    const { error } = liked
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', session.user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id })
    if (!error) {
      setLikeCount((c) => c + (liked ? -1 : 1))
      onLikeChange(post.id, !liked)
    }
    setBusy(false)
  }

  async function remove() {
    const msg = isOwner ? 'Delete this post?' : 'Remove this post as administrator?'
    if (!confirm(msg)) return
    const { error } = isOwner && !post.event_id
      ? await supabase.from('posts').delete().eq('id', post.id)
      : await supabase.from('posts').update({ status: 'removed' }).eq('id', post.id)
    if (error) alert(errorMessage(error))
    else onDeleted?.(post.id)
  }

  return (
    <article className="card">
      <header className="mb-3 flex items-start gap-3">
        <Avatar name={post.author?.full_name} url={post.author?.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{post.author?.full_name ?? 'Community member'}</span>
            <span className={`chip ${type.color}`}>{type.label}</span>
          </div>
          <div className="text-xs text-slate-500">
            {timeAgo(post.created_at)}
            {post.location && <> · {post.location}</>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(isOwner && !post.event_id) || isAdmin ? (
            <button className="text-xs text-slate-400 hover:text-red-600" onClick={remove}>
              {isOwner && !post.event_id ? 'Delete' : 'Remove'}
            </button>
          ) : null}
          <ReportButton target={{ post_id: post.id, reported_user_id: post.author_id }} />
        </div>
      </header>

      {post.title && <h3 className="mb-1 text-lg font-semibold">{post.title}</h3>}
      {post.event && (
        <div className="mb-2 flex flex-wrap gap-2 text-sm text-slate-600">
          <span>📅 {formatDate(post.event.start_at)}</span>
          <span>🏷️ {EVENT_CATEGORIES[post.event.category] ?? post.event.category}</span>
          {post.event.volunteers_needed > 0 && <span>🙋 {post.event.volunteers_needed} volunteers needed</span>}
          {post.event.status === 'cancelled' && <span className="chip bg-red-100 text-red-700">Cancelled</span>}
        </div>
      )}
      {post.content && <p className="whitespace-pre-line text-slate-700">{post.content}</p>}
      {post.image_url && <img src={post.image_url} alt={post.title ?? 'Post image'} className="mt-3 max-h-[28rem] w-full rounded-lg object-cover" />}
      {post.event_id && (
        <Link to={`/events/${post.event_id}`} className="btn-primary mt-3">View activity & participate</Link>
      )}

      <footer className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
        <button
          onClick={toggleLike}
          disabled={!canParticipate}
          title={canParticipate ? '' : 'Sign in to like posts'}
          className={`flex items-center gap-1 ${liked ? 'font-semibold text-red-600' : 'text-slate-600 hover:text-red-600'} disabled:cursor-default`}
        >
          {liked ? '♥' : '♡'} {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="text-slate-600 hover:text-brand-700">
          💬 {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button>
      </footer>
      {showComments && <Comments postId={post.id} onCountChange={(d) => setCommentCount((c) => c + d)} />}
    </article>
  )
}
