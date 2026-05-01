import OpenAI from 'openai'

const SUMMARY_PROMPT = `아래는 한국어-베트남어 통역 세션의 내용이다.
포멀한 한국어 비즈니스 보고 톤으로 아래 형식의 보고용 요약을 작성하라.
대화에 없는 내용은 절대 추가하지 말고, 불확실한 내용은 "확인 필요"로 표시하라.

=== 원문 ===
{{ORIGINAL}}

=== 번역문 ===
{{TRANSLATED}}

=== 요약 형식 (아래 항목을 그대로 사용) ===
1. 회의/대화 개요
2. 주요 논의사항
3. 결정사항
4. 이슈 및 리스크
5. 후속 조치사항
6. 담당자/기한 (대화에서 확인 가능한 경우만, 없으면 "해당 없음")
7. 경영진 보고용 5줄 요약`

export async function generateSummary(original: string, translated: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-4.1-mini'
  const prompt = SUMMARY_PROMPT
    .replace('{{ORIGINAL}}', original)
    .replace('{{TRANSLATED}}', translated)

  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.3,
  })

  return res.choices[0].message.content ?? ''
}
