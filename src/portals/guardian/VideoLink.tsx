import { useState } from 'react'
import { VideoEEGSyncView } from '../../components/video/VideoEEGSyncView'
import { useAppStore } from '../../store'

export function VideoLink(): JSX.Element {
  const clips = useAppStore((state) => state.videoClips)
  const monitoringMode = useAppStore((state) => state.monitoringMode)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(clips[0]?.id ?? null)

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3 overflow-auto">
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">视频联动 · 卧室摄像头</div>
            <div className="text-xs text-text-secondary">状态：● 已连接 · 联动模式：异常事件自动录制</div>
          </div>
          <div className="text-xs text-text-secondary">当前监测模式：{monitoringMode}</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <input type="checkbox" checked={settings.autoVideoLink} onChange={(event) => updateSettings({ autoVideoLink: event.target.checked })} />
            自动联动
          </label>
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <input type="checkbox" checked={settings.faceBlurEnabled} onChange={(event) => updateSettings({ faceBlurEnabled: event.target.checked })} />
            人脸打码
          </label>
        </div>
      </section>
      <VideoEEGSyncView clips={clips} selectedClipId={selectedClipId} onSelect={setSelectedClipId} />
    </div>
  )
}
