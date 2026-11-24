import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, timeAgo } from '../../lib/format'
import type { ProfileSummary } from '../../lib/types'

interface Report {
  id: string
  reason: string
  details: string | null
  status: 'open' | 'dismissed' | 'actioned'
  created_at: string
  post_id: string | null
  comment_id: string | null
  event_id: string | null
  reported_user_id: string | null
  reporter: ProfileSummary | null
  reported_user: (ProfileSummary & { is_suspended: boolean }) | null
  post: { id: string; title: string | null; content: string; status: string } | null
  comment: { id: string; content: string } | null
  event: { id: string; title: string; status: string } | null
}

const SELECT = `*,
  reporter:profiles!user_reports_reporter_id_fkey(id, full_name, avatar_url),
  reported_user:profiles!user_reports_reported_user_id_fkey(id, full_name, avatar_url, is_suspended),
  post:posts!user_reports_post_id_fkey(id, title, content, status),
  comment:comments!user_reports_comment_id_fkey(id, content),
  event:events!user_reports_event_id_fkey(id, title, status)`

export default function AdminReports() {
  const { session } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState<'open' | 'dismissed' | 'actioned'>('open')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('user_reports').select(SELECT).eq('status', status).order('created_at', { ascending: false })
    if (error) setError(errorMessage(error))
    setReports((data as unknown as Report[]) ?? [])
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  async function resolve(r: Report, action: 'dismiss' | 'remove' | 'suspend') {
    setError('')
    try {
      if (action === 'remove') {
        if (r.comment_id) {
          const { error } = await supabase.from('comments').delete().eq('id', r.comment_id)
          if (error) throw error
        } else if (r.post_id) {
          const { error } = await supabase.from('posts').update({ status: 'removed' }).eq('id', r.post_id)
          if (error) throw error
        } else if (r.event_id) {
          const { error } = await supabase.from('events').update({ status: 'removed' }).eq('id', r.event_id)
          if (error) throw error
        }
      }
      if (action === 'suspend' && r.reported_user_id) {
        const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('id', r.reported_user_id)
        if (error) throw error
      }
      const { error } = await supabase
        .from('user_reports')
        .update({ status: action === 'dismiss' ? 'dismissed' : 'actioned', reviewed_by: session!.user.id })
        .eq('id', r.id)
      if (error) throw error
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['open', 'actioned', 'dismissed'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`chip cursor-pointer px-3 py-1 capitalize ${status === s ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-slate-200'}`}>{s}</button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {reports.length === 0 && <div className="card text-slate-500">No {status} reports.</div>}
      {reports.map((r) => {
        const kind = r.comment_id ? 'Comment' : r.post_id ? 'Post' : r.event_id ? 'Event' : 'User'
        return (
          <div key={r.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-red-100 text-red-700">{kind}</span>
              <span className="font-semibold">{r.reason}</span>
              <span className="text-xs text-slate-400">reported by {r.reporter?.full_name} · {timeAgo(r.created_at)}</span>
            </div>
            {r.details && <p className="text-sm text-slate-600">“{r.details}”</p>}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              {r.comment && <p>💬 {r.comment.content}</p>}
              {!r.comment && r.post && <p><b>{r.post.title}</b> {r.post.content.slice(0, 200)} {r.post.status === 'removed' && <span className="chip bg-red-100 text-red-700">removed</span>}</p>}
              {r.event && <Link to={`/events/${r.event.id}`} className="text-brand-700 underline">📅 {r.event.title}</Link>}
              {r.event?.status === 'removed' && <span className="chip ml-2 bg-red-100 text-red-700">removed</span>}
              {(r.comment_id || r.post_id || r.event_id) && !r.comment && !r.post && !r.event && <p className="text-slate-400">Content already deleted</p>}
              {r.reported_user && <p className="mt-1 text-slate-500">Author: {r.reported_user.full_name} {r.reported_user.is_suspended && <span className="chip bg-amber-100 text-amber-800">suspended</span>}</p>}
            </div>
            {r.status === 'open' && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => resolve(r, 'dismiss')}>Dismiss</button>
                {(r.comment || r.post || r.event) && <button className="btn-danger" onClick={() => resolve(r, 'remove')}>Remove content</button>}
                {r.reported_user && !r.reported_user.is_suspended && <button className="btn-danger" onClick={() => resolve(r, 'suspend')}>Suspend user</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
