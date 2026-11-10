// GlowLab dizayn tokenlari — "Botanical" yo'nalishi (Alisher tanlagan, 2026-11-10).
// Shalfey-yashil qog'oz fon, o'rmon yashili matn, barg-yashil aksent; sarlavhalar Newsreader (serif), matn Figtree.
// Kontrast tekshirilgan: matn ≥ 4.2:1, grafik rangi dataviz validator'dan o'tgan (yorug' va qorong'i).

export type ModeTokens = {
  primary: string // Asosiy aksent: tugmalar, faol menyu, grafik chizig'i
  onPrimary: string // Asosiy aksent ustidagi matn
  secondary: string // Ikkinchi darajali aksent (evkalipt)
  ok: string // Muddat yaxshi / xavf past
  soon: string // Muddati yaqin / o'rta xavf
  danger: string // Muddati o'tgan / yuqori xavf
  background: string
  surface: string
  text: string
  textMuted: string
  border: string
  navSelected: string
  navSelectedText: string
}

export const light: ModeTokens = {
  primary: '#4F7A3A', // Barg yashili (oq matn bilan 5.0:1)
  onPrimary: '#FFFFFF',
  secondary: '#5F7F78',
  ok: '#2E7D5B',
  soon: '#A86A12',
  danger: '#B4442F',
  background: '#EEF1E8', // Shalfey qog'oz
  surface: '#F8F9F4',
  text: '#22352B', // O'rmon yashili
  textMuted: '#5E6E62',
  border: '#D3DACB',
  navSelected: '#DDE8D2',
  navSelectedText: '#2F5222'
}

export const dark: ModeTokens = {
  primary: '#6FA545', // Qorong'i fonda ochroq barg (validator: band + chroma PASS)
  onPrimary: '#13200C',
  secondary: '#8FB0A8',
  ok: '#5DB38A',
  soon: '#E0A94F',
  danger: '#E07A62',
  background: '#141B16', // Tungi o'rmon
  surface: '#1C251F',
  text: '#E5EADF',
  textMuted: '#A3B0A5',
  border: '#2D3A31',
  navSelected: '#27382B',
  navSelectedText: '#C6E0B0'
}

export const fonts = {
  body: "'Figtree Variable', system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif", // Koreyscha uchun Apple SD Gothic Neo
  heading: "'Newsreader Variable', Georgia, 'Apple SD Gothic Neo', serif"
}

export const radius = 10 // Kartalar va tugmalar burchagi (px)
