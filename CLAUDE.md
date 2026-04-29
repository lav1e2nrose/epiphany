# 灵犀妙探 · 开发指南

医疗级癫痫全周期监测与管理平台（PC 桌面应用）。面向医院和家庭，视觉与代码质量对标 $100,000 级别医疗 SaaS 产品。

---

## 一、项目定位

- **应用名称**：灵犀妙探（Lingxi Miaodao）
- **形态**：Electron PC 桌面应用，frameless window，自定义标题栏
- **用户群**：患者 / 监护人 / 医生，三端独立门户（portal），同一应用内切换
- **核心功能**：实时多模态脑电信号监测（EEG + NIRS + EMG）、癫痫发作预测、报警推送、历史回溯、医生报告生成
- **演示模式**：Mock 数据源开箱即用，无需任何硬件即可完整演示

---

## 二、技术栈（不可妥协）

| 层次 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron 28+ | frameless window，自定义标题栏 |
| 前端框架 | React 18 + TypeScript | 严格模式，**零 `any`，零 `@ts-ignore`** |
| 构建工具 | Vite 5 | |
| 样式方案 | Tailwind CSS + CSS Variables + CSS Modules | 三层结合，无第三方 UI 库 |
| 动画 | Framer Motion | 页面切换、状态变化、弹窗 |
| 图表（底层） | D3.js | 热力图、实时波形（Canvas 渲染） |
| 图表（统计） | Recharts | 服药依从性、功率谱等统计图 |
| 状态管理 | Zustand | 全局状态 + 数据流 |
| 串口/BLE | Electron IPC → serialport / noble | 仅接口，不强制运行 |
| 本地持久化 | electron-store | 事件日志、用户配置 |
| 图标 | Lucide React | 全局唯一图标库 |

**禁止引入**：MUI、Ant Design、Chakra UI、shadcn/ui、任何第三方组件库。UI 全部用 Tailwind + CSS 从零实现。

---

## 三、设计系统

### 3.1 CSS Variables（全局，`src/index.css` 注入）

```css
:root {
  /* 背景层级 */
  --bg-0: #080C10;       /* 窗口背景，最底层 */
  --bg-1: #0D1117;       /* 主内容区 */
  --bg-2: #161B22;       /* 卡片/面板 */
  --bg-3: #1C2128;       /* 输入框/次级面板 */

  /* 边框 */
  --border-subtle: #21262D;
  --border-default: #30363D;
  --border-emphasis: #484F58;

  /* 文字 */
  --text-primary:   #E6EDF3;
  --text-secondary: #8B949E;
  --text-muted:     #484F58;

  /* 状态色 */
  --safe:           #2EA043;
  --safe-glow:      rgba(46, 160, 67, 0.4);
  --warn:           #D29922;
  --warn-glow:      rgba(210, 153, 34, 0.4);
  --danger:         #F85149;
  --danger-glow:    rgba(248, 81, 73, 0.4);
  --recovery:       #388BFD;
  --recovery-glow:  rgba(56, 139, 253, 0.4);

  /* 信号线色 */
  --eeg-color:  #39D0D8;   /* EEG · 青色 */
  --nirs-color: #A371F7;   /* NIRS · 紫色 */
  --emg-color:  #F0883E;   /* EMG · 橙色 */

  /* 品牌色 */
  --accent:     #0A84FF;
  --accent-dim: rgba(10, 132, 255, 0.15);

  /* 热力图色阶（亚临床 · 绿系） */
  --heat-0: #161B22;  --heat-1: #0E4429;
  --heat-2: #006D32;  --heat-3: #26A641;  --heat-4: #39D353;

  /* 热力图色阶（发作 · 红系） */
  --heat-s1: #3D1A1A;  --heat-s2: #7A2020;
  --heat-s3: #C0392B;  --heat-s4: #F85149;
}
```

### 3.2 字体系统

