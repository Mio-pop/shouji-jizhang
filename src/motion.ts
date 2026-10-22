export type ThemeName = 'simple' | 'fancy' | 'ledger'

const THEMES: ThemeName[] = ['simple', 'fancy', 'ledger']

function resolveTheme(): ThemeName {
  // 开发预览支持 ?theme=ledger / ?theme=fancy / ?theme=simple 实时切换
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('theme')
    if (fromQuery && (THEMES as string[]).includes(fromQuery)) return fromQuery as ThemeName
  }
  return import.meta.env.VITE_MOTION === 'fancy' ? 'fancy' : 'simple'
}

/** 当前主题：构建时由 VITE_MOTION 决定，开发时允许 URL 覆盖 */
export const MOTION: ThemeName = resolveTheme()

/** 非 simple 都启用动效层（fancy 与 ledger 使用同一套动效） */
export const isFancy = MOTION !== 'simple'
