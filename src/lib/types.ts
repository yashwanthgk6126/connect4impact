export type Role = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  role: Role
  is_suspended: boolean
  created_at: string
}

export type ProfileSummary = Pick<Profile, 'id' | 'full_name' | 'avatar_url'>

export type PostType = 'update' | 'announcement' | 'photo' | 'volunteer' | 'event' | 'help_request'

export interface EventRow {
  id: string
  host_id: string
  title: string
  description: string
  category: string
  location: string
  start_at: string
  end_at: string | null
  volunteers_needed: number
  image_url: string | null
  status: 'published' | 'cancelled' | 'removed'
  created_at: string
  host?: ProfileSummary | null
  event_participants?: { count: number }[]
}

export interface Post {
  id: string
  author_id: string
  post_type: PostType
  title: string | null
  content: string
  image_url: string | null
  location: string | null
  event_id: string | null
  status: 'published' | 'removed'
  created_at: string
  author?: ProfileSummary | null
  event?: Pick<EventRow, 'id' | 'start_at' | 'category' | 'volunteers_needed' | 'status'> | null
  post_likes?: { count: number }[]
  comments?: { count: number }[]
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  author?: ProfileSummary | null
}
