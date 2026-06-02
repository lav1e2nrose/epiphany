import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// 说明：Framer Motion 的 AnimatePresence(mode="wait") 在 React 19 StrictMode 的
// 开发期双调用下会出现 onExitComplete 丢失、过渡卡死（页面切换后内容不再挂载）的问题。
// 这会导致登录→工作台、以及切换到视频联动等页面时整页冻结。移除 StrictMode 包裹即可
// 恢复稳定的页面过渡；StrictMode 在生产构建本就为 no-op，不影响线上行为。
createRoot(document.getElementById('root')!).render(<App />)
