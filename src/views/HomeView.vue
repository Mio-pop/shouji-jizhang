<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import RecordEditSheet from '../components/RecordEditSheet.vue'
import RollNumber from '../components/RollNumber.vue'
import EmptyState from '../components/EmptyState.vue'
import { useRecordsStore } from '../stores/records'
import type { RecordItem } from '../types'

const router = useRouter()
const store = useRecordsStore()

const now = new Date()
const todayText = `${now.getMonth() + 1}月${now.getDate()}日`
const weekdayText = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
const monthText = `${now.getFullYear()}年${now.getMonth() + 1}月`

const todaySummary = computed(() => store.getTodaySummary())
const monthSummary = computed(() => store.getMonthSummary())
const recent = computed(() => store.recentRecords)

const removingIds = ref<string[]>([])

const editingRecord = ref<RecordItem | null>(null)
const showEditor = ref(false)

function money(value: number): string {
  return value.toFixed(2)
}

function dayText(date: string): string {
  const parts = date.split('-')
  if (parts.length !== 3) return date
  return `${Number(parts[1])}月${Number(parts[2])}日`
}

function goRecord(): void {
  router.push('/record')
}

function goParse(): void {
  router.push('/parse')
}

function goStats(): void {
  router.push('/stats')
}

function openEditor(item: RecordItem): void {
  editingRecord.value = item
  showEditor.value = true
}

