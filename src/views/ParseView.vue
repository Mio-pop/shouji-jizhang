<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import type { PickerConfirmEventParams, UploaderFileListItem } from 'vant'
import BurstEffect from '../components/BurstEffect.vue'
import { useRecordsStore } from '../stores/records'
import { extractNote, parseRecords, parseText } from '../utils/parse'
import { recognizeImage } from '../utils/ocr'
import type { ParsedRecordLine } from '../utils/parse'
import type { RecordType } from '../types'

interface Draft {
  key: number
  checked: boolean
  amount: string
  type: RecordType
  category: string
  date: string
  note: string
  confidence: number
  raw: string
}

const store = useRecordsStore()

const categories = ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '工资', '理财', '其他']
const categoryColumns = categories.map((item) => ({ text: item, value: item }))

const mode = ref<'text' | 'image'>('text')
const text = ref('')
const rawText = ref('')
const drafts = ref<Draft[]>([])
const fileList = ref<UploaderFileListItem[]>([])
const recognizing = ref(false)
const progress = ref(0)
const burstRef = ref<InstanceType<typeof BurstEffect> | null>(null)

const active = ref<Draft | null>(null)
const editVisible = ref(false)
const showEditCategory = ref(false)
const showEditDate = ref(false)
const editDateValues = ref<string[]>([])

const minDate = new Date(2000, 0, 1)
const maxDate = new Date()

const checkedDrafts = computed(() =>
  drafts.value.filter((draft) => draft.checked && Number(draft.amount) > 0),
)
const allChecked = computed(
  () => drafts.value.length > 0 && drafts.value.every((draft) => draft.checked),
)

let sequence = 0

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
}

function fromLines(lines: ParsedRecordLine[]): Draft[] {
  return lines.map((line) => ({
    key: ++sequence,
    checked: true,
    amount: line.amount.toFixed(2),
    type: line.type,
    category: line.category ?? '其他',
    date: line.date,
    note: line.note,
    confidence: line.confidence,
    raw: line.raw,
  }))
}

function amountText(value: string): string {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number.toFixed(2) : '--'
}

function toggleAll(): void {
  const next = !allChecked.value
  drafts.value.forEach((draft) => {
    draft.checked = next
  })
}

function handleParseText(): void {
  const raw = text.value.trim()
  if (!raw) {
    showToast('先输入一句话或粘贴账单文本')
    return
  }
  rawText.value = raw

  const lines = parseRecords(raw)
  if (lines.length > 1) {
    drafts.value = fromLines(lines)
    showToast(`识别到 ${lines.length} 条记录，请确认`)
    return
  }

  const parsed = parseText(raw)
  drafts.value = [
    {
      key: ++sequence,
      checked: true,
      amount: parsed.amount ? parsed.amount.toFixed(2) : '',
      type: parsed.type ?? 'expense',
      category: parsed.category ?? '其他',
      date: parsed.date ?? today(),
      note: extractNote(parsed.raw),
      confidence: parsed.confidence,
      raw,
    },
  ]
  if (!parsed.amount) showToast('没识别出金额，可手动补充')
}

async function onAfterRead(items: UploaderFileListItem | UploaderFileListItem[]): Promise<void> {
  const item = Array.isArray(items) ? items[0] : items
  if (!item?.file) return
  if (fileList.value.length > 1) fileList.value = fileList.value.slice(-1)
  await runOcr(item.file)
}

async function handleRecognize(): Promise<void> {
  const file = fileList.value[0]?.file
  if (!file) {
    showToast('请先选择截图')
    return
  }
  await runOcr(file)
}

async function runOcr(file: File): Promise<void> {
  recognizing.value = true
  progress.value = 0
  try {
    const { text: raw } = await recognizeImage(file, (percent) => {
      progress.value = percent
    })
    rawText.value = raw

    const lines = parseRecords(raw)
    if (lines.length === 0) {
      drafts.value = [
        {
          key: ++sequence,
          checked: true,
          amount: '',
          type: 'expense',
          category: '其他',
          date: today(),
          note: '',
          confidence: 0,
          raw,
        },
      ]
      showToast('没识别出金额，可手动补充')
      return
    }

    drafts.value = fromLines(lines)
    showToast(lines.length > 1 ? `识别到 ${lines.length} 条记录，请确认` : '识别完成，请确认')
  } catch (error) {
    const message = error instanceof Error ? error.message : '识别失败，请重试'
    showToast(message === 'image could not be loaded.' ? '图片读取失败，请换一张截图重试' : message)
  } finally {
    recognizing.value = false
  }
}

