import { supabase } from './supabase'

const MAX_BYTES = 5 * 1024 * 1024

export async function uploadImage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > MAX_BYTES) throw new Error('Images must be 5 MB or smaller')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