async function confirmDelete(item: RecordItem): Promise<void> {
  try {
    await showConfirmDialog({
      title: '删除这条记录？',
      message: `${item.category || '未分类'} ${money(item.amount)} 元 · ${dayText(item.date)}`,
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return
  }

  removingIds.value = [...removingIds.value, item.id]
  window.setTimeout(() => {
    store.deleteRecord(item.id)
    removingIds.value = removingIds.value.filter((id) => id !== item.id)
  }, 260)
  showToast('已删除')
}
</script>

<template>
  <div class="home">
    <header class="home__header">
      <div>
        <h1 class="home__title">随手记账</h1>
        <p class="home__date">{{ todayText }} {{ weekdayText }}</p>
      </div>
      <van-icon
        name="records-o"
        size="24"
        color="#ffffff"
        class="home__icon"
        @click="goStats"
      />
    </header>

    <section class="summary m-rise" style="--i: 0">
      <span class="summary__stamp" aria-hidden="true">今日</span>
      <p class="summary__label">今日结余（元）</p>
      <p class="summary__balance" :class="{ 'summary__balance--minus': todaySummary.balance < 0 }">
        <RollNumber :value="todaySummary.balance" />
      </p>
      <div class="summary__row">
        <div class="summary__item">
          <span class="summary__item-label">收入</span>
          <span class="summary__item-value"><RollNumber :value="todaySummary.income" /></span>
        </div>
        <div class="summary__divider" />
        <div class="summary__item">
          <span class="summary__item-label">支出</span>
          <span class="summary__item-value"><RollNumber :value="todaySummary.expense" /></span>
        </div>
        <div class="summary__divider" />
        <div class="summary__item">
          <span class="summary__item-label">笔数</span>
          <span class="summary__item-value">
            <RollNumber :value="todaySummary.count" :decimals="0" />
          </span>
        </div>
      </div>
    </section>

    <section class="month m-rise" style="--i: 1">
      <div class="month__head">
        <span class="month__title">{{ monthText }}支出</span>
        <router-link class="month__more" to="/stats">查看统计</router-link>
      </div>
      <div class="month__body">
        <p class="month__amount">¥ <RollNumber :value="monthSummary.expense" /></p>
        <p class="month__income">本月收入 ¥ <RollNumber :value="monthSummary.income" /></p>
      </div>
    </section>

    <section class="actions m-rise" style="--i: 2">
      <button class="actions__btn actions__btn--primary" type="button" @click="goRecord">
        <van-icon name="plus" size="18" />
        <span>记一笔</span>
      </button>
      <button class="actions__btn" type="button" @click="goParse">
        <van-icon name="search" size="18" />
        <span>智能解析</span>
      </button>
    </section>

    <section class="recent m-rise" style="--i: 3">
      <div class="recent__head">
        <span class="recent__title">最近记录</span>
        <span class="recent__count">共 {{ store.records.length }} 条</span>
      </div>

      <EmptyState
        v-if="recent.length === 0"
        title="还没有记账记录"
        desc="记下第一笔，看清钱都去了哪儿"
      >
        <div class="empty__actions">
          <van-button type="primary" round size="small" @click="goRecord">记一笔</van-button>
          <van-button plain type="primary" round size="small" @click="goParse">智能解析</van-button>
        </div>
      </EmptyState>

      <div v-else class="recent__list">
        <van-swipe-cell
          v-for="item in recent"
          :key="item.id"
          class="recent__cell"
          :class="{
            'is-new': store.highlightIds.includes(item.id),
            'is-tearing': removingIds.includes(item.id),
          }"
        >
          <div class="recent__item" @click="openEditor(item)">
            <div class="recent__icon" :class="`recent__icon--${item.type}`">
              {{ item.category.slice(0, 1) || '账' }}
            </div>
            <div class="recent__info">
              <p class="recent__category">{{ item.category || '未分类' }}</p>
              <p class="recent__meta">
                <span>{{ dayText(item.date) }}</span>
                <span v-if="item.note" class="recent__note"> · {{ item.note }}</span>
              </p>
            </div>
            <div class="recent__right">
              <span class="recent__amount" :class="`recent__amount--${item.type}`">
                {{ item.type === 'income' ? '+' : '-' }}{{ money(item.amount) }}
              </span>
              <van-tag v-if="item.source === 'parsed'" plain type="primary">解析</van-tag>
            </div>
          </div>
          <template #right>
            <van-button
              square
              type="danger"
              class="recent__delete"
              text="删除"
              @click="confirmDelete(item)"
            />
          </template>
        </van-swipe-cell>
      </div>
    </section>

    <RecordEditSheet v-model:show="showEditor" :record="editingRecord" />
  </div>
</template>

<style scoped>
.home {
  padding: 0 0 16px;
}

.home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 56px;
  background: linear-gradient(135deg, #4a7cf6, #2f5bd8);
  color: #fff;
}

.home__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.home__date {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

/* 扩大点击热区，方便手机上点中 */
.home__icon {
  padding: 6px;
  margin: -6px;
  cursor: pointer;
}

.summary {
  margin: -40px 16px 0;
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(47, 91, 216, 0.12);
}

.summary__label {
  margin: 0;
  font-size: 12px;
  color: #8a8f99;
}

.summary__balance {
  margin: 8px 0 16px;
  font-size: 32px;
  font-weight: 700;
  color: #1f2329;
  line-height: 1.1;
}

.summary__balance--minus {
  color: #ee0a24;
}

.summary__row {
  display: flex;
  align-items: center;
}

.summary__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary__item-label {
  font-size: 12px;
  color: #8a8f99;
}

.summary__item-value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.summary__divider {
  width: 1px;
  height: 24px;
  background: #ebedf0;
}

.month {
  margin: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
}

.month__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.month__more {
  font-size: 12px;
  color: #4a7cf6;
  text-decoration: none;
}

.month__body {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 8px;
}

.month__amount {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2329;
}

.month__income {
  margin: 0;
  font-size: 12px;
  color: #07c160;
}

.actions {
  display: flex;
  gap: 12px;
  margin: 16px;
}

.actions__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #1f2329;
  background: #fff;
}

.actions__btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #4a7cf6, #2f5bd8);
}

.recent {
  margin: 0 16px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
}

.recent__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.recent__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.recent__count {
  font-size: 12px;
  color: #8a8f99;
}

.recent__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent__cell {
  background: #fff;
}

.recent__delete {
  height: 100%;
}

.recent__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  background: #fff;
  border-bottom: 1px solid #f2f3f5;
  cursor: pointer;
}

.recent__cell:last-child .recent__item {
  border-bottom: none;
}

.recent__icon {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
}

.recent__icon--expense {
  color: #ee0a24;
  background: rgba(238, 10, 36, 0.08);
}

.recent__icon--income {
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
}

.recent__info {
  flex: 1;
  min-width: 0;
}

.recent__category {
  margin: 0;
  font-size: 14px;
  color: #1f2329;
}

.recent__meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: #8a8f99;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent__note {
  margin-left: 4px;
}

.recent__right {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.recent__amount {
  font-size: 15px;
  font-weight: 600;
}

.recent__amount--expense {
  color: #1f2329;
}

.recent__amount--income {
  color: #07c160;
}

.empty__actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
</style>
