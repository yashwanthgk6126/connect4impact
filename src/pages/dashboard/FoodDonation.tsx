import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { errorMessage, formatDate, timeAgo } from '../../lib/format'
import type { ProfileSummary } from '../../lib/types'

interface Donation {
  id: string
  donor_id: string
  food_item: string
  quantity: string
  location: string
  pickup_by: string | null
  contact: string | null
  notes: string | null
  status: 'available' | 'claimed' | 'collected'
  claimed_by: string | null
  created_at: string
  donor: ProfileSummary | null
}
interface FoodRequest {
  id: string
  requester_id: string
  description: string
  people_count: number
  location: string
  needed_by: string | null
  contact: string | null
  status: 'open' | 'fulfilled'
  created_at: string
  requester: ProfileSummary | null
}

const STATUS_COLORS = { available: 'bg-brand-100 text-brand-700', claimed: 'bg-amber-100 text-amber-800', collected: 'bg-slate-100 text-slate-600', open: 'bg-sky-100 text-sky-700', fulfilled: 'bg-slate-100 text-slate-600' }

export default function FoodDonation() {
  const { session, isAdmin, canParticipate } = useAuth()
  const uid = session!.user.id
  const [tab, setTab] = useState<'donations' | 'requests'>('donations')
  const [donations, setDonations] = useState<Donation[]>([])
  const [requests, setRequests] = useState<FoodRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [d, setD] = useState({ food_item: '', quantity: '', location: '', pickup_by: '', contact: '', notes: '' })
  const [r, setR] = useState({ description: '', people_count: 1, location: '', needed_by: '', contact: '' })

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('food_donations').select('*, donor:profiles!food_donations_donor_id_fkey(id, full_name, avatar_url)').order('created_at', { ascending: false }),
      supabase.from('food_requests').select('*, requester:profiles!food_requests_requester_id_fkey(id, full_name, avatar_url)').order('created_at', { ascending: false }),
    ])
    setDonations((a.data as Donation[]) ?? [])
    setRequests((b.data as FoodRequest[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function act(p: PromiseLike<{ error: unknown }>) {
    setError('')
    const { error } = await p
    if (error) setError(errorMessage(error))
    await load()
  }

  async function submitDonation(e: React.FormEvent) {
    e.preventDefault()
    await act(supabase.from('food_donations').insert({ ...d, donor_id: uid, pickup_by: d.pickup_by ? new Date(d.pickup_by).toISOString() : null, contact: d.contact || null, notes: d.notes || null }))
    setD({ food_item: '', quantity: '', location: '', pickup_by: '', contact: '', notes: '' })
    setShowForm(false)
  }
  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    await act(supabase.from('food_requests').insert({ ...r, requester_id: uid, needed_by: r.needed_by ? new Date(r.needed_by).toISOString() : null, contact: r.contact || null }))
    setR({ description: '', people_count: 1, location: '', needed_by: '', contact: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Food Donation</h1>
          <p className="text-slate-600">Redistribute surplus food and help people who need a meal.</p>
        </div>
        {canParticipate && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : tab === 'donations' ? '+ Donate food' : '+ Request food'}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {(['donations', 'requests'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false) }} className={`btn ${tab === t ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>
            {t === 'donations' ? `Available food (${donations.filter((x) => x.status === 'available').length})` : `Food requests (${requests.filter((x) => x.status === 'open').length})`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && tab === 'donations' && (
        <form onSubmit={submitDonation} className="card grid gap-3 sm:grid-cols-2">
          <div><label className="label">Food item *</label><input className="input" required value={d.food_item} onChange={(e) => setD({ ...d, food_item: e.target.value })} placeholder="e.g. Cooked rice & dal" /></div>
          <div><label className="label">Quantity *</label><input className="input" required value={d.quantity} onChange={(e) => setD({ ...d, quantity: e.target.value })} placeholder="e.g. Serves 20" /></div>
          <div><label className="label">Pickup location *</label><input className="input" required value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} /></div>
          <div><label className="label">Pick up before</label><input className="input" type="datetime-local" value={d.pickup_by} onChange={(e) => setD({ ...d, pickup_by: e.target.value })} /></div>
          <div><label className="label">Contact (phone)</label><input className="input" value={d.contact} onChange={(e) => setD({ ...d, contact: e.target.value })} /></div>
          <div><label className="label">Notes</label><input className="input" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-end"><button className="btn-primary">Post donation</button></div>
        </form>
      )}
      {showForm && tab === 'requests' && (
        <form onSubmit={submitRequest} className="card grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">What is needed? *</label><input className="input" required value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></div>
          <div><label className="label">Number of people *</label><input className="input" type="number" min={1} required value={r.people_count} onChange={(e) => setR({ ...r, people_count: Math.max(1, Number(e.target.value)) })} /></div>
          <div><label className="label">Location *</label><input className="input" required value={r.location} onChange={(e) => setR({ ...r, location: e.target.value })} /></div>
          <div><label className="label">Needed by</label><input className="input" type="datetime-local" value={r.needed_by} onChange={(e) => setR({ ...r, needed_by: e.target.value })} /></div>
          <div><label className="label">Contact (phone)</label><input className="input" value={r.contact} onChange={(e) => setR({ ...r, contact: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-end"><button className="btn-primary">Post request</button></div>
        </form>
      )}

      {tab === 'donations' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {donations.length === 0 && <div className="card text-slate-500">No donations yet.</div>}
          {donations.map((x) => (
            <div key={x.id} className="card space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">🍱 {x.food_item}</h3>
                <span className={`chip ${STATUS_COLORS[x.status]}`}>{x.status}</span>
              </div>
              <p className="text-sm text-slate-600">{x.quantity} · 📍 {x.location}</p>
              {x.pickup_by && <p className="text-sm text-slate-600">⏰ Pick up before {formatDate(x.pickup_by)}</p>}
              {x.notes && <p className="text-sm">{x.notes}</p>}
              {x.contact && (x.claimed_by === uid || x.donor_id === uid) && <p className="text-sm">📞 {x.contact}</p>}
              <p className="text-xs text-slate-400">by {x.donor?.full_name} · {timeAgo(x.created_at)}</p>
              <div className="flex gap-2 pt-1">
                {x.status === 'available' && x.donor_id !== uid && canParticipate && (
                  <button className="btn-primary" onClick={() => act(supabase.rpc('claim_food_donation', { donation_id: x.id }))}>Claim for pickup</button>
                )}
                {x.donor_id === uid && x.status === 'claimed' && (
                  <button className="btn-secondary" onClick={() => act(supabase.from('food_donations').update({ status: 'collected' }).eq('id', x.id))}>Mark collected</button>
                )}
                {(x.donor_id === uid || isAdmin) && (
                  <button className="btn-secondary" onClick={() => act(supabase.from('food_donations').delete().eq('id', x.id))}>Delete</button>
                )}
                {x.claimed_by === uid && <span className="self-center text-sm text-brand-700">✓ Claimed by you</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {requests.length === 0 && <div className="card text-slate-500">No requests yet.</div>}
          {requests.map((x) => (
            <div key={x.id} className="card space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{x.description}</h3>
                <span className={`chip ${STATUS_COLORS[x.status]}`}>{x.status}</span>
              </div>
              <p className="text-sm text-slate-600">👥 {x.people_count} people · 📍 {x.location}</p>
              {x.needed_by && <p className="text-sm text-slate-600">⏰ Needed by {formatDate(x.needed_by)}</p>}
              {x.contact && <p className="text-sm">📞 {x.contact}</p>}
              <p className="text-xs text-slate-400">by {x.requester?.full_name} · {timeAgo(x.created_at)}</p>
              {(x.requester_id === uid || isAdmin) && (
                <div className="flex gap-2 pt-1">
                  {x.status === 'open' && <button className="btn-secondary" onClick={() => act(supabase.from('food_requests').update({ status: 'fulfilled' }).eq('id', x.id))}>Mark fulfilled</button>}
                  <button className="btn-secondary" onClick={() => act(supabase.from('food_requests').delete().eq('id', x.id))}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
