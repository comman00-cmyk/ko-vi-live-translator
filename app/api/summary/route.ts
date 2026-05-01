import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateSummary } from '@/lib/summary'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { original, translated } = await req.json()
  if (!original) {
    return NextResponse.json({ error: 'original is required' }, { status: 400 })
  }

  try {
    const summary = await generateSummary(original, translated ?? '')
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[summary]', err)
    await prisma.errorLog.create({
      data: {
        userId: session.user.id,
        message: String(err),
        stack: err instanceof Error ? err.stack ?? null : null,
      },
    }).catch(() => {})
    return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 })
  }
}
