import type { SkinType } from '../../../shared/profile'

// Oddiy teri turi testi: har bir javob bitta teri turiga "ovoz" beradi
// Bu tibbiy test emas — faqat yo'naltiruvchi (foydalanuvchi keyin o'zgartira oladi)

export type BaseType = 'dry' | 'oily' | 'combination' | 'normal'

export type QuizQuestion = {
  id: 'feel' | 'midday' | 'pores' | 'reaction'
  options: { id: string; votes: BaseType | 'sensitive' | null }[]
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'feel', // Yuvgandan bir necha soat keyin (mahsulotsiz) teri qanday sezadi
    options: [
      { id: 'tight', votes: 'dry' },
      { id: 'shinyAll', votes: 'oily' },
      { id: 'shinyTzone', votes: 'combination' },
      { id: 'comfortable', votes: 'normal' }
    ]
  },
  {
    id: 'midday', // Tushga kelib yuz qanday ko'rinadi
    options: [
      { id: 'flaky', votes: 'dry' },
      { id: 'shinyAll', votes: 'oily' },
      { id: 'shinyTzone', votes: 'combination' },
      { id: 'fresh', votes: 'normal' }
    ]
  },
  {
    id: 'pores', // G'ovaklar (pores)
    options: [
      { id: 'barely', votes: 'dry' },
      { id: 'largeAll', votes: 'oily' },
      { id: 'largeNose', votes: 'combination' },
      { id: 'small', votes: 'normal' }
    ]
  },
  {
    id: 'reaction', // Yangi mahsulotdan qizarish/achishish
    options: [
      { id: 'often', votes: 'sensitive' },
      { id: 'sometimes', votes: null },
      { id: 'rarely', votes: null }
    ]
  }
]

// Javoblar (savol id → variant id) bo'yicha teri turini hisoblaydi
export function scoreQuiz(answers: Record<string, string>): SkinType {
  const counts: Record<BaseType, number> = { dry: 0, oily: 0, combination: 0, normal: 0 }
  let sensitive = false

  for (const question of QUIZ) {
    const option = question.options.find((o) => o.id === answers[question.id])
    if (!option?.votes) continue // Javob yo'q yoki ovozsiz variant
    if (option.votes === 'sensitive') sensitive = true
    else counts[option.votes] += 1
  }

  if (sensitive) return 'sensitive' // Tez-tez reaksiya → sezgir teri ustun turadi

  // Eng ko'p ovoz; teng bo'lsa tartib bo'yicha: combination > oily > dry > normal
  const order: BaseType[] = ['combination', 'oily', 'dry', 'normal']
  return order.reduce((best, type) => (counts[type] > counts[best] ? type : best), order[0])
}

// Barcha savollarga javob berilganmi
export function isQuizComplete(answers: Record<string, string>): boolean {
  return QUIZ.every((q) => Boolean(answers[q.id]))
}
