import type { Phone } from '@/types'

/** Эталон из tg-bot (1080×1920). */
const REF_W = 1080
const REF_H = 1920

const REF_SWIPE_UP = { x0: 540, y0: 1650, x1: 540, y1: 450 }
const REF_SWIPE_DOWN = { x0: 540, y0: 450, x1: 540, y1: 1650 }
const REF_SWIPE_LEFT = { x0: 900, y0: 960, x1: 180, y1: 960 }
const REF_SWIPE_RIGHT = { x0: 180, y0: 960, x1: 900, y1: 960 }
const REF_TAP = { x: 540, y: 960 }

export type FeedGestureKind = 'swipeUp' | 'swipeDown' | 'swipeLeft' | 'swipeRight' | 'tap'

export const REF_SCREEN = { width: REF_W, height: REF_H }
export const DEFAULT_TAP_REF = REF_TAP

export interface ScreenSize {
  width: number
  height: number
}

function portraitSize(phone?: Pick<Phone, 'screen_res_x' | 'screen_res_y'>): ScreenSize | null {
  const rawW = phone?.screen_res_x ?? 0
  const rawH = phone?.screen_res_y ?? 0
  if (rawW <= 0 || rawH <= 0) return null
  return {
    width: Math.min(rawW, rawH),
    height: Math.max(rawW, rawH),
  }
}

export function resolveScreenSize(
  phone: Pick<Phone, 'serial' | 'screen_res_x' | 'screen_res_y'>,
  cached?: ScreenSize | null,
): ScreenSize {
  return portraitSize(phone) ?? cached ?? { width: REF_W, height: REF_H }
}

function scaleCoord(value: number, ref: number, size: number): number {
  return Math.max(1, Math.min(size - 1, Math.round(value * (size / ref))))
}

export function feedGestureBody(
  kind: FeedGestureKind,
  size: ScreenSize,
): { x0: number; y0: number; x1: number; y1: number } | { x: number; y: number } {
  if (kind === 'tap') {
    return {
      x: scaleCoord(REF_TAP.x, REF_W, size.width),
      y: scaleCoord(REF_TAP.y, REF_H, size.height),
    }
  }

  const ref =
    kind === 'swipeUp'
      ? REF_SWIPE_UP
      : kind === 'swipeDown'
        ? REF_SWIPE_DOWN
        : kind === 'swipeLeft'
          ? REF_SWIPE_LEFT
          : REF_SWIPE_RIGHT
  return {
    x0: scaleCoord(ref.x0, REF_W, size.width),
    y0: scaleCoord(ref.y0, REF_H, size.height),
    x1: scaleCoord(ref.x1, REF_W, size.width),
    y1: scaleCoord(ref.y1, REF_H, size.height),
  }
}

export function customTapBody(
  refX: number,
  refY: number,
  size: ScreenSize,
): { x: number; y: number } {
  return {
    x: scaleCoord(refX, REF_W, size.width),
    y: scaleCoord(refY, REF_H, size.height),
  }
}

export function feedGestureLabel(kind: FeedGestureKind, size: ScreenSize): string {
  const body = feedGestureBody(kind, size)
  if ('x' in body) {
    return `(${body.x},${body.y})`
  }
  return `(${body.x0},${body.y0})→(${body.x1},${body.y1})`
}
