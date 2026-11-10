// Vite "?raw" importi: .sql faylni oddiy matn (string) sifatida olib keladi
declare module '*.sql?raw' {
  const content: string
  export default content
}
