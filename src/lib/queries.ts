import { supabase } from './supabase'

export const POST_SELECT =
  '*, author:profiles!posts_author_id_fkey(id, full_name, avatar_url), event:events!posts_event_id_fkey(id, start_at, category, volunteers_needed, status), post_likes(count), comments(count)'

export const EVENT_SELECT = '*, host:profiles!events_host_id_fkey(id, full_name, avatar_url), event_participants(count)'

export async function fetchLikedPostIds(userId: string | undefined, postIds: string[]) {
  if (!userId || postIds.length === 0) return new Set<string>()
  const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds)
  return new Set((data ?? []).map((r) => r.post_id as string))
}
