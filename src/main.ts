import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import App from './App.vue'
import router from './router'
import { isFancy } from './motion'
import './style.css'

document.documentElement.dataset.motion = isFancy ? 'fancy' : 'simple'
// 纸账本皮肤只在华丽构建里启用，简约版保持原有浅色界面
if (isFancy) document.documentElement.dataset.theme = 'paper'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')

/**
 * Android 返回键：默认会直接结束 Activity（退回桌面）。
 * 这里按「关弹层 → 回首页 → 最小化」三级处理，避免误退出与白屏。
 */
async function handleHardwareBack(): Promise<void> {
  const popup = document.querySelector('.van-popup--active')
  if (popup) {
    const overlay = document.querySelector('.van-overlay') as HTMLElement | null
    if (overlay) {
      overlay.click()
      return
    }
    await NativeApp.minimizeApp()
    return
  }

  if (router.currentRoute.value.path !== '/') {
    await router.replace('/')
    return
  }

  await NativeApp.minimizeApp()
}

if (Capacitor.isNativePlatform()) {
  void NativeApp.addListener('backButton', () => {
    void handleHardwareBack()
  })

  // 部分机型从后台恢复时 WebView 需要一次重绘，否则会短暂白屏
  void NativeApp.addListener('resume', () => {
    const root = document.documentElement
    root.style.opacity = '0.999'
    requestAnimationFrame(() => {
      root.style.opacity = ''
    })
  })
}
