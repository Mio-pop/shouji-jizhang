import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NewRecordInput, RecordItem, Summary } from '../types'
import { cancelTodayReminder } from '../utils/reminder'

const STORAGE_KEY = 'smart-ledger.records'

/** 本地日期格式化为 YYYY-MM-DD（不用 toISOString，避免时区偏移） */
function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function emptySummary(): Summary {
  return { income: 0, expense: 0, balance: 0, count: 0 }
}

function summarize(list: RecordItem[]): Summary {
  return list.reduce<Summary>(
    (acc, item) => {
      if (item.type === 'income') acc.income += item.amount
      else acc.expense += item.amount
      acc.count += 1
      acc.balance = round2(acc.income - acc.expense)
      return acc
    },
    emptySummary(),
  )
}

/** 从 localStorage 读取，数据异常时降级为空数组，避免白屏 */
function loadRecords(): RecordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is RecordItem => {
      if (!item || typeof item !== 'object') return false
      const record = item as Partial<RecordItem>
      return (
        typeof record.id === 'string' &&
        typeof record.amount === 'number' &&
        (record.type === 'income' || record.type === 'expense') &&
        typeof record.category === 'string' &&
        typeof record.date === 'string'
      )
    })
  } catch {
    return []
  }
}

export const useRecordsStore = defineStore('records', () => {
  /** 全部记录（无序，写入顺序为先新后旧） */
  const records = ref<RecordItem[]>(loadRecords())

  /** 刚写入的记录 id，用于列表高亮，1.2s 后自动清除 */
  const highlightIds = ref<string[]>([])
  let highlightTimer: number | undefined

  function highlight(ids: string[]): void {
    highlightIds.value = ids
    window.clearTimeout(highlightTimer)
    highlightTimer = window.setTimeout(() => {
      highlightIds.value = []
    }, 1200)
  }

  /**
   * 按日期倒序排列的副本。
   * 同一天按数组下标升序：数组头部是最新写入的记录，因此同日也是新在前，
   * 不依赖 id 字符串比较，批量新增时顺序稳定。
   */
  const sortedRecords = computed(() =>
    records.value
      .map((item, index) => ({ item, index }))
      .sort((a, b) =>
        a.item.date === b.item.date
          ? a.index - b.index
          : b.item.date.localeCompare(a.item.date),
      )
      .map(({ item }) => item),
  )

  /** 最近 5 条记录：按写入顺序（最新写入在最前），补记过去日期也能立刻看到 */
  const recentRecords = computed(() => records.value.slice(0, 5))

  function persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  /** 批量新增，返回实际写入的记录（含生成的 id） */
  function addRecords(items: NewRecordInput[]): RecordItem[] {
    const created: RecordItem[] = items.map((item) => ({
      ...item,
      id: createId(),
      date: item.date || toDateKey(),
    }))
    records.value = [...created, ...records.value]
    persist()
    highlight(created.map((item) => item.id))
    // 今天已经记过，取消今晚的提醒
    void cancelTodayReminder()
    return created
  }

  /** 删除一条记录，返回是否删除成功 */
  function deleteRecord(id: string): boolean {
    const index = records.value.findIndex((item) => item.id === id)
    if (index === -1) return false
    records.value.splice(index, 1)
    persist()
    return true
  }

  /** 局部更新一条记录，返回更新后的记录 */
  function updateRecord(
    id: string,
    patch: Partial<Omit<RecordItem, 'id'>>,
  ): RecordItem | null {
    const record = records.value.find((item) => item.id === id)
    if (!record) return null
    Object.assign(record, patch)
    persist()
    return record
  }

  /** 今日汇总，默认取今天 */
  function getTodaySummary(date: string = toDateKey()): Summary {
    return summarize(records.value.filter((item) => item.date === date))
  }

  /** 本月汇总，month 格式 YYYY-MM，默认取当月 */
  function getMonthSummary(month: string = toDateKey().slice(0, 7)): Summary {
    return summarize(records.value.filter((item) => item.date.startsWith(month)))
  }

  return {
    records,
    sortedRecords,
    recentRecords,
    highlightIds,
    addRecords,
    deleteRecord,
    updateRecord,
    getTodaySummary,
    getMonthSummary,
  }
})
