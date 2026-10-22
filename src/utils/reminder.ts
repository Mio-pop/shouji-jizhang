import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { LocalNotificationSchema } from '@capacitor/local-notifications'

/** 每晚 21:00 提醒记账，用非精确闹钟，不需要 SCHEDULE_EXACT_ALARM */
const HOUR = 21
const MINUTE = 0
const BASE_ID = 2100
const WINDOW_DAYS = 7

function idFor(date: Date): number {
  // 月日组合成唯一 id：2100 + MMDD
  return BASE_ID + (date.getMonth() + 1) * 100 + date.getDate()
}

function atNine(date: Date): Date {
  const next = new Date(date)
  next.setHours(HOUR, MINUTE, 0, 0)
  return next
}

async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const asked = await LocalNotifications.requestPermissions()
  return asked.display === 'granted'
}

/**
 * 滚动排未来 7 天的提醒。
 * @param hasRecordToday 今天已有记录时，跳过今天的提醒
 */
export async function scheduleReminderWindow(hasRecordToday: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!(await ensurePermission())) return

  const pending = await LocalNotifications.getPending()
  const stale = pending.notifications.filter(
    (item) => item.id >= BASE_ID && item.id < BASE_ID + 1300,
  )
  if (stale.length > 0) {
    await LocalNotifications.cancel({
      notifications: stale.map((item) => ({ id: item.id })),
    })
  }

  const now = new Date()
  const notifications: LocalNotificationSchema[] = []

  for (let index = 0; index < WINDOW_DAYS; index += 1) {
    const day = new Date(now)
    day.setDate(day.getDate() + index)
    const when = atNine(day)
    if (when.getTime() <= now.getTime()) continue
    if (index === 0 && hasRecordToday) continue

    notifications.push({
      id: idFor(day),
      title: '今天的账本还是白的',
      body: '记一笔吧，我保证不评价你花了多少。',
      // 非精确闹钟：不申请精确闹钟权限，允许系统在低电耗模式下延后
      isExactNotification: false,
      schedule: {
        at: when,
        allowWhileIdle: true,
      },
    })
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
}

/** 今天已经记过账，取消今晚这条提醒 */
export async function cancelTodayReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: idFor(new Date()) }] })
  } catch {
    // 用户拒绝通知权限时忽略
  }
}

/** 点击通知后回到记账页，直接开始录入 */
export function onReminderTap(handler: () => void): void {
  if (!Capacitor.isNativePlatform()) return
  void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    if (Number(event.notification.id) >= BASE_ID) handler()
  })
}
