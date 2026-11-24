import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import { isConfigured } from '../lib/supabase'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`

export default function Layout() {
  const { session, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      {!isConfigured && (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </div>
      )}
      {profile?.is_suspended && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or participate.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/" className="mr-4 flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">C4</span>
            Connect4Impact
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            <NavLink to="/explore" className={navClass}>Explore Activities</NavLink>
            {session && <NavLink to="/host" className={navClass}>Host Events</NavLink>}
            {session && <NavLink to="/participate" className={navClass}>Participate</NavLink>}
            {session && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
            {isAdmin && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          </nav>
          {session ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard/profile" className="flex items-center gap-2 text-sm font-medium">
                <Avatar name={profile?.full_name} url={profile?.avatar_url} size={32} />
                <span className="hidden sm:inline">{profile?.full_name}</span>
              </Link>
              <button
                className="btn-secondary"
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary">Sign in</Link>
              <Link to="/signup" className="btn-primary">Join the community</Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Connect4Impact — discover activities, share initiatives, volunteer, redistribute food and solve local problems together.
      </footer>
    </div>
  )
}
