const NUMBERED = /^\s*(\d+)\s*[.)]/

export const QUESTIONS_PER_CHUNK = 25
export const CHARS_PER_CHUNK = 8000

/** Ile pytań widać w tekście — do porównania z tym, co zwróci Claude (PLAN 6.6). */
export function detectQuestionCount(text: string): number {
  let count = 0
  let last = 0
  for (const line of text.split('\n')) {
    const m = line.match(NUMBERED)
    if (!m) continue
    const n = Number(m[1])
    if (n > last) {
      count++
      last = n
    }
  }
  return count
}

/** Numeracja → tnij co 25 pytań; bez numeracji → co ~8000 znaków, zawsze na pustej linii. */
export function chunkText(text: string, perChunk = QUESTIONS_PER_CHUNK): string[] {
  const lines = text.split('\n')
  const numbered = detectQuestionCount(text)
  if (numbered >= 5) {
    const chunks: string[] = []
    let current: string[] = []
    let seen = 0
    let last = 0
    for (const line of lines) {
      const m = line.match(NUMBERED)
      const isStart = m !== null && Number(m[1]) > last
      if (isStart) {
        if (seen > 0 && seen % perChunk === 0) {
          chunks.push(current.join('\n').trim())
          current = []
        }
        seen++
        last = Number(m![1])
      }
      current.push(line)
    }
    if (current.join('').trim()) chunks.push(current.join('\n').trim())
    return chunks.filter(Boolean)
  }

  const chunks: string[] = []
  let current: string[] = []
  let size = 0
  for (const para of text.split(/\n\s*\n/)) {
    if (size > 0 && size + para.length > CHARS_PER_CHUNK) {
      chunks.push(current.join('\n\n').trim())
      current = []
      size = 0
    }
    current.push(para)
    size += para.length + 2
  }
  if (current.join('').trim()) chunks.push(current.join('\n\n').trim())
  return chunks.filter(Boolean)
}