function openEdit(index: number): void {
  active.value = drafts.value[index] ?? null
  if (active.value) editVisible.value = true
}

function openEditDate(): void {
  if (!active.value) return
  editDateValues.value = active.value.date.split('-')
  showEditDate.value = true
}

function onEditDateConfirm(): void {
  if (active.value && editDateValues.value.length === 3) {
    active.value.date = editDateValues.value.join('-')
  }
  showEditDate.value = false
}

function onEditCategoryConfirm({ selectedValues }: PickerConfirmEventParams): void {
  if (active.value) active.value.category = String(selectedValues[0] ?? active.value.category)
  showEditCategory.value = false
}

function removeActive(): void {
  if (!active.value) return
  drafts.value = drafts.value.filter((draft) => draft.key !== active.value?.key)
  editVisible.value = false
  active.value = null
}

function handleSave(): void {
  const items = checkedDrafts.value
  if (items.length === 0) {
    showToast('请勾选要保存的记录')
    return
  }

  store.addRecords(
    items.map((draft) => ({
      amount: Math.round(Number(draft.amount) * 100) / 100,
      type: draft.type,
      category: draft.category || '其他',
      note: draft.note.trim(),
      date: draft.date,
      source: 'parsed' as const,
      confidence: draft.confidence,
    })),
  )

  burstRef.value?.burst()
  showToast(`已保存 ${items.length} 条`)
  drafts.value = []
  rawText.value = ''
  text.value = ''
  fileList.value = []
}
</script>

