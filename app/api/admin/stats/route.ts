import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [sessionCount, recordingCount, recentErrors, totalUsers] = await Promise.all([
    prisma.translationSession.count({ where: { createdAt: { gte: today } } }),
    prisma.recording.count({ where: { createdAt: { gte: today } } }),
    prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.user.count(),
  ])

  return NextResponse.json({ sessionCount, recordingCount, recentErrors, totalUsers })
}
