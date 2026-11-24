import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function DashboardHome() {
  const { session, profile } = useAuth()
  const uid = session!.user.id
  const [stats, setStats] = useState({ posts: 0, hosted: 0, joined: 0, donations: 0, issues: 0 })

  useEffect(() => {
    const count = (table: string, col: string) =>
      supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, uid).then((r) => r.count ?? 0)
    Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', uid).is('event_id', null).then((r) => r.count ?? 0),
      count('events', 'host_id'),
      count('event_participants', 'user_id'),
      count('food_donations', 'donor_id'),
      count('issue_reports', 'reporter_id'),
    ]).then(([posts, hosted, joined, donations, issues]) => setStats({ posts, hosted, joined, donations, issues }))
  }, [uid])

  const cards = [
    ['Posts shared', stats.posts],
    ['Events hosted', stats.hosted],
    ['Activities joined', stats.joined],
    ['Food donations', stats.donations],
    ['Issues reported', stats.issues],
  ] as const

  const actions = [
    ['/dashboard/create-post', '✍️', 'Create a post', 'Share updates, photographs and announcements'],
    ['/dashboard/host-event', '📅', 'Host an event', 'Organize an activity — it appears in Explore and the Feed'],
    ['/dashboard/volunteer', '🙋', 'Volunteer Hub', 'Find activities that need volunteers'],
    ['/dashboard/food', '🍱', 'Food Donation', 'Redistribute surplus food or request help'],
    ['/dashboard/issues', '🚧', 'Issue Reporting', 'Flag local problems like potholes or garbage'],
    ['/dashboard/polls', '🗳️', 'Civic Polls', 'Let the community decide together'],
    ['/dashboard/impact-ai', '✨', 'Impact AI', 'Personalised suggestions to grow your impact'],
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {profile?.full_name} 👋</h1>
        <p className="text-slate-600">Here's your impact on the community so far.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="card text-center">
            <div className="text-3xl font-bold text-brand-700">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(([to, icon, title, desc]) => (
          <Link key={to} to={to} className="card flex gap-3 transition hover:shadow-md">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-sm text-slate-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
