import type { Language } from '../../shared/settings'

// Bildirishnoma matnlari (main process renderer'ning i18n'idan foydalana olmaydi)
const TEXT: Record<
  Language,
  { soonTitle: string; soonBody: string; expTitle: string; expBody: string }
> = {
  uz: {
    soonTitle: 'Muddati yaqin',
    soonBody: '{name}: {days} kundan keyin muddati tugaydi.',
    expTitle: "Muddati o'tgan",
    expBody: "{name}: muddati o'tgan. Ishlatishni to'xtatish tavsiya etiladi."
  },
  ko: {
    soonTitle: '사용 기한 임박',
    soonBody: '{name}: {days}일 후 사용 기한이 끝납니다.',
    expTitle: '사용 기한 만료',
    expBody: '{name}: 사용 기한이 지났습니다. 사용을 중단하는 것을 권장합니다.'
  },
  en: {
    soonTitle: 'Expiring soon',
    soonBody: '{name} expires in {days} days.',
    expTitle: 'Expired',
    expBody: '{name} has expired. Consider not using it anymore.'
  }
}

export function reminderText(
  lang: Language,
  kind: 'soon' | 'expired',
  name: string,
  days: number
): { title: string; body: string } {
  const t = TEXT[lang]
  const fill = (s: string): string =>
    s.replaceAll('{name}', name).replaceAll('{days}', String(days))
  return kind === 'soon'
    ? { title: t.soonTitle, body: fill(t.soonBody) }
    : { title: t.expTitle, body: fill(t.expBody) }
}
