// Access-policy checks against a local `supabase db reset` database (Node 22+).
// Usage: SUPABASE_ANON_KEY=... node scripts/rls-test.mjs
import { createClient } from '@supabase/supabase-js'
const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321"
const ANON = process.env.SUPABASE_ANON_KEY
const mk = () => createClient(URL, ANON, { auth: { persistSession: false } })
const login = async (email) => { const c = mk(); const { error } = await c.auth.signInWithPassword({ email, password: 'Demo@1234' }); if (error) throw error; return c }
let fails = 0
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) fails++ }

const anon = mk()
const { data: aposts } = await anon.from('posts').select('id, post_type')
check('anon can browse posts (incl 3 event posts)', aposts.length === 5 && aposts.filter(p => p.post_type === 'event').length === 3)
const { data: aevents } = await anon.from('events').select('id')
check('anon can browse events', aevents.length === 3)
check('anon cannot post', !!(await anon.from('posts').insert({ author_id: '11111111-1111-1111-1111-111111111111', content: 'x' })).error)
const { data: arep } = await anon.from('user_reports').select('*')
check('anon cannot see reports', arep.length === 0)

const rahul = await login('rahul@demo.connect4impact.org')
const priya = await login('priya@demo.connect4impact.org')
const admin = await login('admin@demo.connect4impact.org')
const R = '11111111-1111-1111-1111-111111111111', P = '22222222-2222-2222-2222-222222222222'

const { data: ev, error: evErr } = await rahul.from('events').insert({ host_id: R, title: 'Lake Cleanup', description: 'Clean the lake', category: 'cleanup', location: 'Bengaluru', start_at: new Date(Date.now()+86400000).toISOString(), volunteers_needed: 5 }).select().single()
check('user hosts event', !evErr)
const { data: evPost } = await anon.from('posts').select('*').eq('event_id', ev.id).single()
check('event auto-appears in feed', evPost?.post_type === 'event' && evPost.title === 'Lake Cleanup')
await rahul.from('events').update({ title: 'Lake Cleanup Drive' }).eq('id', ev.id)
const { data: evPost2 } = await anon.from('posts').select('title').eq('event_id', ev.id).single()
check('event edit syncs feed post', evPost2.title === 'Lake Cleanup Drive')
check('user cannot create fake event post', !!(await rahul.from('posts').insert({ author_id: R, post_type: 'event', content: 'x' })).error)

check('priya joins event', !(await priya.from('event_participants').insert({ event_id: ev.id, user_id: P })).error)
check('priya cannot join as rahul', !!(await priya.from('event_participants').insert({ event_id: ev.id, user_id: R })).error)
check('priya likes post', !(await priya.from('post_likes').insert({ post_id: evPost.id, user_id: P })).error)
check('priya comments', !(await priya.from('comments').insert({ post_id: evPost.id, author_id: P, content: 'Count me in' })).error)

const { data: pp } = await priya.from('posts').insert({ author_id: P, post_type: 'update', content: 'hello' }).select().single()
const { data: u1 } = await rahul.from('posts').update({ content: 'hacked' }).eq('id', pp.id).select()
check('rahul cannot edit priya post', u1.length === 0)
const { data: d1 } = await rahul.from('posts').delete().eq('id', pp.id).select()
check('rahul cannot delete priya post', d1.length === 0)
check('priya cannot mark own post removed', !!(await priya.from('posts').update({ status: 'removed' }).eq('id', pp.id)).error)
check('rahul cannot make himself admin', !!(await rahul.from('profiles').update({ role: 'admin' }).eq('id', R)).error)
const { data: s1 } = await rahul.from('profiles').update({ is_suspended: true }).eq('id', P).select()
check('rahul cannot suspend priya', s1.length === 0)

check('rahul reports priya post', !(await rahul.from('user_reports').insert({ reporter_id: R, post_id: pp.id, reported_user_id: P, reason: 'Spam' })).error)
const { data: prep } = await priya.from('user_reports').select('*')
check('priya cannot see report about her', prep.length === 0)
const { data: adrep } = await admin.from('user_reports').select('*')
check('admin sees reports', adrep.length === 1)

check('admin removes priya post', !(await admin.from('posts').update({ status: 'removed' }).eq('id', pp.id)).error)
const { data: gone } = await anon.from('posts').select('id').eq('id', pp.id)
check('removed post hidden from public', gone.length === 0)
check('admin suspends priya', !(await admin.from('profiles').update({ is_suspended: true }).eq('id', P)).error)
check('suspended priya cannot post', !!(await priya.from('posts').insert({ author_id: P, content: 'x' })).error)
check('suspended priya cannot comment', !!(await priya.from('comments').insert({ post_id: evPost.id, author_id: P, content: 'x' })).error)
check('suspended priya cannot unsuspend herself', !!(await priya.from('profiles').update({ is_suspended: false }).eq('id', P)).error)
check('admin reinstates priya', !(await admin.from('profiles').update({ is_suspended: false }).eq('id', P)).error)

const { data: poll } = await anon.from('polls').select('id').single()
check('priya votes', !(await priya.from('poll_votes').insert({ poll_id: poll.id, user_id: P, option_index: 1 })).error)
check('priya cannot vote twice', !!(await priya.from('poll_votes').insert({ poll_id: poll.id, user_id: P, option_index: 0 })).error)
check('invalid option rejected', !!(await rahul.from('poll_votes').insert({ poll_id: poll.id, user_id: R, option_index: 9 })).error)

const { data: don } = await anon.from('food_donations').select('id').single()
check('donor cannot claim own', !!(await rahul.rpc('claim_food_donation', { donation_id: don.id })).error)
check('priya claims donation', !(await priya.rpc('claim_food_donation', { donation_id: don.id })).error)
check('second claim fails', !!(await admin.rpc('claim_food_donation', { donation_id: don.id })).error)

const blob = new Blob(['img'], { type: 'image/png' })
check('upload into own folder', !(await rahul.storage.from('media').upload(`${R}/t.png`, blob)).error)
check('upload into other folder blocked', !!(await rahul.storage.from('media').upload(`${P}/t.png`, blob)).error)

check('host deletes event', !(await rahul.from('events').delete().eq('id', ev.id)).error)
const { data: gone2 } = await anon.from('posts').select('id').eq('event_id', ev.id)
check('event post removed with event', gone2.length === 0)
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
