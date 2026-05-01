import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

async function guard() {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null
  return session
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const settings = await prisma.appSetting.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  return NextResponse.json(setting)
}
