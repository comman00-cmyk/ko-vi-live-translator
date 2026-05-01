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
  const items = await prisma.glossary.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { korean, vietnamese, english, description } = await req.json()
  if (!korean || !vietnamese) {
    return NextResponse.json({ error: 'korean, vietnamese are required' }, { status: 400 })
  }
  const item = await prisma.glossary.create({ data: { korean, vietnamese, english, description } })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  await prisma.glossary.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
