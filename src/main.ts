import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant, { showToast } from 'vant'
import 'vant/lib/index.css'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import App from './App.vue'
import router from './router'
import { useRecordsStore } from './stores/records'
import { onReminderTap, scheduleReminderWindow } from './utils/reminder'
import './style.css'

document.documentElement.dataset.motion = 'fancy'
document.documentElement.dataset.theme = 'paper'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')

/**
 * Android 返回键：默认会直接结束 Activity（退回桌面）。
 * 这里按「关弹层 → 回首页 → 再按一次才退出」处理，避免误退出与白屏。
 */
let lastBackAt = 0

async function handleHardwareBack(): Promise<void> {
  // 1. 有确认弹窗：先点「取消」
  const dialogCancel = document.querySelector('.van-dialog__cancel') as HTMLElement | null
  if (dialogCancel) {
    dialogCancel.click()
    return
  }

  // 2. 有底部弹层：点遮罩关闭（Vant 默认 close-on-click-overlay）
  const overlay = document.querySelector('.van-overlay') as HTMLElement | null
  if (overlay) {
    overlay.click()
    return
  }

  // 3. 不在首页：回首页
  if (router.currentRoute.value.path !== '/') {
    lastBackAt = 0
    await router.replace('/')
    return
  }

  // 4. 在首页：两秒内再按一次才退出
  const now = Date.now()
  if (now - lastBackAt < 2000) {
    lastBackAt = 0
    await NativeApp.minimizeApp()
    return
  }

  lastBackAt = now
  showToast('再按一次返回，退出到桌面')
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

  // 每晚 21:00 提醒记账：滚动排 7 天，今天已记则跳过今晚
  const store = useRecordsStore()
  window.setTimeout(() => {
    void scheduleReminderWindow(store.getTodaySummary().count > 0)
  }, 1200)

  // 点通知直接进记账页
  onReminderTap(() => {
    void router.isReady().then(() => router.replace('/record'))
  })
}