```css
--font-display: 'Syne', sans-serif;        /* 科技感标题 */
--font-body:    'DM Sans', sans-serif;     /* 医疗正文 */
--font-mono:    'JetBrains Mono', monospace; /* 数值/时间戳/参数 */
```

所有数字数据（风险分数、时间戳、μV 值、Hz 值）**必须**使用 `--font-mono`。

### 3.3 通用组件规范

| 属性 | 规范 |
|------|------|
| `border-radius` | 统一 6px；弹窗 10px；圆形按钮 50% |
| `box-shadow`（卡片）| `0 1px 3px rgba(0,0,0,0.4)` |
| 交互过渡 | `transition: all 150ms ease`（所有可交互元素） |
| 按钮按下反馈 | `transform: scale(0.96)` |
| 卡片悬停 | `border-color` → `--border-emphasis`，200ms |

---

## 四、数据架构

### 4.1 核心类型（`src/types/signal.ts`）

```typescript
export interface SignalFrame {
  timestamp: number        // Unix ms，硬件时间戳
  eeg: number[]           // 8通道 μV
  nirs: { hbo: number; hbr: number; spo2: number }
  emg: number[]           // 2通道 μV
  imu?: { ax: number; ay: number; az: number }
  batteryLevel: number    // 0-100
}

export interface ProcessedFrame extends SignalFrame {
  riskScore: number       // 0-100
  riskState: RiskState
  artifacts: ArtifactType[]
  features: SeizureFeatures
}

export type RiskState = 'safe' | 'warning' | 'seizure' | 'recovery' | 'emergency'
export type ArtifactType = 'chewing' | 'movement' | 'electrode_pop' | 'power_line'

export interface SeizureFeatures {
  spikeCount: number
  bandpower: { delta: number; theta: number; alpha: number; beta: number; gamma: number }
  nirsDropRate: number
  emgBurst: boolean
  preIctalConfidence: number  // 0-1
}
```

### 4.2 数据源接口（策略模式，`src/data/IDataSource.ts`）

```typescript
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'mock'

export interface IDataSource {
  readonly name: string
  readonly status: ConnectionStatus
  connect(config?: Record<string, unknown>): Promise<void>
  disconnect(): Promise<void>
  onFrame(callback: (frame: SignalFrame) => void): () => void
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void
  onError(callback: (error: Error) => void): () => void
}
```

### 4.3 四种数据源实现

| 适配器 | 文件 | 状态说明 |
|--------|------|----------|
| `MockAdapter` | `src/data/adapters/MockAdapter.ts` | **默认模式**，模拟完整发作周期：正常→预警→发作→恢复，60-120s 随机触发 |
| `WebSocketAdapter` | `src/data/adapters/WebSocketAdapter.ts` | 连接 `ws://[host]:[port]/stream`，心跳检测+指数退避重连 |
| `SerialAdapter` | `src/data/adapters/SerialAdapter.ts` | 通过 Electron IPC 调用 serialport，支持自定义帧解析器 |
| `BLEAdapter` | `src/data/adapters/BLEAdapter.ts` | 通过 Electron IPC 调用 noble，扫描→连接→订阅特征值 |

### 4.4 信号处理管道（`src/data/SignalProcessor.ts`）

- `bandpassFilter(signal, lowHz, highHz, sampleRate)` — Butterworth 4阶 IIR，EEG 默认 0.5-70Hz
- `notchFilter(signal, freqHz, sampleRate)` — 50Hz 或 60Hz 工频陷波
- `detectArtifacts(frame)` — 运动/电极脱落/工频干扰检测
- `extractFeatures(window)` — 滑动窗口 5s，步长 0.5s，提取 SeizureFeatures
- `computeRiskScore(features, history)` — 加权融合多模态特征，输出 0-100

**复杂算法逻辑（滤波、特征提取）必须添加注释说明**，这是 prompt 的硬性要求。

### 4.5 Zustand 全局 Store（`src/store/index.ts`）

