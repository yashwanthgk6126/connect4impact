export default function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  if (url) return <img src={url} alt={name ?? ''} className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}
