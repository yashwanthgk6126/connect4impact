import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { POST_TYPES } from '../lib/constants'
import { uploadImage } from '../lib/upload'
import { errorMessage } from '../lib/format'
import type { PostType } from '../lib/types'
import ImagePicker from './ImagePicker'

const COMPOSER_TYPES: PostType[] = ['update', 'announcement', 'photo', 'volunteer', 'help_request']

export default function PostComposer({ onCreated, defaultType = 'update' }: { onCreated?: () => void; defaultType?: PostType }) {
  const { session, profile } = useAuth()
  const [postType, setPostType] = useState<PostType>(defaultType)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    if (!content.trim() && !file) return setError('Write something or add a photograph')
    if (postType === 'photo' && !file) return setError('Photo posts need a photograph')
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const image_url = file ? await uploadImage(file, session.user.id) : null
      const { error } = await supabase.from('posts').insert({
        author_id: session.user.id,
        post_type: postType,
        title: title.trim() || null,
        content: content.trim(),
        location: location.trim() || null,
        image_url,
      })
      if (error) throw error
      setTitle('')
      setContent('')
      setFile(null)
      setSuccess(true)
      onCreated?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex flex-wrap gap-2">
        {COMPOSER_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setPostType(t)}
            className={`chip cursor-pointer border px-3 py-1 ${postType === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {POST_TYPES[t].label}
          </button>
        ))}
        <Link to="/host/new" className="chip border border-dashed border-brand-600 px-3 py-1 text-brand-700">
          + Host an event
        </Link>
      </div>
      <input className="input" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
      <textarea
        className="input"
        rows={3}
        placeholder={postType === 'help_request' ? 'What help do you need from the community?' : 'Share an update with the community…'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input className="input" placeholder="Location (e.g. Bengaluru)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <ImagePicker file={file} onChange={setFile} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-brand-700">Published to the Community Feed!</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</button>
      </div>
    </form>
  )
}
