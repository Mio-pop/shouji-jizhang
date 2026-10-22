<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import type { PickerConfirmEventParams } from 'vant'
import { useRecordsStore } from '../stores/records'
import type { RecordItem, RecordType } from '../types'

const props = defineProps<{
  show: boolean
  record: RecordItem | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  saved: []
}>()

const store = useRecordsStore()

const categories = ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '工资', '理财', '其他']
const categoryColumns = categories.map((item) => ({ text: item, value: item }))

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const type = ref<RecordType>('expense')
const amount = ref('')
const category = ref('餐饮')
const note = ref('')
const dateValues = ref<string[]>(['2000', '01', '01'])

const showKeyboard = ref(false)
const showCategoryPicker = ref(false)
const showDatePicker = ref(false)

const maxDate = new Date()
const minDate = new Date(2000, 0, 1)

const dateText = computed(() => dateValues.value.join('-'))
const amountText = computed(() => (amount.value ? amount.value : '0.00'))

watch(
  () => [props.show, props.record] as const,
  ([show, record]) => {
    if (!show || !record) return
    // 每次打开都重置浮层状态，避免上次点遮罩关闭后键盘残留
    showKeyboard.value = false
    showCategoryPicker.value = false
    showDatePicker.value = false
    type.value = record.type
    amount.value = record.amount.toFixed(2)
    category.value = record.category || '其他'
    note.value = record.note
    const parts = record.date.split('-')
    dateValues.value = parts.length === 3 ? parts : dateValues.value
  },
  { immediate: true },
)

function close(): void {
  showKeyboard.value = false
  showCategoryPicker.value = false
  showDatePicker.value = false
  visible.value = false
}

function onCategoryConfirm({ selectedValues }: PickerConfirmEventParams): void {
  category.value = String(selectedValues[0] ?? category.value)
  showCategoryPicker.value = false
}

function onDateConfirm(): void {
  showDatePicker.value = false
}

function handleSave(): void {
  const record = props.record
  if (!record) return

  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) {
    showToast('请输入有效金额')
    return
  }

  store.updateRecord(record.id, {
    amount: Math.round(value * 100) / 100,
    type: type.value,
    category: category.value,
    note: note.value.trim(),
    date: dateText.value,
  })

  emit('saved')
  close()
  showToast('已更新')
}

async function handleDelete(): Promise<void> {
  const record = props.record
  if (!record) return

  try {
    await showConfirmDialog({
      title: '删除这条记录？',
      message: `${record.category || '未分类'} ${record.amount.toFixed(2)} 元 · ${record.date}`,
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
    })
  } catch {
    return
  }

  store.deleteRecord(record.id)
  emit('saved')
  close()
  showToast('已删除')
}
</script>

<template>
  <van-popup v-model:show="visible" position="bottom" round closeable class="sheet">
    <h2 class="sheet__title">编辑记录</h2>

    <div class="sheet__types">
      <button
        type="button"
        class="sheet__type"
        :class="{ 'sheet__type--active': type === 'expense' }"
        @click="type = 'expense'"
      >
        支出
      </button>
      <button
        type="button"
        class="sheet__type"
        :class="{ 'sheet__type--active': type === 'income' }"
        @click="type = 'income'"
      >
        收入
      </button>
    </div>

    <div class="sheet__amount" @click="showKeyboard = true">
      <span class="sheet__amount-label">金额<em class="sheet__hint">（点击用数字键盘修改）</em></span>
      <span class="sheet__amount-value">{{ amountText }}</span>
    </div>

    <van-cell-group :border="false">
      <van-cell title="分类" :value="category" is-link @click="showCategoryPicker = true" />
      <van-cell title="日期" :value="dateText" is-link @click="showDatePicker = true" />
    </van-cell-group>

    <van-field
      v-model="note"
      label="备注"
      placeholder="选填"
      maxlength="30"
      input-align="right"
      class="sheet__note"
    />

    <div class="sheet__footer">
      <van-button type="primary" block round @click="handleSave">保存</van-button>
      <van-button
        plain
        type="danger"
        block
        round
        class="sheet__delete"
        @click="handleDelete"
      >
        删除这条记录
      </van-button>
    </div>

    <van-number-keyboard
      v-model="amount"
      class="sheet__keyboard"
      :show="showKeyboard"
      extra-key="."
      close-button-text="完成"
      :maxlength="10"
      @blur="showKeyboard = false"
    />
  </van-popup>

  <van-popup v-model:show="showCategoryPicker" position="bottom" round>
    <van-picker
      :columns="categoryColumns"
      :model-value="[category]"
      title="选择分类"
      @confirm="onCategoryConfirm"
      @cancel="showCategoryPicker = false"
    />
  </van-popup>

  <van-popup v-model:show="showDatePicker" position="bottom" round>
    <van-date-picker
      v-model="dateValues"
      title="选择日期"
      :min-date="minDate"
      :max-date="maxDate"
      @confirm="onDateConfirm"
      @cancel="showDatePicker = false"
    />
  </van-popup>
</template>

<style scoped>
.sheet {
  padding: 20px 16px calc(16px + env(safe-area-inset-bottom));
  max-height: 92vh;
  overflow-y: auto;
}

.sheet__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  text-align: center;
}

.sheet__types {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.sheet__type {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #646566;
  background: #f2f3f5;
}

.sheet__type--active {
  color: #fff;
  background: #4a7cf6;
}

.sheet__amount {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 4px;
  border-bottom: 1px solid #f2f3f5;
}

.sheet__amount-label {
  font-size: 14px;
  color: #646566;
}

.sheet__hint {
  font-size: 12px;
  font-style: normal;
  color: #a8adb5;
}

.sheet__amount-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2329;
}

.sheet__note {
  padding-left: 0;
  padding-right: 0;
  border-top: 1px solid #f2f3f5;
}

.sheet__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

/* 数字键盘内联到面板底部，避免浮层遮挡内容 */
.sheet__keyboard {
  position: static;
  z-index: auto;
  width: auto;
  margin: 16px -16px calc(-16px - env(safe-area-inset-bottom));
}
</style>
