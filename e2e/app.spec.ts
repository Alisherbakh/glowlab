import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page
} from '@playwright/test'

// GlowLab E2E: toza (yangi) bazada ilovani ochib, asosiy oqimlarni bosib chiqadi.
// Haqiqiy foydalanuvchi bazasi va .env kaliti ishlatilmaydi (GLOWLAB_E2E_USER_DATA).

let app: ElectronApplication
let page: Page
let userData: string
const problems: string[] = [] // Konsol xatolari va ushlanmagan istisnolar

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  userData = mkdtempSync(join(tmpdir(), 'glowlab-e2e-'))
  const env = { ...process.env, GLOWLAB_E2E_USER_DATA: userData } as Record<string, string>
  delete env.GEMINI_API_KEY // Testlar Google'ga hech narsa yubormaydi
  delete env.ELECTRON_RENDERER_URL // Build qilingan fayllar ochiladi (dev server emas)
  app = await electron.launch({
    args: ['.', ...(process.platform === 'linux' ? ['--no-sandbox'] : [])],
    env
  })
  page = await app.firstWindow()
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app?.close()
  rmSync(userData, { recursive: true, force: true })
})

// Har bir testdan keyin: yangi konsol xatosi bo'lmasligi kerak
test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([])
})

async function go(label: string): Promise<void> {
  await page.getByRole('navigation').getByText(label, { exact: true }).click()
  await expect(page.locator('header h6')).toHaveText(label) // Yuqori paneldagi sahifa nomi
}

test('birinchi ishga tushish: onboarding → bosh sahifa', async () => {
  await expect(page.getByText("Yosh oralig'ingiz qanday?")).toBeVisible({ timeout: 20_000 })
  await page.getByText('25-34', { exact: true }).click()
  await page.getByRole('button', { name: 'Keyingi' }).click()
  await page.getByText('Quruq', { exact: true }).click()
  await page.getByRole('button', { name: 'Keyingi' }).click()
  await page.getByRole('button', { name: 'Saqlash va boshlash' }).click()
  await expect(page.getByRole('navigation').getByText('Bosh sahifa', { exact: true })).toBeVisible()
})

test('barcha sahifalar xatosiz ochiladi', async () => {
  for (const label of [
    'Bosh sahifa',
    'Mening javonim',
    'Yuz skani',
    'Tartib',
    'Kundalik',
    "GlowLab'dan so'rang",
    'AI Lab',
    'Sozlamalar'
  ]) {
    await go(label)
  }
})

async function addProduct(name: string, category: string): Promise<void> {
  await go('Mening javonim')
  await page.getByRole('button', { name: "Mahsulot qo'shish" }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nomi').fill(name)
  await dialog.getByLabel('Kategoriya').click()
  await page.getByRole('option', { name: category }).click()
  await dialog.getByRole('button', { name: 'Saqlash' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
}

test("javon: mahsulot qo'shish", async () => {
  await addProduct('Retinol night serum', 'Zardob (serum)')
  await addProduct('Daily fluid SPF 50', 'Quyoshdan himoya')
})

test("tartib + moslik tekshiruvi: retinoid ertalab → ogohlantirish, kechqurun → yo'q", async () => {
  await go('Tartib')
  const add = page.getByLabel("Mahsulot qo'shish")
  await add.first().click() // Ertalab
  await page.getByRole('option', { name: 'Retinol night serum' }).click()
  await expect(page.getByText('Ertalabki tartibda retinoid')).toBeVisible()
  await expect(page.getByText("Ertalab quyoshdan himoya kremi yo'q")).toBeVisible()
  await expect(page.getByText('nomidan aniqlandi').first()).toBeVisible()

  // Ertalabdan olib tashlab, kechqurunga qo'shamiz; ertalabga SPF
  await page.getByRole('button', { name: 'Tartibdan olib tashlash' }).first().click()
  await add.nth(1).click() // Kechqurun
  await page.getByRole('option', { name: 'Retinol night serum' }).click()
  await add.first().click()
  await page.getByRole('option', { name: 'Daily fluid SPF 50' }).click()
  await expect(page.getByText('Ertalabki tartibda retinoid')).toBeHidden()
  await expect(page.getByText("Ertalab quyoshdan himoya kremi yo'q")).toBeHidden()
  await expect(page.getByText('Tarkibi skan qilinmagan', { exact: true })).toBeVisible() // Label scan qilinmagan → ma'lumot
})

test("so'rang: kalitsiz → oflayn qidiruv natijalari", async () => {
  await go("GlowLab'dan so'rang")
  await expect(page.getByText('Oflayn qidiruv', { exact: true })).toBeVisible()
  const input = page.getByLabel('Savolingiz')
  await input.fill('sunscreen')
  await input.press('Enter')
  await expect(page.getByRole('heading', { name: 'Mos parchalar' })).toBeVisible()
  await expect(page.getByText('Choosing and applying sunscreen')).toBeVisible()
  await input.fill('zzzz qqqq')
  await input.press('Enter')
  await expect(page.getByText('Mos parcha topilmadi', { exact: false })).toBeVisible()
})

test("AI Lab: haqiqiy model ko'rsatkichlari", async () => {
  await go('AI Lab')
  await expect(page.getByText('97.8%')).toBeVisible()
  await expect(page.getByText('319', { exact: true })).toBeVisible()
  await expect(page.locator('table td')).toHaveCount(36) // 6×6 confusion matrix
  await expect(page.getByText("Eng ko'p uchragan xato", { exact: false })).toBeVisible()
})

test("skrinshotlar (yorug' va qorong'i mavzu)", async () => {
  const shot = async (name: string): Promise<Buffer> => {
    await page.mouse.move(0, 0) // Hover holati rasmga tushmasin
    await page.waitForTimeout(700) // Bosish (ripple) animatsiyasi tugashini kutamiz
    return page.screenshot({ path: `e2e-results/screens/${name}.png`, fullPage: true })
  }
  for (const [label, name] of [
    ['Mening javonim', 'shelf'],
    ['Tartib', 'routine'],
    ["GlowLab'dan so'rang", 'ask'],
    ['AI Lab', 'ai-lab']
  ]) {
    await go(label)
    await shot(`${name}-light`)
  }
  await page.getByRole('button', { name: 'Mavzuni almashtirish' }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', /rgb\((\d|[1-5]\d), /) // Qorong'i fon
  await shot('ai-lab-dark')
  await go('Tartib')
  await shot('routine-dark')
})
