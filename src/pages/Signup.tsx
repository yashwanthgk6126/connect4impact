import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/format'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), location: location.trim() || null }, emailRedirectTo: window.location.origin + '/dashboard' },
    })
    setLoading(false)
    if (error) return setError(errorMessage(error))
    if (data.session) navigate('/dashboard', { replace: true })
    else setInfo('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Join Connect4Impact</h1>
          <p className="text-sm text-slate-600">Free and open to everyone. Post, host events, volunteer and help your community.</p>
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">City / area</label>
          <input className="input" placeholder="e.g. Bengaluru" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-brand-700">{info}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-sm text-slate-600">
          Already a member? <Link to="/login" className="text-brand-700 underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
