import { useMemo } from 'react'
import type { VideoClipMeta } from '../../types/clinical'

interface Props {
  clips: VideoClipMeta[]
  selectedClipId: string | null
  onSelect: (clipId: string) => void
}

export function VideoEEGSyncView({ clips, selectedClipId, onSelect }: Props): JSX.Element {
  const selected = useMemo(() => clips.find((clip) => clip.id === selectedClipId) ?? clips[0] ?? null, [clips, selectedClipId])

  return (
    <div className="grid h-full grid-cols-[1fr_260px] gap-3">
      <section className="rounded-md border border-border-default bg-bg-2 p-3">
        <div className="mb-2 text-sm font-semibold">视频联动预览</div>
        <div className="flex h-[260px] items-center justify-center rounded border border-border-subtle bg-bg-3 text-text-secondary">
          {selected ? `▶ ${new Date(selected.startAt).toLocaleString('zh-CN')} · ${selected.durationSec}s` : '暂无可用片段'}
        </div>
        <div className="mt-2 rounded border border-border-subtle bg-bg-3/60 px-2 py-1 text-xs text-text-secondary">同步 EEG 缩略波形（演示）：|||| ||| |||||| ||</div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-3">
        <div className="text-sm font-semibold">最近 7 天片段</div>
        <div className="mt-2 space-y-2 text-xs">
          {clips.map((clip) => (
            <button key={clip.id} className={`w-full rounded border px-2 py-1 text-left ${selected?.id === clip.id ? 'border-accent bg-accent/10' : 'border-border-default'}`} onClick={() => onSelect(clip.id)}>
              {clip.thumbnail} {new Date(clip.startAt).toLocaleString('zh-CN')} · {clip.durationSec}s
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
