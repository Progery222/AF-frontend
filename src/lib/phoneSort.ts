import type { Phone } from '@/types'

const SANDBOX_SERIALS = new Set(['stub'])

/** Тестовые/заглушечные serial — не показываем в UI. */
export function isSandboxPhone(phone: Pick<Phone, 'serial'>): boolean {
  const { serial } = phone
  return (
    SANDBOX_SERIALS.has(serial) ||
    serial.startsWith('TEST-PHONE-') ||
    serial.startsWith('docker-test')
  )
}

export function filterProductionPhones(phones: Phone[]): Phone[] {
  return phones.filter((p) => !isSandboxPhone(p))
}

/** null первыми, затем stand_seq_number по возрастанию, затем serial. */
export function comparePhonesByStandSeq(a: Phone, b: Phone): number {
  const aNum = a.stand_seq_number
  const bNum = b.stand_seq_number
  const aNull = aNum == null
  const bNull = bNum == null

  if (aNull && bNull) return a.serial.localeCompare(b.serial)
  if (aNull) return -1
  if (bNull) return 1
  if (aNum !== bNum) return aNum - bNum
  return a.serial.localeCompare(b.serial)
}

export function sortPhonesByStandSeq(phones: Phone[]): Phone[] {
  return [...phones].sort(comparePhonesByStandSeq)
}

/** Частичное совпадение по цифрам stand_seq_number (пустой запрос — без фильтра). */
export function filterPhonesByStandSeqQuery(phones: Phone[], query: string): Phone[] {
  const q = query.trim()
  if (!q) return phones
  return phones.filter(
    (p) => p.stand_seq_number != null && String(p.stand_seq_number).includes(q),
  )
}
