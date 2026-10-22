import type { ParsedResult, RecordType } from '../types'

const INCOME_KEYWORDS = [
  '收入',
  '收款',
  '入账',
  '到账',
  '工资',
  '薪水',
  '奖金',
  '报销',
  '退款',
  '红包',
  '转入',
  '利息',
  '分红',
]

const EXPENSE_KEYWORDS = [
  '支出',
  '付款',
  '支付',
  '消费',
  '转账',
  '转出',
  '扣款',
  '花费',
  '花了',
  '买单',
  '充值',
  '提现',
]

const CATEGORY_RULES: ReadonlyArray<{ category: string; keywords: string[] }> = [
  { category: '餐饮', keywords: ['餐', '饭', '外卖', '咖啡', '奶茶', '美团', '饿了么', '肯德基', '麦当劳', '星巴克', '食堂'] },
  { category: '交通', keywords: ['打车', '滴滴', '地铁', '公交', '加油', '停车', '高铁', '火车', '机票', '出租车'] },
  { category: '购物', keywords: ['淘宝', '天猫', '京东', '拼多多', '超市', '商场', '便利店', '购物'] },
  { category: '居家', keywords: ['房租', '物业', '水电', '燃气', '宽带', '家具', '家政'] },
  { category: '娱乐', keywords: ['电影', '游戏', 'KTV', '健身', '演出', '门票', '会员', '网吧', '网咖'] },
  { category: '医疗', keywords: ['医院', '药店', '药品', '挂号', '体检', '诊所'] },
  { category: '工资', keywords: ['工资', '薪水', '奖金', '绩效'] },
  { category: '理财', keywords: ['理财', '基金', '股票', '利息', '分红', '余额宝'] },
]

function pad2(value: number | string): string {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function shiftDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function toAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0) return undefined
  return Math.round(value * 100) / 100
}

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

const CN_SMALL_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
const CN_NUM = '零〇一二两三四五六七八九十百千万亿'
const CN_DECIMAL = '零〇一二两三四五六七八九'

/**
 * 中文数字转数值，支持整数、小数（点）与口语省略写法：
 * 二十八 → 28，一百二 → 120，三千五 → 3500，一千零五 → 1005，两万 → 20000
 */
function parseCnNumber(input: string): number | null {
  const text = input.trim()
  if (!text) return null

  const [intPart = '', decPart] = text.split('点')
  const integer = parseCnInteger(intPart)
  if (integer === null) return null
  if (decPart === undefined) return integer

  const decimals = [...decPart].map((char) => CN_DIGITS[char])
  if (decimals.length === 0 || decimals.some((digit) => digit === undefined)) return null
  return Number(`${integer}.${decimals.join('')}`)
}

function parseCnInteger(input: string): number | null {
  if (!input) return 0

  let total = 0
  let section = 0
  let number = -1
  let lastUnit = 0
  let sawZero = false

  for (const char of input) {
    if (char in CN_DIGITS) {
      const digit = CN_DIGITS[char]
      if (digit === 0) sawZero = true
      number = digit
      continue
    }

    const smallUnit = CN_SMALL_UNITS[char]
    if (smallUnit) {
      // “十五”里省略了前面的“一”
      if (number < 0) number = 1
      section += number * smallUnit
      lastUnit = smallUnit
      number = -1
      sawZero = false
      continue
    }

    if (char === '万' || char === '亿') {
      if (number > 0) section += number
      if (section === 0) section = 1
      total = (total + section) * (char === '万' ? 10000 : 100000000)
      section = 0
      number = -1
      lastUnit = 0
      sawZero = false
      continue
    }

    return null
  }

  if (number >= 0) {
    // 口语省略末位单位：“三千五”= 3500，“一百二”= 120；出现“零”时按字面读
    if (!sawZero && lastUnit >= 100 && number < 10) section += (number * lastUnit) / 10
    else section += number
  }

  return total + section
}

