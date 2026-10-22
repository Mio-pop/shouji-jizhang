/** 收支类型：收入 / 支出 */
export type RecordType = 'income' | 'expense'

/** 记录来源：手动记账 / 智能解析 */
export type RecordSource = 'manual' | 'parsed'

/** 一条记账记录 */
export interface RecordItem {
  /** 唯一标识 */
  id: string
  /** 金额，单位：元，始终为正数 */
  amount: number
  /** 收支类型 */
  type: RecordType
  /** 分类，例如：餐饮、交通、工资 */
  category: string
  /** 备注 */
  note: string
  /** 日期，格式 YYYY-MM-DD */
  date: string
  /** 来源 */
  source: RecordSource
  /** 解析置信度，0 ~ 1，仅智能解析产生时有值 */
  confidence?: number
}

/** 智能解析结果（尚未落库） */
export interface ParsedResult {
  /** 原始输入文本 */
  raw: string
  /** 解析出的金额 */
  amount?: number
  /** 解析出的收支类型 */
  type?: RecordType
  /** 解析出的分类 */
  category?: string
  /** 解析出的日期，格式 YYYY-MM-DD */
  date?: string
  /** 整体置信度，0 ~ 1 */
  confidence: number
  /** 是否需要用户二次确认 */
  needsReview: boolean
}

/** 新增记录时的入参：id 由 store 生成，date 可省略（默认今天） */
export type NewRecordInput = Omit<RecordItem, 'id' | 'date'> & { date?: string }

/** 金额汇总结果 */
export interface Summary {
  /** 收入合计 */
  income: number
  /** 支出合计 */
  expense: number
  /** 结余 = 收入 - 支出 */
  balance: number
  /** 记录条数 */
  count: number
}
