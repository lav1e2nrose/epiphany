# Epiphany（灵犀妙探）

基于 **React + TypeScript + Vite + Electron** 的癫痫全周期监测演示平台，覆盖患者端、监护人端、医生端三种视角。

## 当前能力

- Electron 无边框窗口 + 标题栏控制（最小化/最大化/关闭）
- preload `contextBridge` IPC 桥接，前后端类型契约统一
- Zustand 全局状态：数据源、实时帧缓存、风险状态、告警、事件、设置
- 持久化闭环：`events/settings` 启动加载 + 运行期写回（electron-store）
- 实时数据管道：Mock/WebSocket/Serial/BLE 适配器 + SignalProcessor 风险评分
- 医生端：
  - 热力图 tooltip、点击联动、模式分析
  - 波形回溯缩放/平移、三图同步窗口、注解层、右键菜单骨架
  - 报告配置与预览联动，导出进度走 IPC 分阶段反馈
- Settings：WebSocket/Serial/BLE 连接测试反馈与失败路径提示

## 开发与构建

```bash
npm ci
npm run dev
```

```bash
npm run lint
npm run build
```

## 技术说明

- TypeScript `strict: true`
- UI 动效统一基于 framer-motion 预设（页面、Toast、弹层、侧栏）
- Mock 数据支持 `normal -> preictal -> seizure -> recovery` 周期演示

## 验收状态（本轮）

- [x] `npm run lint` 通过
- [x] `npm run build` 通过
- [x] 三端主流程可运行（演示数据）
- [x] 关键 IPC 通路可用（窗口控制 / 存储 / 报告导出 / 连接测试）

> 说明：Serial/BLE/WebSocket 当前为演示接入，真实设备协议与后端接口可在现有适配器结构上继续扩展。
