import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, direction } = await req.json() as { text: string; direction: 'ko-vi' | 'vi-ko' }
  if (!text?.trim()) return NextResponse.json({ translation: '' })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-4.1-mini'

  const [from, to] = direction === 'ko-vi' ? ['한국어', '베트남어'] : ['베트남어', '한국어']

  const res = await openai.chat.completions.create({
    model,
    messages: [{
      role: 'user',
      content: `다음 ${from} 텍스트를 ${to}로 번역하라. 번역문만 출력하고 설명은 하지 마라.\n\n${text}`,
    }],
    max_tokens: 1000,
    temperature: 0.1,
  })

  return NextResponse.json({ translation: res.choices[0].message.content ?? '' })
}
