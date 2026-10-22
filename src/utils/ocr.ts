import { Capacitor } from '@capacitor/core'

export type OcrProvider = 'mlkit' | 'tesseract'

export interface OcrResult {
  /** 识别出的纯文本 */
  text: string
  /** 实际使用的识别引擎 */
  provider: OcrProvider
}

type ProgressHandler = (percent: number) => void

interface TesseractWorker {
  recognize: (image: File) => Promise<{ data: { text: string } }>
}

let workerPromise: Promise<TesseractWorker> | null = null
let progressHandler: ProgressHandler | undefined

/** 真机上走 ML Kit，浏览器里走 Tesseract */
export function isNativeOcr(): boolean {
  return Capacitor.isNativePlatform()
}

export async function recognizeImage(
  file: File,
  onProgress?: ProgressHandler,
): Promise<OcrResult> {
  if (isNativeOcr()) {
    return { text: await recognizeWithMlKit(file), provider: 'mlkit' }
  }
  return { text: await recognizeWithTesseract(file, onProgress), provider: 'tesseract' }
}

async function recognizeWithMlKit(file: File): Promise<string> {
  const [{ TextRecognition, Script }, { Filesystem, Directory }] = await Promise.all([
    import('@capacitor-mlkit/text-recognition'),
    import('@capacitor/filesystem'),
  ])

  const dataUrl = await readAsDataUrl(file)
  const base64 = dataUrl.split(',')[1] ?? ''
  const path = `ocr-${Date.now()}.jpg`

  const { uri } = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  })

  try {
    const result = await TextRecognition.processImage({
      path: uri,
      script: Script.Chinese,
    })
    return result.text
  } finally {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined)
  }
}

async function recognizeWithTesseract(
  file: File,
  onProgress?: ProgressHandler,
): Promise<string> {
  progressHandler = onProgress
  const worker = await getWorker()
  const { data } = await worker.recognize(file)
  return data.text
}

/** worker 复用，避免每次识别都重新下载中文语言包 */
async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js')
    workerPromise = createWorker('chi_sim+eng', undefined, {
      logger: (message: { status: string; progress: number }) => {
        if (message.status === 'recognizing text') {
          progressHandler?.(Math.round(message.progress * 100))
        }
      },
    })
  }
  return workerPromise
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}