关键字段：
- `frameBuffer: ProcessedFrame[]` — 环形缓冲，保留最近 30s（7680帧@256Hz）
- `latestFrame: ProcessedFrame | null`
- `riskState: RiskState` / `riskScore: number`
- `events: SeizureEvent[]` — 持久化到 electron-store
- `currentPortal: 'patient' | 'guardian' | 'doctor'`
- `alerts: Alert[]` — 报警队列，`pushAlert` / `dismissAlert`
- `patients: Patient[]` — 医生端患者列表
- `settings: AppSettings`

---

## 五、应用结构

### 5.1 全局布局树

```
App
├── LoginScreen（未登录时全屏）
└── AppShell（登录后）
    ├── TitleBar（40px，frameless，-webkit-app-region: drag）
    │   ├── Logo + "灵犀妙探"
    │   ├── PortalSwitcher（三 pill 标签 + Framer Motion layoutId 滑块）
    │   ├── LiveIndicator（● LIVE 脉冲灯：绿色=正常/灰色=断连/红色快闪=异常）
    │   ├── ConnectionBadge（状态 + 电量）
    │   └── WindowControls（最小化/最大化/关闭，no-drag 区域）
    ├── Sidebar（200px，可折叠至 64px，激活项左侧蓝色竖条）
    └── ContentArea（AnimatePresence 包裹，方向感知页面切换动画）
```

### 5.2 三端门户导航

**患者端（patient）**：实时动态 / 生活日志 / 健康课堂

**监护人端（guardian）**：远程监控 / 报警设置 / 历史轨迹

**医生端（doctor）**：患者管理 / 病情热力图 / 波形回溯 / 报告生成

Settings 页面所有端口均可进入。

### 5.3 完整文件结构

```
src/
├── types/
│   ├── signal.ts          # SignalFrame, ProcessedFrame, RiskState 等
│   ├── events.ts          # SeizureEvent, HeatEvent
│   ├── user.ts            # User, Patient, Portal
│   ├── electron.d.ts      # window.electronAPI 类型声明
│   └── jsx.d.ts
├── data/
│   ├── IDataSource.ts
│   ├── SignalProcessor.ts
│   └── adapters/
│       ├── MockAdapter.ts
│       ├── WebSocketAdapter.ts
│       ├── SerialAdapter.ts
│       └── BLEAdapter.ts
├── store/
│   └── index.ts
├── constants/
│   └── motion.ts          # Framer Motion 统一动效配置
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── TitleBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── PortalSwitcher.tsx
│   ├── charts/
│   │   ├── WaveformChart.tsx     # D3 实时波形，requestAnimationFrame 差量渲染
│   │   ├── SeizureHeatmap.tsx    # D3 热力图，28天×24小时
│   │   └── StatsCharts.tsx       # Recharts 统计图
│   ├── StatusOrb.tsx             # 纯 CSS 动画球体（safe/warning/seizure/recovery）
│   ├── SOSButton.tsx             # 长按 3s 触发，SVG 环形进度条
│   ├── EmergencyOverlay.tsx      # z-index:9999 全屏紧急覆盖，不可绕过
│   ├── AlertToast.tsx            # 右上角 Toast 队列，最多3条
│   ├── ArtifactBanner.tsx        # 运动干扰黄色横幅，顶部滑入
│   └── MockModeBanner.tsx        # 演示模式橙色细条（常驻）
├── portals/
│   ├── patient/
│   │   ├── LiveDashboard.tsx     # 三栏：状态球+SOS / 三路波形 / 今日摘要
│   │   ├── LifeLog.tsx           # 时间轴 + 快速记录表单
│   │   └── HealthClass.tsx       # 3列卡片网格 + 右侧抽屉阅读
│   ├── guardian/
│   │   ├── RemoteMonitor.tsx     # 患者状态大卡 + 地图占位 + 报警列表
│   │   ├── AlertSystem.tsx       # 低级Toast + 高级全屏不可绕过报警
│   │   └── HistoryTrack.tsx      # 可排序表格 + 行展开波形缩略
│   └── doctor/
│       ├── PatientManagement.tsx # 搜索/筛选/排序/风险徽章/依从性条
│       ├── SeizureHeatmapPage.tsx # D3 热力图核心页
│       ├── WaveformReview.tsx    # 多级缩放+三图联动+注解+右键菜单
│       └── ReportGenerator.tsx  # 配置区+实时预览+导出PDF
├── pages/
│   ├── LoginScreen.tsx           # 三身份选择 + 凭证输入 + 登录动画
│   └── SettingsPage.tsx          # 数据源配置+信号参数+通知+系统信息
├── App.tsx
├── main.tsx
└── index.css                     # CSS Variables + 字体 + 全局样式

electron/
├── main.ts    # frameless 窗口 + IPC（窗口控制/串口/BLE/文件导出）
└── preload.ts # contextBridge，contextIsolation: true
```