/** 从纯中文文本里找金额，例如“午饭花了二十八块五” */
function findChineseAmount(text: string): number | undefined {
  const round2 = (value: number) => Math.round(value * 100) / 100
  const tailPattern = new RegExp(
    `([${CN_NUM}点]+)\\s*(?:元|块|圆)\\s*([${CN_DECIMAL}])\\s*[毛角]`,
  )
  const shortTailPattern = new RegExp(
    `([${CN_NUM}点]+)\\s*(?:元|块|圆)\\s*([${CN_DECIMAL}])`,
  )
  const yuanPattern = new RegExp(`([${CN_NUM}点]+)\\s*(?:元|块|圆)`)
  const jiaoPattern = new RegExp(`([${CN_DECIMAL}])\\s*[毛角]\\s*([${CN_DECIMAL}])?`)
  const keywordPattern = new RegExp(
    `(?:花了|花|付了|支付|付款|消费|支出|收入|工资|奖金|报销|收款|到账|实付|合计|共计|总计)\\s*([${CN_NUM}]+)`,
  )

  // 三块五毛 / 三块五角
  let match = text.match(tailPattern)
  if (match) {
    const base = parseCnNumber(match[1])
    const jiao = parseCnNumber(match[2])
    if (base !== null && jiao !== null) return round2(base + jiao / 10)
  }

  // 三块五（尾数为角，省略“毛”）
  match = text.match(shortTailPattern)
  if (match) {
    const base = parseCnNumber(match[1])
    const jiao = parseCnNumber(match[2])
    if (base !== null && jiao !== null) return round2(base + jiao / 10)
  }

  // 二十八块 / 二十八元
  match = text.match(yuanPattern)
  if (match) {
    const value = parseCnNumber(match[1])
    if (value) return value
  }

  // 五毛 / 两毛五 / 五分
  match = text.match(jiaoPattern)
  if (match) {
    const jiao = parseCnNumber(match[1])
    const fen = match[2] ? parseCnNumber(match[2]) : 0
    if (jiao !== null && fen !== null) return round2(jiao / 10 + fen / 100)
  }

  // 花了三千五 / 工资两万
  match = text.match(keywordPattern)
  if (match) {
    const value = parseCnNumber(match[1])
    if (value) return value
  }

  // 不带单位的口语写法：“午饭二十八点五”“交房租一千零五”
  const bareDecimal = new RegExp(`([${CN_NUM}]+点[${CN_DECIMAL}]+)`)
  match = text.match(bareDecimal)
  if (match) {
    const value = parseCnNumber(match[1])
    if (value) return value
  }

  const bareInteger = new RegExp(
    `([${CN_NUM}]{2,})(?![${CN_NUM}月日号个斤岁人次杯份张只点])`,
  )
  match = text.match(bareInteger)
  if (match) {
    const value = parseCnNumber(match[1])
    // 排除“三个人”“一两天”这类非金额写法
    if (value && value >= 10) return value
  }

  return undefined
}

/** 去掉日期、时间、卡号尾号等干扰数字，避免被当成金额 */
function stripNoise(text: string): string {
  return text
    // 三段式日期：2026-10-22 / 2026年10月22日
    .replace(/\d{4}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*日?/g, ' ')
    // 两段式：2026年10月（避免年份被兜底规则当成金额）
    .replace(/\d{4}\s*年\s*\d{1,2}\s*月/g, ' ')
    .replace(/\d{1,2}\s*月\s*\d{1,2}\s*日/g, ' ')
    .replace(/(?:^|\s)\d{1,2}[-/]\d{1,2}(?!\d)/g, ' ')
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, ' ')
    .replace(/尾号\s*\d{4}/g, ' ')
    .replace(/[*]{2,}\d{2,4}/g, ' ')
}

