import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email))
    throw new Error('Forbidden')
  return session
}

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      blocked: true, blockedAt: true,
      lastLoginAt: true, createdAt: true,
      _count: { select: { translationSessions: true } },
    },
  })
  return NextResponse.json(users)
}

// PATCH — 차단/해제, 역할 변경
export async function PATCH(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { id, action, role } = await req.json() as { id: string; action?: string; role?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let data: Record<string, unknown> = {}

  if (action === 'block')   data = { blocked: true,  blockedAt: new Date() }
  if (action === 'unblock') data = { blocked: false, blockedAt: null }
  if (role)                 data = { ...data, role }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}

// DELETE — 사용자 삭제 (세션·기록 cascade)
export async function DELETE(req: NextRequest) {
  const adminSession = await auth()
  if (!adminSession?.user?.email || !isAdminEmail(adminSession.user.email))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // 관리자 자신은 삭제 불가
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } })
  if (target?.email === adminSession.user.email)
    return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
