import { useEffect, useState } from 'react'

export default function ImagePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="max-h-64 w-full rounded-lg object-cover" />
          <button type="button" className="btn-secondary absolute right-2 top-2" onClick={() => onChange(null)}>Remove</button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-brand-500">
          Click to upload a photograph (max 5 MB)
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  )
}