/** 依次用更宽松的规则找金额 */
function findAmount(text: string): number | undefined {
  const cleaned = stripNoise(text)

  // 28块5 / 28元5角
  const tail = cleaned.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:元|块|圆)\s*(\d)\s*[毛角]?/)
  if (tail) {
    const base = toAmount(tail[1])
    const jiao = Number(tail[2])
    if (base && Number.isFinite(jiao)) return Math.round((base + jiao / 10) * 100) / 100
  }

  const candidates: RegExp[] = [
    /(?:¥|￥|RMB|人民币)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:元|块|圆)/,
    /(?:支出|收入|支付|付款|收款|消费|转账|扣款|金额|合计|实付)[:：]?\s*([\d,]+(?:\.\d{1,2})?)/,
  ]

  for (const pattern of candidates) {
    const match = cleaned.match(pattern)
    const amount = toAmount(match?.[1])
    if (amount) return amount
  }

  // 纯中文数字：“午饭花了二十八块五”
  const chinese = findChineseAmount(cleaned)
  if (chinese) return chinese

  const decimal = cleaned.match(/(?:^|[^\d.])([\d,]{1,7}\.\d{1,2})(?![\d])/)
  const decimalAmount = toAmount(decimal?.[1])
  if (decimalAmount) return decimalAmount

  const integer = cleaned.match(/(?:^|[^\d.])([\d,]{1,7})(?![\d.])/)
  return toAmount(integer?.[1])
}

