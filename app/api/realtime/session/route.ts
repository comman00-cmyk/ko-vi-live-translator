import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createRealtimeSession } from '@/lib/realtime'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const realtimeSession = await createRealtimeSession()
    return NextResponse.json(realtimeSession)
  } catch (err) {
    console.error('[realtime/session]', err)
    await prisma.errorLog.create({
      data: {
        userId: session.user.id,
        message: String(err),
        stack: err instanceof Error ? err.stack ?? null : null,
      },
    }).catch(() => {})
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }
}
