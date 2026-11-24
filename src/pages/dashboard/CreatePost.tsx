import { useNavigate } from 'react-router-dom'
import PostComposer from '../../components/PostComposer'
import { useAuth } from '../../context/AuthContext'

export default function CreatePost() {
  const navigate = useNavigate()
  const { canParticipate } = useAuth()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Create Post</h1>
        <p className="text-slate-600">Publish an update, announcement, photograph, volunteering opportunity or help request to the Community Feed.</p>
      </div>
      {canParticipate ? <PostComposer onCreated={() => setTimeout(() => navigate('/'), 600)} /> : <div className="card">Suspended accounts cannot post.</div>}
    </div>
  )
}
