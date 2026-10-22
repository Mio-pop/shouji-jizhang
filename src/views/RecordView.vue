<script setup lang="ts">
import { computed, ref } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import RecordEditSheet from '../components/RecordEditSheet.vue'
import BurstEffect from '../components/BurstEffect.vue'
import EmptyState from '../components/EmptyState.vue'
import { useRecordsStore } from '../stores/records'
import type { RecordItem, RecordType } from '../types'

const store = useRecordsStore()
const burstRef = ref<InstanceType<typeof BurstEffect> | null>(null)
const removingIds = ref<string[]>([])

const type = ref<RecordType>('expense')
const amount = ref('')
const category = ref('餐饮')
const note = ref('')

const editingRecord = ref<RecordItem | null>(null)
const showEditor = ref(false)

const categories = ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '工资', '理财', '其他']

const today = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
})

const dateValues = ref<string[]>(today.value.split('-'))
const showDatePicker = ref(false)
const minDate = new Date(2000, 0, 1)
const maxDate = new Date()

const dateText = computed(() => dateValues.value.join('-'))

function handleSubmit(): void {
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    showToast('请输入有效金额')
    return
  }

  store.addRecords([
    {
      amount: Math.round(value * 100) / 100,
      type: type.value,
      category: category.value,
      note: note.value.trim(),
      date: dateText.value,
      source: 'manual',
    },
  ])

  amount.value = ''
  note.value = ''
  // 保存后收起键盘与聚焦线，避免朱红细线一直停在输入框上
  ;(document.activeElement as HTMLElement | null)?.blur()
  burstRef.value?.burst()
  showToast('已保存')
}

function openEditor(item: RecordItem): void {
  editingRecord.value = item
  showEditor.value = true
}

async function confirmDelete(item: RecordItem): Promise<void> {
  try {
    await showConfirmDialog({
      title: '删除这条记录？',
      message: `${item.category} ${item.amount.toFixed(2)} 元 · ${item.date}`,
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
  <div class="record">
    <van-nav-bar title="记一笔" />

    <div class="record__panel m-rise" style="--i: 0">
      <div class="record__types">
        <button
          type="button"
          class="record__type"
          :class="{ 'record__type--active': type === 'expense' }"
          @click="type = 'expense'"
        >
          支出
        </button>
        <button
          type="button"
          class="record__type"
          :class="{ 'record__type--active': type === 'income' }"
          @click="type = 'income'"
        >
          收入
        </button>
      </div>

      <van-field
        v-model="amount"
        type="number"
        label="金额"
        placeholder="0.00"
        input-align="right"
      />

      <van-field label="分类">
        <template #input>
          <div class="record__categories">
            <span
              v-for="item in categories"
              :key="item"
              class="record__chip"
              :class="{ 'record__chip--active': category === item }"
              @click="category = item"
            >
              {{ item }}
            </span>
          </div>
        </template>
      </van-field>

      <van-field v-model="note" label="备注" placeholder="选填" maxlength="30" />

      <van-cell title="日期" :value="dateText" is-link @click="showDatePicker = true" />

      <div class="record__footer">
        <van-button type="primary" block round @click="handleSubmit">保存</van-button>
      </div>
    </div>

    <div class="record__list m-rise" style="--i: 1">
      <div class="record__list-head">最新记录（左滑删除 / 点击编辑）</div>
      <EmptyState
        v-if="store.recentRecords.length === 0"
        title="还没有记录"
        desc="在上面记下第一笔"
      />
      <van-swipe-cell
        v-for="item in store.recentRecords"
        :key="item.id"
        :class="{
          'is-new': store.highlightIds.includes(item.id),
          'is-tearing': removingIds.includes(item.id),
        }"
      >
        <van-cell
          :title="item.category"
          :label="`${item.date}${item.note ? ' · ' + item.note : ''}`"
          :value="`${item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}`"
          @click="openEditor(item)"
        />
        <template #right>
          <van-button
            square
            type="danger"
            class="record__delete"
            text="删除"
            @click="confirmDelete(item)"
          />
        </template>
      </van-swipe-cell>
    </div>

    <RecordEditSheet v-model:show="showEditor" :record="editingRecord" />

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="dateValues"
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="showDatePicker = false"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <BurstEffect ref="burstRef" />
  </div>
</template>

<style scoped>
.record {
  min-height: 100vh;
  background: #f7f8fa;
}

.record__panel {
  margin: 12px;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

.record__types {
  display: flex;
  gap: 8px;
  padding: 12px 16px 4px;
}

.record__type {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #646566;
  background: #f2f3f5;
}

.record__type--active {
  color: #fff;
  background: #4a7cf6;
}

.record__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.record__chip {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #646566;
  background: #f2f3f5;
}

.record__chip--active {
  color: #fff;
  background: #4a7cf6;
}

.record__footer {
  padding: 12px 16px 16px;
}

.record__list {
  margin: 0 12px 12px;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

.record__list-head {
  padding: 12px 16px 4px;
  font-size: 13px;
  color: #8a8f99;
}

.record__delete {
  height: 100%;
}
</style>
