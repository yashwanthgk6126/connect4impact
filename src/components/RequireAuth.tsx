import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function Loading() {
  return <div className="py-16 text-center text-slate-500">Loading…</div>
}

export default function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading || (session && !profile)) return <Loading />
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (admin && !isAdmin) return <div className="card text-center">Administrator access is required.</div>
  return <>{children}</>
}
