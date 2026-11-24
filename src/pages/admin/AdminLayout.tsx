import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  ['/admin', 'Reports'],
  ['/admin/users', 'User Management'],
  ['/admin/content', 'Content Moderation'],
]

export default function AdminLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-600">Review reports, moderate content and manage users.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/admin'}
            className={({ isActive }) => `btn ${isActive ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}>
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
