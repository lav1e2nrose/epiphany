import { useAppStore } from '../../store'
import { WaveformChart } from '../../components/charts/WaveformChart'

export function WaveformReview(): JSX.Element {
  const frameBuffer = useAppStore((state) => state.frameBuffer)

  return (
    <div className="grid h-full grid-rows-[96px_1fr] gap-3">
      <section className="rounded-md border border-border-default bg-bg-2 p-3">
        <div className="text-sm">[← 前一天] [2026-04-22 ▼] [→ 后一天]</div>
        <div className="mt-2 h-10 rounded border border-border-subtle bg-bg-3" />
      </section>
      <section className="grid min-h-0 grid-cols-[1fr_240px] gap-3">
        <div className="space-y-3 overflow-auto">
          <WaveformChart title="EEG 回溯" unit="μV" frames={frameBuffer} selector={(f) => f.eeg[0] ?? 0} color="#39D0D8" />
          <WaveformChart title="NIRS 回溯" unit="%" frames={frameBuffer} selector={(f) => f.nirs.spo2} color="#A371F7" />
          <WaveformChart title="EMG 回溯" unit="μV" frames={frameBuffer} selector={(f) => f.emg[0] ?? 0} color="#F0883E" />
        </div>
        <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm text-text-secondary">
          <div>特征参数</div>
          <div className="mt-3 space-y-2">
            <div>delta/theta/alpha/beta/gamma</div>
            <div>NIRS 变化率</div>
            <div>EMG RMS</div>
            <div>算法置信度历史曲线</div>
          </div>
        </aside>
      </section>
    </div>
  )
}