---

## 六、关键页面实现规范

### 6.1 登录页（LoginScreen）

三步流程：
1. 身份选择卡片（患者/监护人/医生），点击高亮（accent 边框 + 内发光），其余淡出
2. 卡片下方展开凭证输入（Framer Motion 弹簧动画）
3. 成功→卡片上飞 + 主界面从下滑入；失败→输入框水平 shake + 错误提示

演示账号：`demo / demo123`（每张卡片下灰色小字说明）

### 6.2 患者端·实时动态页（LiveDashboard）

三栏布局：`grid-template-columns: 300px 1fr 260px`，gap 16px

**左栏**：
- 状态球（180×180px，纯 CSS radial-gradient + keyframes）
  - safe：3s 脉冲，warn：1.5s，seizure：0.5s 快闪
  - 球内：风险分数（monospace 大字）+ 状态文字
- 球下：状态描述 / 监测时长计时器 / Pre-ictal 置信度条
- SOS 按钮：长按 3s，SVG 环形进度条，松手归零，触发 EmergencyOverlay

**中栏**：三路实时波形（D3 Canvas，requestAnimationFrame 差量渲染）
- EEG（青色）/ NIRS（紫色）/ EMG（橙色），各 130px 高
- 棘波区：半透明红色矩形覆盖；伪迹区：黄色虚线矩形+标签
- 滚动速度切换：25mm/s / 50mm/s
- 运动干扰时显示 ArtifactBanner（黄色，顶部滑入，伪迹消除后 3s 自动隐藏）

**右栏**：今日摘要（发作次数 / 上次事件 / 服药依从性环形图 / 下次服药倒计时）

**预警弹窗**：riskState→warning/seizure 时自动触发，AnimatePresence + backdrop-blur，两按钮（确实发作/误报）写入事件日志。

### 6.3 医生端·热力图（SeizureHeatmapPage）

D3.js 完整实现，**不可用静态图片替代**：
- 28天×24小时格子，行高 28px，列宽自适应
- 颜色：无事件→`--heat-0`；亚临床→`--heat-1~4`；发作→`--heat-s1~s4`；发作优先
- 覆盖图标：漏服药💊（右上角）/ 睡眠不足😴（左上角）
- Hover：Framer Motion 自定义 tooltip（时间段/类型/持续时长/峰值强度/关联因素）
- Click：打开右侧抽屉，跳转波形回溯页至对应时刻
- 底部模式分析条（算法输出的睡眠型倾向、服药相关性等文字分析）

### 6.4 医生端·波形回溯（WaveformReview）

