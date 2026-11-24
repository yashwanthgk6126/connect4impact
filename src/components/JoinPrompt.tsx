import { Link } from 'react-router-dom'

export default function JoinPrompt({ action }: { action: string }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 bg-brand-50">
      <p className="text-sm text-brand-900">Registration is required to {action}. Visitors can browse everything.</p>
      <div className="flex gap-2">
        <Link to="/login" className="btn-secondary">Sign in</Link>
        <Link to="/signup" className="btn-primary">Create free account</Link>
      </div>
    </div>
  )
}
