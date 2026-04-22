import { useAppStore } from '../store'

export function MockModeBanner(): JSX.Element | null {
  const mode = useAppStore((state) => state.settings.dataSourceMode)
  if (mode !== 'mock') return null

  return (
    <div className="bg-warn/20 px-4 py-1 text-center text-xs text-warn">
      ⚠ 演示模式 · 当前显示模拟数据，非真实设备信号
    </div>
  )
}