- 顶部时间轴导航（SVG，高亮有事件的时段，可拖拽手柄）
- 三图共享 `timeWindow: { start, end }` 状态，任意图操作→三图同步
- 4级缩放：6h / 30min / 5min / 30s；鼠标滚轮以光标为中心缩放；拖拽平移
- SVG 注解层（绝对定位覆盖 canvas）：红色半透明矩形（发作）+ 黄色虚线（伪迹）
- 右键菜单（注解区域）：标记伪迹 / 确认发作 / 修改置信度 / 添加备注 / 导出此段
- 左侧通道选择器（EEG 多选 checkbox）；右侧可折叠面板（频段功率条形图 + 算法置信度曲线）

### 6.5 报警系统

**低级（Warning）**：Toast 从右上角滑入，amber 主题，4s 自动消失，最多同时 3 条，超出入队列

**高级（Seizure）**：强制全屏覆盖，`z-index: 9999`，背景 `#0D0000`，vignette-pulse 边缘动画，**不可被任何操作绕过**，唯一关闭方式是点击"已确认处理"

---

## 七、动画规范（全部必须实现）

| 场景 | 规范 |
|------|------|
| 页面切换 | slide + fade，方向感知（前进左移，后退右移） |
| 状态球颜色变化 | CSS transition 800ms ease |
| 状态球脉冲 | CSS @keyframes：safe=3s / warning=1.5s / seizure=0.5s |
| 风险分数变化 | Framer Motion animate number，弹簧物理 |
| 报警弹窗出现 | scale(0.8)+opacity(0) → scale(1)+opacity(1)，spring |
| 全屏紧急覆盖 | opacity(0) → opacity(1)，200ms 全屏铺开 |
| Toast 出现 | translateX(100%) → translateX(0)，spring |
| Toast 消失 | translateX(0) → translateX(120%)，200ms ease-in |
| 侧边栏折叠 | width 200px ↔ 64px，200ms ease |
| PortalSwitcher | layoutId 动画跟随底部滑块 |
| 数值刷新 | opacity 0.6 → 1，100ms flash |
| 连接成功 | LiveIndicator 灰色 flash → 绿色 pulse |

`src/constants/motion.ts` 统一维护所有 Framer Motion variant 和 transition 配置，页面/组件从此处导入，不得各自硬编码。

---

## 八、Electron 主进程要求

```typescript
// electron/main.ts 关键配置
new BrowserWindow({
  width: 1440, height: 900,
  minWidth: 1280, minHeight: 800,
  frame: false, titleBarStyle: 'hidden',
  backgroundColor: '#080C10',
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  }
})
```

IPC 处理器（`ipcMain.handle`）：
- 窗口控制：`window:minimize` / `window:maximize` / `window:close`
- 串口：`serial:list` / `serial:connect` / `serial:disconnect` / `serial:data`
- BLE：`ble:scan` / `ble:connect` / `ble:subscribe`
- 文件：`file:export-pdf` / `file:show-in-explorer`

preload.ts 通过 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露给渲染进程，`src/types/electron.d.ts` 声明 `window.electronAPI` 类型。

---

## 九、TypeScript 规范

- `tsconfig.json` 启用 `strict: true`，**全项目零 `any`，零 `@ts-ignore`**
- 所有外部数据入口（IPC 回调、WebSocket 消息、串口二进制解析）必须显式类型断言或 zod 验证
- `SeizureFeatures`、`ProcessedFrame`、`HeatmapCell` 等核心类型不得弱化
- 组件 Props 必须有明确的 interface 定义

---

## 十、代码注释规范

**默认不写注释**。仅在以下情况添加：
- 信号处理算法（带通滤波 IIR 系数、陷波、特征提取）——必须注释说明数学原理
- 非显而易见的业务规则（如"发作色优先于亚临床色"的热力图逻辑）
- Electron IPC 特殊绑定方式

不写：组件结构注释、TODO 注释、"这个函数做了X"类注释。

---

## 十一、24 轮执行计划

每轮对应一次对话迭代，按序推进：