function findDate(text: string): string | undefined {
  const full = text.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/)
  if (full) return `${full[1]}-${pad2(full[2])}-${pad2(full[3])}`

  const monthDay = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (monthDay) return `${new Date().getFullYear()}-${pad2(monthDay[1])}-${pad2(monthDay[2])}`

  // 10-01 / 10/01 这类不带年份的写法
  const shortDate = text.match(/(?:^|\s)(\d{1,2})[-/](\d{1,2})(?!\d)/)
  if (shortDate) {
    const month = Number(shortDate[1])
    const day = Number(shortDate[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${new Date().getFullYear()}-${pad2(month)}-${pad2(day)}`
    }
  }

  if (text.includes('昨天') || text.includes('昨日')) return shiftDays(-1)
  if (/今天|今日|刚刚|刚才/.test(text)) return shiftDays(0)

  return undefined
}

function findType(text: string): RecordType | undefined {
  const income = INCOME_KEYWORDS.filter((word) => text.includes(word)).length
  const expense = EXPENSE_KEYWORDS.filter((word) => text.includes(word)).length

  if (income === expense) return undefined
  return income > expense ? 'income' : 'expense'
}

function findCategory(text: string): string | undefined {
  return CATEGORY_RULES.find((rule) => rule.keywords.some((word) => text.includes(word)))?.category
}

/**
 * 从 OCR 原文里挑一行当备注：优先商户/商品行，否则取第一行；
 * 顺带去掉 OCR 在中文字之间插入的空格。
 */
export function extractNote(text: string, maxLength = 30): string {
  const cleanLine = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1')
      .trim()

  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length > 0)

  const keywords = ['商户', '收款方', '商品', '订单', '备注']
  const preferred = lines.find((line) => keywords.some((word) => line.includes(word)))

  return (preferred ?? lines[0] ?? '').slice(0, maxLength)
}

/**
 * 把任意文本（手动输入 / 截图 OCR 结果 / 通知文案）解析成结构化结果。
 * 纯规则实现，命中越少置信度越低，交由用户确认。
 */
export function parseText(raw: string): ParsedResult {
  const text = raw.trim()
  const amount = findAmount(text)
  const type = findType(text)
  const category = findCategory(text)
  const date = findDate(text)

  const score =
    (amount ? 0.5 : 0) + (type ? 0.3 : 0) + (category ? 0.15 : 0) + (date ? 0.05 : 0)
  const confidence = Math.round(score * 100) / 100

  return {
    raw: text,
    amount,
    type,
    category,
    date,
    confidence,
    needsReview: !amount || !type || confidence < 0.8,
  }
}

/** 一条待确认的记录（截图里的一行交易） */
export interface ParsedRecordLine {
  raw: string
  amount: number
  type: RecordType
  category?: string
  date: string
  note: string
  confidence: number
}

/** 账单截图里的汇总、页眉页脚、按钮文案等，不当成交易行 */
const NOISE_LINE =
  /^(合计|总计|小计|笔数|共\s*\d+\s*笔|余额|已优惠|优惠|立减|积分|客服|查看|账单|交易时间|付款方式|收款方名称|订单号|交易单号|交易类型|当前状态|更多|全部账单|导出|微信支付|支付宝|我的账单|支付服务|账单详情|\d+\s*条新消息)/

/** 支付渠道、推广语等，不能当作商户名 */
const NON_MERCHANT = /^(使用|支付|付款|微信|支付宝|银行卡|零钱|余额|账单|详情|优惠|服务|我的|你|积分|退款|收款)/

const MERCHANT_SUFFIX =
  /(学院|大学|学校|中心|公司|门店|店|超市|餐厅|饭店|网吧|网咖|酒店|宾馆|医院|药房|银行|科技|商贸|集团|馆|部|站|场)$/

/** 微信/支付宝账单里金额与商户名常常分两行，这里判断一行是否像商户名 */
function looksLikeMerchant(line: string): boolean {
  if (line.length < 2 || line.length > 20) return false
  if (/^\d/.test(line)) return false
  if (/[，。！？、,.!?]/.test(line)) return false
  if (NON_MERCHANT.test(line)) return false
  return MERCHANT_SUFFIX.test(line) || line.length <= 8
}

/** 去掉 OCR 在商户名前后带入的单字母、尖括号、竖线等杂字符 */
function cleanMerchant(line: string): string {
  return line
    .replace(/^[^\u4e00-\u9fff]+/, '')
    .replace(/[^\u4e00-\u9fff]+$/, '')
    .trim()
}

/** 行内是否出现明确的货币标记（有标记才算“像金额”的行） */
function hasCurrencyMark(line: string): boolean {
  return /[¥￥$]|元|块|圆/.test(line)
}

function chineseCount(line: string): number {
  return (line.match(/[\u4e00-\u9fff]/g) ?? []).length
}

/** 从整段 OCR 文本里按行拆出多条交易 */
export function parseRecords(raw: string): ParsedRecordLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const results: ParsedRecordLine[] = []
  let currentDate: string | undefined
  let merchant = ''

  for (const line of lines) {
    const date = findDate(line)
    if (date) currentDate = date
    if (NOISE_LINE.test(line)) continue
    // “6 条新消息”这类提醒角标，不论数字是否全角都不算记录
    if (/新消息/.test(line)) continue
    // 纯数字行多半是角标、消息数、页码，不是金额
    if (/^\d{1,4}$/.test(line)) continue

    const amount = findAmount(line)
    if (!amount) {
      const merchantName = cleanMerchant(line)
      if (looksLikeMerchant(merchantName)) merchant = merchantName
      continue
    }

    // 没有货币标记、没有上方商户名、也几乎没有中文的行，基本是角标或按钮
    if (!hasCurrencyMark(line) && !merchant && chineseCount(line) < 2) continue

    const context = `${merchant} ${line}`
    const category = findCategory(context)
    const type = findType(context) ?? 'expense'

    results.push({
      raw: line,
      amount,
      type,
      category,
      date: date ?? currentDate ?? shiftDays(0),
      note: merchant || cleanMerchant(buildNote(line)),
      confidence:
        Math.round((0.6 + (category ? 0.2 : 0) + (date ? 0.15 : 0)) * 100) / 100,
    })
    merchant = ''
  }

  const seen = new Set<string>()
  return results.filter((item) => {
    const key = `${item.amount}|${item.date}|${item.category ?? ''}|${item.note}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 去掉日期与金额，剩下的当作商户/备注 */
function buildNote(line: string, maxLength = 30): string {
  return line
    .replace(/\d{4}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*日?/g, ' ')
    .replace(/\d{1,2}\s*月\s*\d{1,2}\s*日/g, ' ')
    .replace(/(?:^|\s)\d{1,2}[-/]\d{1,2}(?!\d)/g, ' ')
    .replace(/(?:¥|￥)?\s*[\d,]+(?:\.\d{1,2})?\s*(?:元|块|圆)?/g, ' ')
    .replace(/[|丨·:：\-—_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}
