import { useEffect, useState } from 'react'
import { Video } from 'lucide-react'
import { VideoEEGSyncView } from '../../components/video/VideoEEGSyncView'
import { useAppStore } from '../../store'

export function VideoLink(): JSX.Element {
  const clips = useAppStore((state) => state.videoClips)
  const monitoringMode = useAppStore((state) => state.monitoringMode)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const removeVideoClip = useAppStore((state) => state.removeVideoClip)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(clips[0]?.id ?? null)
  const modeLabel = monitoringMode === 'daytime' ? '日间监测' : monitoringMode === 'sleep' ? '睡眠监测' : '院内监测'

  // 当前选中片段被删除后，自动回退到列表首个片段
  useEffect(() => {
    if (selectedClipId && !clips.some((clip) => clip.id === selectedClipId)) {
      setSelectedClipId(clips[0]?.id ?? null)
    }
  }, [clips, selectedClipId])

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3 overflow-hidden">
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-accent" />
            <div>
              <div className="font-semibold">视频联动 · 卧室摄像头</div>
              <div className="text-xs text-text-secondary">
                状态：<span className="text-safe">● 已连接</span> · 来源：{settings.cameraSource === 'ip' ? `IP 摄像头 ${settings.cameraUrl}` : settings.cameraSource === 'usb' ? 'USB 摄像头' : '内置摄像头'} · 联动模式：异常事件自动录制
              </div>
            </div>
          </div>
          <div className="text-xs text-text-secondary">当前监测模式：{modeLabel}</div>
        </div>

        {/* 录制设置：自动联动 / 持续录制 / 事件前预录 / 事件后续录 / 人脸打码 / 本地保留 */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <input type="checkbox" checked={settings.autoVideoLink} onChange={(event) => updateSettings({ autoVideoLink: event.target.checked })} />
            自动联动录制
          </label>
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <span>事件前预录</span>
            <input
              type="number"
              min={0}
              max={120}
              value={settings.videoPreRecordSec}
              onChange={(event) => updateSettings({ videoPreRecordSec: Number(event.target.value) })}
              className="w-14 rounded border border-border-default bg-bg-3 px-1 py-0.5 font-mono"
            />
            <span>秒</span>
          </label>
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <span>事件后续录</span>
            <input
              type="number"
              min={0}
              max={30}
              value={settings.videoPostRecordMin}
              onChange={(event) => updateSettings({ videoPostRecordMin: Number(event.target.value) })}
              className="w-14 rounded border border-border-default bg-bg-3 px-1 py-0.5 font-mono"
            />
            <span>分钟</span>
          </label>
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <input type="checkbox" checked={settings.faceBlurEnabled} onChange={(event) => updateSettings({ faceBlurEnabled: event.target.checked })} />
            人脸打码（隐私保护）
          </label>
          <label className="flex items-center gap-1 rounded border border-border-default px-2 py-1">
            <span>本地保留</span>
            <input
              type="number"
              min={1}
              max={365}
              value={settings.localRetentionDays}
              onChange={(event) => updateSettings({ localRetentionDays: Number(event.target.value) })}
              className="w-14 rounded border border-border-default bg-bg-3 px-1 py-0.5 font-mono"
            />
            <span>天后自动删除</span>
          </label>
        </div>
      </section>

      <VideoEEGSyncView
        clips={clips}
        selectedClipId={selectedClipId}
        onSelect={setSelectedClipId}
        onDelete={removeVideoClip}
        faceBlur={settings.faceBlurEnabled}
      />
    </div>
  )
}
