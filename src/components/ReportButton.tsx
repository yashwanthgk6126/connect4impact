import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { REPORT_REASONS } from '../lib/constants'
import { errorMessage } from '../lib/format'

interface Target {
  reported_user_id?: string
  post_id?: string
  comment_id?: string
  event_id?: string
}

export default function ReportButton({ target, label = 'Report' }: { target: Target; label?: string }) {
  const { session, canParticipate } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')

  if (!session || !canParticipate) return null
  if (target.reported_user_id === session.user.id) return null

  async function submit() {
    setState('sending')
    setError('')
    const { error } = await supabase
      .from('user_reports')
      .insert({ ...target, reporter_id: session!.user.id, reason, details: details || null })
    if (error) {
      setError(errorMessage(error))
      setState('idle')
    } else setState('done')
  }

  return (
    <>
      <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {state === 'done' ? (
              <>
                <h3 className="mb-2 font-semibold">Thanks for reporting</h3>
                <p className="mb-4 text-sm text-slate-600">Our administrators will review this shortly.</p>
                <button className="btn-primary" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h3 className="mb-3 font-semibold">Report inappropriate content</h3>
                <label className="label">Reason</label>
                <select className="input mb-3" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <label className="label">Details (optional)</label>
                <textarea className="input mb-3" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                  <button className="btn-danger" disabled={state === 'sending'} onClick={submit}>Submit report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