| 轮次 | 目标 |
|------|------|
| Round 1 | 基线盘点与验收清单冻结（对齐 prompt 全量条目，建立已完成/缺失矩阵） |
| Round 2 | 运行基线与问题清单（跑通 dev/build/lint，记录错误、警告、性能瓶颈） |
| Round 3 | 技术栈纠偏（React/Electron/TS 配置与 prompt 对齐） |
| Round 4 | Electron 主进程重构（frameless 窗口、标题栏行为、IPC 骨架） |
| Round 5 | Preload 与类型桥接完善（contextBridge API 收敛、前后端类型契约） |
| Round 6 | 全局设计系统补齐（CSS Variables、字体、动效基线、交互态规范） |
| Round 7 | Zustand Store 深化（数据源、缓冲区、风险状态、告警队列、持久化） |
| Round 8 | 数据源切换总线实现（Mock/WS/Serial/BLE 生命周期管理与状态机） |
| Round 9 | MockAdapter 医疗场景强化（完整发作周期、可配置触发节奏） |
| Round 10 | SignalProcessor 第一版达标（带通/陷波/伪迹/特征提取/风险评分） |
| Round 11 | 实时数据管道联调（帧流→处理→缓冲→UI 同步，解决卡顿/丢帧） |
| Round 12 | 患者端实时动态页深度完善（状态球、SOS、预警弹窗、伪迹横幅） |
| Round 13 | WaveformChart 升级（rAF 差量渲染、滚动速度、标注层） |
| Round 14 | 患者端 LifeLog/HealthClass 完整化（时间轴、表单、抽屉阅读） |
| Round 15 | 监护人端 RemoteMonitor 完整化（状态大卡、地图、历史报警） |
| Round 16 | 监护人报警系统升级（Toast 队列 + 全屏不可绕过报警） |
| Round 17 | 监护人历史轨迹页增强（可排序、行展开、事件关联、波形缩略） |
| Round 18 | 医生端患者管理页达标（搜索/筛选/排序/跳转上下文联动） |
| Round 19 | 医生端热力图核心页实现（D3 完整渲染、tooltip、覆盖图标、模式分析） |
| Round 20 | 医生端波形回溯核心联动（多级缩放、平移、三图同步、注解、右键菜单） |
| Round 21 | 医生端报告生成器闭环（配置-预览联动、进度动画、IPC 导出） |
| Round 22 | Settings 页与连接测试完善（数据源配置、参数校验、系统信息） |
| Round 23 | 全局组件与微交互验收（Toast/Emergency/MockBanner/动效规范对齐） |
| Round 24 | 最终回归与发布验收（三端全流程回归、类型清零、交付要求逐条打勾） |

**每轮开始时**：先确认上一轮遗留问题，再推进当前轮目标。**每轮结束时**：运行 `npm run lint` 和 `npm run build`，确保零错误零警告后再结束。

---

## 十二、运行与开发

```bash
npm install
npm run dev          # Vite + Electron 并发启动
npm run dev:web      # 仅 Vite（无 Electron，用于快速 UI 调试）
npm run build        # TypeScript 编译 + Vite 构建
npm run lint         # ESLint 检查
```

Mock 模式开箱即用，默认启动即可演示全部功能，无需任何硬件。

---

## 十三、交付验收标准（最终 Round 24 检查点）

1. `npm install && npm run dev` 直接启动 Electron 窗口，无报错
2. Mock 模式下三端所有页面均可正常导航
3. D3 波形图和热力图真正实时渲染，波形可见滚动
4. TypeScript 编译零错误，ESLint 零警告
5. 三端切换（患者/监护人/医生）流畅，门户间状态正确隔离
6. WebSocket / Serial / BLE adapter 骨架完整，无硬件也能展示接入点
7. 报警系统：低级 Toast 队列逻辑正确；高级全屏覆盖不可绕过
8. 全屏紧急覆盖（EmergencyOverlay）可由 SOS 长按触发
9. 登录演示账号 `demo / demo123` 三身份均可进入
10. 不使用任何第三方 UI 组件库
