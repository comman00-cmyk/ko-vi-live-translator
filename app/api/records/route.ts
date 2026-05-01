import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const records = await prisma.translationSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { recordings: true },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const record = await prisma.translationSession.create({
    data: {
      userId:        session.user.id,
      direction:     body.direction ?? 'auto',
      originalText:  body.originalText ?? '',
      translatedText: body.translatedText ?? '',
      summaryText:   body.summaryText ?? null,
      startedAt:     new Date(body.startedAt ?? Date.now()),
      endedAt:       body.endedAt ? new Date(body.endedAt) : new Date(),
      latencyMs:     body.latencyMs ?? null,
      status:        'completed',
    },
  })

  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()

  const record = await prisma.translationSession.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.translationSession.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