<template>
  <div class="parse">
    <van-nav-bar title="智能解析" />

    <div class="parse__body">
      <div class="parse__modes m-rise" style="--i: 0">
        <button
          type="button"
          class="parse__mode"
          :class="{ 'parse__mode--active': mode === 'text' }"
          @click="mode = 'text'"
        >
          粘贴文本
        </button>
        <button
          type="button"
          class="parse__mode"
          :class="{ 'parse__mode--active': mode === 'image' }"
          @click="mode = 'image'"
        >
          识别截图
        </button>
      </div>

      <template v-if="mode === 'text'">
        <van-field
          v-model="text"
          rows="3"
          autosize
          type="textarea"
          maxlength="300"
          placeholder="例如：午饭花了 28 块 5；也可以粘贴多条账单，每行一条"
          show-word-limit
        />
        <van-button type="primary" block round @click="handleParseText">解析</van-button>
      </template>

      <template v-else>
        <div class="parse__uploader">
          <van-uploader
            v-model="fileList"
            :max-count="1"
            accept="image/*"
            :after-read="onAfterRead"
          />
          <p class="parse__uploader-tip">
            支持微信、支付宝、银行的支付截图；账单截图可一次识别多条，识别结果可勾选与修改。
          </p>
        </div>

        <van-button
          type="primary"
          block
          round
          :loading="recognizing"
          loading-text="识别中"
          @click="handleRecognize"
        >
          {{ fileList.length > 0 ? '重新识别' : '识别截图' }}
        </van-button>

        <div v-if="recognizing" class="parse__progress">识别进度 {{ progress }}%</div>
      </template>

      <div v-if="drafts.length > 0" class="drafts">
        <div class="drafts__head">
          <span class="drafts__title">
            {{ drafts.length > 1 ? `识别到 ${drafts.length} 条` : '识别结果' }}
          </span>
          <span class="drafts__toggle" @click="toggleAll">
            {{ allChecked ? '取消全选' : '全选' }}
          </span>
        </div>

        <div
          v-for="(draft, index) in drafts"
          :key="draft.key"
          class="draft m-rise"
          :style="{ '--i': index + 1 }"
        >
          <van-checkbox v-model="draft.checked" shape="square" class="draft__check" />
          <div class="draft__body" @click="openEdit(index)">
            <div class="draft__top">
              <span class="draft__category">{{ draft.category }}</span>
              <span class="draft__type" :class="`draft__type--${draft.type}`">
                {{ draft.type === 'income' ? '收入' : '支出' }}
              </span>
            </div>
            <p class="draft__meta">
              {{ draft.date }}<template v-if="draft.note"> · {{ draft.note }}</template>
            </p>
          </div>
          <span class="draft__amount" :class="`draft__amount--${draft.type}`">
            {{ draft.type === 'income' ? '+' : '-' }}{{ amountText(draft.amount) }}
          </span>
        </div>

        <van-button type="primary" block round @click="handleSave">
          保存选中的 {{ checkedDrafts.length }} 条
        </van-button>

        <details v-if="rawText" class="parse__raw">
          <summary>识别到的原文</summary>
          <p>{{ rawText }}</p>
        </details>
      </div>
    </div>

    <van-popup v-model:show="editVisible" position="bottom" round closeable class="editor">
      <template v-if="active">
        <h2 class="editor__title">编辑这条记录</h2>

        <div class="editor__types">
          <button
            type="button"
            class="editor__type"
            :class="{ 'editor__type--active': active.type === 'expense' }"
            @click="active.type = 'expense'"
          >
            支出
          </button>
          <button
            type="button"
            class="editor__type"
            :class="{ 'editor__type--active': active.type === 'income' }"
            @click="active.type = 'income'"
          >
            收入
          </button>
        </div>

        <van-field
          v-model="active.amount"
          type="number"
          label="金额"
          placeholder="0.00"
          input-align="right"
        />
        <van-cell title="分类" :value="active.category" is-link @click="showEditCategory = true" />
        <van-cell title="日期" :value="active.date" is-link @click="openEditDate" />
        <van-field v-model="active.note" label="备注" maxlength="30" input-align="right" />

        <div class="editor__footer">
          <van-button type="primary" block round @click="editVisible = false">完成</van-button>
          <van-button plain type="danger" block round @click="removeActive">删除这条</van-button>
        </div>
      </template>
    </van-popup>

    <van-popup v-model:show="showEditCategory" position="bottom" round>
      <van-picker
        :columns="categoryColumns"
        :model-value="[active?.category ?? '其他']"
        title="选择分类"
        @confirm="onEditCategoryConfirm"
        @cancel="showEditCategory = false"
      />
    </van-popup>

    <van-popup v-model:show="showEditDate" position="bottom" round>
      <van-date-picker
        v-model="editDateValues"
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onEditDateConfirm"
        @cancel="showEditDate = false"
      />
    </van-popup>

    <BurstEffect ref="burstRef" />
  </div>
</template>

<style scoped>
.parse {
  min-height: 100vh;
  background: #f7f8fa;
}

.parse__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parse__modes {
  display: flex;
  gap: 8px;
}

.parse__mode {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #646566;
  background: #fff;
}

.parse__mode--active {
  color: #fff;
  background: #4a7cf6;
}

.parse__uploader {
  padding: 16px;
  border-radius: 12px;
  background: #fff;
}

.parse__uploader-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8a8f99;
  line-height: 1.6;
}

.parse__progress {
  font-size: 12px;
  color: #8a8f99;
  text-align: center;
}

.parse__raw {
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  font-size: 12px;
  color: #646566;
}

.parse__raw summary {
  cursor: pointer;
  color: #8a8f99;
}

.parse__raw p {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.drafts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drafts__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.drafts__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.drafts__toggle {
  font-size: 12px;
  color: #4a7cf6;
}

.draft {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
}

.draft__check {
  flex: none;
}

.draft__body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.draft__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.draft__category {
  font-size: 14px;
  font-weight: 500;
  color: #1f2329;
}

.draft__type {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.draft__type--expense {
  color: #ee0a24;
  background: rgba(238, 10, 36, 0.08);
}

.draft__type--income {
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
}

.draft__meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: #8a8f99;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft__amount {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.draft__amount--income {
  color: #07c160;
}

.editor {
  padding: 20px 16px calc(16px + env(safe-area-inset-bottom));
}

.editor__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  text-align: center;
}

.editor__types {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.editor__type {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #646566;
  background: #f2f3f5;
}

.editor__type--active {
  color: #fff;
  background: #4a7cf6;
}

.editor__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}
</style>
