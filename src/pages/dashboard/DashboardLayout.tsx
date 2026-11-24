import { NavLink, Outlet } from 'react-router-dom'

const links = [
  ['/dashboard', 'Overview', '🏠'],
  ['/dashboard/create-post', 'Create Post', '✍️'],
  ['/dashboard/host-event', 'Host Event', '📅'],
  ['/dashboard/volunteer', 'Volunteer Hub', '🙋'],
  ['/dashboard/food', 'Food Donation', '🍱'],
  ['/dashboard/issues', 'Issue Reporting', '🚧'],
  ['/dashboard/polls', 'Civic Polls', '🗳️'],
  ['/dashboard/impact-ai', 'Impact AI', '✨'],
  ['/dashboard/activities', 'My Activities', '📋'],
  ['/dashboard/profile', 'My Profile', '👤'],
]

export default function DashboardLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-20 md:self-start">
        <nav className="card flex gap-1 overflow-x-auto p-2 md:flex-col">
          {links.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  )
}
