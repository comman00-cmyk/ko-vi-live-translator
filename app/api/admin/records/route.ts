import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const records = await prisma.translationSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, direction: true, originalText: true, createdAt: true,
      user: { select: { email: true } },
    },
  })

  return NextResponse.json(records)
}
