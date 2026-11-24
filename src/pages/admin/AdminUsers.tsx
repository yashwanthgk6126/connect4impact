import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../lib/types'
import { errorMessage, formatDate } from '../../lib/format'
import Avatar from '../../components/Avatar'

export default function AdminUsers() {
  const { session } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
    if (search.trim()) q = q.ilike('full_name', `%${search.trim().replace(/[%_,()]/g, '')}%`)
    const { data } = await q
    setUsers((data as Profile[]) ?? [])
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  async function update(id: string, patch: Partial<Profile>, confirmMsg: string) {
    if (!confirm(confirmMsg)) return
    setError('')
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) setError(errorMessage(error))
    load()
  }

  return (
    <div className="space-y-3">
      <input className="input max-w-sm" placeholder="Search users by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">User</th><th className="p-3">Location</th><th className="p-3">Joined</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === session?.user.id
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3"><div className="flex items-center gap-2"><Avatar name={u.full_name} url={u.avatar_url} size={28} />{u.full_name}{self && <span className="text-xs text-slate-400">(you)</span>}</div></td>
                  <td className="p-3">{u.location ?? '—'}</td>
                  <td className="p-3">{formatDate(u.created_at, false)}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3">{u.is_suspended ? <span className="chip bg-red-100 text-red-700">Suspended</span> : <span className="chip bg-brand-100 text-brand-700">Active</span>}</td>
                  <td className="space-x-2 whitespace-nowrap p-3 text-right">
                    {!self && (u.is_suspended ? (
                      <button className="btn-secondary" onClick={() => update(u.id, { is_suspended: false }, `Reinstate ${u.full_name}?`)}>Reinstate</button>
                    ) : (
                      <button className="btn-danger" onClick={() => update(u.id, { is_suspended: true }, `Suspend ${u.full_name}? They will no longer be able to post or participate.`)}>Suspend</button>
                    ))}
                    {!self && (u.role === 'admin' ? (
                      <button className="btn-secondary" onClick={() => update(u.id, { role: 'user' }, `Remove admin rights from ${u.full_name}?`)}>Revoke admin</button>
                    ) : (
                      <button className="btn-secondary" onClick={() => update(u.id, { role: 'admin' }, `Make ${u.full_name} an administrator?`)}>Make admin</button>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
