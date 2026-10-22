<script setup lang="ts">
import { computed, ref } from 'vue'
import RollNumber from '../components/RollNumber.vue'
import EmptyState from '../components/EmptyState.vue'
import { useRecordsStore } from '../stores/records'
import type { RecordType } from '../types'

const store = useRecordsStore()

const now = new Date()
const month = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`

const summary = computed(() => store.getMonthSummary(month))

const categories = ['全部', '餐饮', '交通', '购物', '居家', '娱乐', '医疗', '工资', '理财', '其他']
const typeOptions: { label: string; value: RecordType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
]

const category = ref('全部')
const type = ref<RecordType | 'all'>('all')
const range = ref<[string, string] | null>(null)

const showCalendar = ref(false)
const minDate = new Date(2000, 0, 1)
const maxDate = new Date()

/** 本地日期格式化为 YYYY-MM-DD，避免 toISOString 的时区偏移 */
function toKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

const todayKey = toKey(now)

const rangeText = computed(() => {
  if (!range.value) return '全部日期'
  const [start, end] = range.value
  return start === end ? start : `${start} 至 ${end}`
})

const isTodayRange = computed(
  () => range.value?.[0] === todayKey && range.value?.[1] === todayKey,
)
const isMonthRange = computed(
  () => range.value?.[0] === `${month}-01` && range.value?.[1] === todayKey,
)

const filtered = computed(() =>
  store.sortedRecords.filter((item) => {
    if (type.value !== 'all' && item.type !== type.value) return false
    if (category.value !== '全部' && item.category !== category.value) return false
    if (range.value) {
      const [start, end] = range.value
      if (item.date < start || item.date > end) return false
    }
    return true
  }),
)

const totals = computed(() =>
  filtered.value.reduce(
    (acc, item) => {
      if (item.type === 'income') acc.income += item.amount
      else acc.expense += item.amount
      return acc
    },
    { income: 0, expense: 0 },
  ),
)

function pickToday(): void {
  range.value = [todayKey, todayKey]
}

function pickMonth(): void {
  range.value = [`${month}-01`, todayKey]
}

function clearRange(): void {
  range.value = null
}

function onCalendarConfirm(dates: Date | Date[]): void {
  const list = (Array.isArray(dates) ? dates : [dates]).map(toKey).sort()
  if (list.length === 0) return
  range.value = [list[0], list[list.length - 1]]
  showCalendar.value = false
}
</script>

<template>
  <div class="stats">
    <van-nav-bar title="统计" />

    <div class="stats__cards m-rise" style="--i: 0">
      <div class="stats__card">
        <span class="stats__label">本月支出</span>
        <span class="stats__value">¥ <RollNumber :value="summary.expense" /></span>
      </div>
      <div class="stats__card">
        <span class="stats__label">本月收入</span>
        <span class="stats__value stats__value--income">
          ¥ <RollNumber :value="summary.income" />
        </span>
      </div>
      <div class="stats__card">
        <span class="stats__label">本月结余</span>
        <span class="stats__value">¥ <RollNumber :value="summary.balance" /></span>
      </div>
    </div>

    <div class="stats__filter m-rise" style="--i: 1">
      <div class="stats__filter-head">
        <span>查一查</span>
        <span class="stats__filter-reset" @click="clearRange(); category = '全部'; type = 'all'">
          重置
        </span>
      </div>

      <van-cell
        title="日期"
        :value="rangeText"
        is-link
        :border="false"
        class="stats__date"
        @click="showCalendar = true"
      />

      <div class="stats__quick">
        <span class="stats__chip" :class="{ 'stats__chip--active': !range }" @click="clearRange">
          全部日期
        </span>
        <span class="stats__chip" @click="pickToday" :class="{ 'stats__chip--active': isTodayRange }">
          今天
        </span>
        <span class="stats__chip" @click="pickMonth" :class="{ 'stats__chip--active': isMonthRange }">
          本月
        </span>
      </div>

      <div class="stats__types">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          type="button"
          class="stats__type"
          :class="{ 'stats__type--active': type === option.value }"
          @click="type = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="stats__cats">
        <span
          v-for="item in categories"
          :key="item"
          class="stats__cat"
          :class="{ 'stats__cat--active': category === item }"
          @click="category = item"
        >
          {{ item }}
        </span>
      </div>
    </div>

    <div class="stats__result m-rise" style="--i: 2">
      <div class="stats__result-head">
        <span class="stats__result-title">筛选结果</span>
        <span class="stats__result-count">{{ filtered.length }} 笔</span>
      </div>
      <div class="stats__result-body">
        <div class="stats__result-item">
          <span class="stats__label">支出</span>
          <span class="stats__result-value">¥ <RollNumber :value="totals.expense" /></span>
        </div>
        <div class="stats__result-item">
          <span class="stats__label">收入</span>
          <span class="stats__result-value stats__value--income">
            ¥ <RollNumber :value="totals.income" />
          </span>
        </div>
      </div>
      <div class="stats__result-desc">
        {{ rangeText }} · {{ category === '全部' ? '全部分类' : category }} ·
        {{ typeOptions.find((item) => item.value === type)?.label }}
      </div>
    </div>

    <div class="stats__list m-rise" style="--i: 3">
      <div class="stats__list-head">明细（{{ filtered.length }} 条）</div>
      <EmptyState
        v-if="filtered.length === 0"
        title="没有符合条件的记录"
        desc="换个日期或分类试试"
      />
      <van-cell
        v-for="item in filtered"
        :key="item.id"
        :title="item.category"
        :label="`${item.date}${item.note ? ' · ' + item.note : ''}`"
        :value="`${item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}`"
      />
    </div>

    <van-calendar
      v-model:show="showCalendar"
      type="range"
      :min-date="minDate"
      :max-date="maxDate"
      :allow-same-day="true"
      title="选择日期区间（单日请连点两次同一天）"
      color="#4a7cf6"
      @confirm="onCalendarConfirm"
    />
  </div>
</template>

<style scoped>
.stats {
  min-height: 100vh;
  background: #f7f8fa;
}

.stats__cards {
  display: flex;
  gap: 8px;
  margin: 12px;
}

.stats__card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  border-radius: 12px;
  background: #fff;
}

.stats__label {
  font-size: 12px;
  color: #8a8f99;
}

.stats__value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.stats__value--income {
  color: #07c160;
}

.stats__filter,
.stats__result,
.stats__list {
  margin: 0 12px 12px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
}

.stats__list {
  padding: 12px 0;
  overflow: hidden;
}

.stats__filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.stats__filter-reset {
  font-size: 12px;
  font-weight: 400;
  color: #4a7cf6;
}

.stats__date {
  padding-left: 0;
  padding-right: 0;
}

.stats__quick {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.stats__chip {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #646566;
  background: #f2f3f5;
}

.stats__chip--active {
  color: #4a7cf6;
  background: #e8efff;
}

.stats__types {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.stats__type {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #646566;
  background: #f2f3f5;
}

.stats__type--active {
  color: #fff;
  background: #4a7cf6;
}

.stats__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stats__cat {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #646566;
  background: #f2f3f5;
}

.stats__cat--active {
  color: #fff;
  background: #4a7cf6;
}

.stats__result-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.stats__result-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.stats__result-count {
  font-size: 12px;
  color: #8a8f99;
}

.stats__result-body {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.stats__result-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats__result-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}

.stats__result-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #8a8f99;
}

.stats__list-head {
  padding: 0 16px 4px;
  font-size: 13px;
  color: #8a8f99;
}
</style>
