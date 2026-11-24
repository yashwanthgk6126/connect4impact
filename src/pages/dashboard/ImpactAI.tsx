import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EVENT_SELECT } from '../../lib/queries'
import { EVENT_CATEGORIES, ISSUE_CATEGORIES } from '../../lib/constants'
import { countOf, formatDate } from '../../lib/format'
import type { EventRow } from '../../lib/types'
import { Loading } from '../../components/RequireAuth'

interface Recommendation {
  event: EventRow
  score: number
  reasons: string[]
}

const LEVELS = [
  [0, 'Newcomer'],
  [20, 'Contributor'],
  [60, 'Changemaker'],
  [150, 'Community Champion'],
] as const

export default function ImpactAI() {
  const { session, profile } = useAuth()
  const uid = session!.user.id
  const [loading, setLoading] = useState(true)
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [score, setScore] = useState(0)
  const [breakdown, setBreakdown] = useState<[string, number, number][]>([])
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    async function run() {
      const now = new Date().toISOString()
      const [joinedRes, upcomingRes, postsRes, hostedRes, donationsRes, issuesRes, votesRes, openIssuesRes, foodReqRes] = await Promise.all([
        supabase.from('event_participants').select('event:events(category, location)').eq('user_id', uid),
        supabase.from('events').select(EVENT_SELECT).eq('status', 'published').gte('start_at', now).order('start_at').limit(100),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', uid).is('event_id', null),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('host_id', uid),
        supabase.from('food_donations').select('*', { count: 'exact', head: true }).eq('donor_id', uid),
        supabase.from('issue_reports').select('*', { count: 'exact', head: true }).eq('reporter_id', uid),
        supabase.from('poll_votes').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('issue_reports').select('category, location').neq('status', 'resolved'),
        supabase.from('food_requests').select('location, people_count').eq('status', 'open'),
      ])

      const joined = ((joinedRes.data ?? []) as unknown as { event: { category: string; location: string } | null }[])
        .map((j) => j.event)
        .filter(Boolean) as { category: string; location: string }[]
      const catFreq = new Map<string, number>()
      joined.forEach((e) => catFreq.set(e.category, (catFreq.get(e.category) ?? 0) + 1))
      const home = (profile?.location ?? '').toLowerCase().trim()

      const upcoming = ((upcomingRes.data as EventRow[]) ?? []).filter((e) => e.host_id !== uid)
      const { data: myJoins } = await supabase.from('event_participants').select('event_id').eq('user_id', uid)
      const joinedIds = new Set((myJoins ?? []).map((j) => j.event_id))

      const scored = upcoming
        .filter((e) => !joinedIds.has(e.id))
        .map((e) => {
          const reasons: string[] = []
          let s = 0
          if (home && e.location.toLowerCase().includes(home)) {
            s += 3
            reasons.push(`Near you in ${e.location}`)
          }
          const c = catFreq.get(e.category) ?? 0
          if (c) {
            s += 2 + c
            reasons.push(`You've joined ${c} ${EVENT_CATEGORIES[e.category]} ${c === 1 ? 'activity' : 'activities'}`)
          }
          const joinedCount = countOf(e.event_participants)
          if (e.volunteers_needed > 0 && joinedCount < e.volunteers_needed) {
            const gap = e.volunteers_needed - joinedCount
            s += 2 + Math.min(gap / e.volunteers_needed, 1)
            reasons.push(`${gap} volunteer ${gap === 1 ? 'spot' : 'spots'} still open`)
          }
          const days = (new Date(e.start_at).getTime() - Date.now()) / 86400000
          if (days <= 7) {
            s += 1
            reasons.push('Happening this week')
          }
          if (reasons.length === 0) reasons.push('Trending in the community')
          return { event: e, score: s, reasons }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      setRecs(scored)

      const items: [string, number, number][] = [
        ['Activities joined', joined.length, 10],
        ['Events hosted', hostedRes.count ?? 0, 20],
        ['Food donations', donationsRes.count ?? 0, 15],
        ['Issues reported', issuesRes.count ?? 0, 5],
        ['Posts shared', postsRes.count ?? 0, 2],
        ['Poll votes', votesRes.count ?? 0, 1],
      ]
      setBreakdown(items)
      setScore(items.reduce((sum, [, n, w]) => sum + n * w, 0))

      const tips: string[] = []
      const openIssues = (openIssuesRes.data ?? []) as { category: string; location: string }[]
      const local = home ? openIssues.filter((i) => i.location.toLowerCase().includes(home)) : openIssues
      if (local.length) {
        const top = [...local.reduce((m, i) => m.set(i.category, (m.get(i.category) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]
        tips.push(`${local.length} unresolved local ${local.length === 1 ? 'issue' : 'issues'}${home ? ` in ${profile?.location}` : ''}; most common: ${ISSUE_CATEGORIES[top[0]]}. Consider hosting a ${top[0] === 'garbage' ? 'cleanup drive' : 'community action'} event.`)
      }
      const foodReqs = (foodReqRes.data ?? []) as { location: string; people_count: number }[]
      if (foodReqs.length) {
        const people = foodReqs.reduce((s, r) => s + r.people_count, 0)
        tips.push(`${foodReqs.length} open food ${foodReqs.length === 1 ? 'request' : 'requests'} covering ${people} people. A single donation can make a difference.`)
      }
      if ((hostedRes.count ?? 0) === 0) tips.push('You have not hosted an event yet. Hosting gives the biggest boost to your impact score (+20).')
      if (!home) tips.push('Add your city to your profile to get location-based recommendations.')
      setInsights(tips)
      setLoading(false)
    }
    run()
  }, [uid, profile?.location])

  if (loading) return <Loading />
  const level = [...LEVELS].reverse().find(([min]) => score >= min)![1]
  const next = LEVELS.find(([min]) => min > score)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">✨ Impact AI</h1>
        <p className="text-slate-600">Personalised recommendations and insights based on your location, interests and community needs.</p>
      </div>

      <div className="card grid gap-4 bg-gradient-to-br from-brand-600 to-brand-900 text-white sm:grid-cols-[auto_1fr]">
        <div className="text-center">
          <div className="text-5xl font-bold">{score}</div>
          <div className="text-sm text-brand-100">Impact score</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{level}</div>
          {next && <p className="text-sm text-brand-100">{next[0] - score} points to reach {next[1]}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {breakdown.map(([label, n, w]) => (
              <div key={label} className="rounded-lg bg-white/10 px-2 py-1">{label}: <b>{n}</b> <span className="text-brand-100">(+{w} each)</span></div>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recommended for you</h2>
        {recs.length === 0 ? <div className="card text-slate-500">No upcoming activities to recommend right now.</div> :
          recs.map(({ event, reasons }) => (
            <Link key={event.id} to={`/events/${event.id}`} className="card flex flex-wrap items-center justify-between gap-3 transition hover:shadow-md">
              <div>
                <div className="font-semibold">{event.title}</div>
                <div className="text-sm text-slate-500">📍 {event.location} · 📅 {formatDate(event.start_at)}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {reasons.map((r) => <span key={r} className="chip bg-brand-50 text-brand-700">{r}</span>)}
                </div>
              </div>
              <span className="btn-primary">View</span>
            </Link>
          ))}
      </section>

      {insights.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Community insights</h2>
          {insights.map((t) => <div key={t} className="card text-sm">💡 {t}</div>)}
        </section>
      )}
    </div>
  )
}
