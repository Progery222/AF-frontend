import type { Phone } from '@/types'

/** Высота / ширина в портретной ориентации (типично 2340/1080 ≈ 2.17). */
export const DEFAULT_PORTRAIT_ASPECT = 2340 / 1080

export function phonePortraitAspect(
  phone?: Pick<Phone, 'screen_res_x' | 'screen_res_y'>,
): number {
  const rawW = phone?.screen_res_x ?? 0
  const rawH = phone?.screen_res_y ?? 0
  if (rawW <= 0 || rawH <= 0) return DEFAULT_PORTRAIT_ASPECT

  const width = Math.min(rawW, rawH)
  const height = Math.max(rawW, rawH)
  return height / width
}

export function thumbWidthFromHeight(heightPx: number, aspect: number): number {
  return Math.max(1, Math.round(heightPx / aspect))
}
