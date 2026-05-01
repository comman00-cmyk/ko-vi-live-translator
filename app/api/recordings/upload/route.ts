import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadRecording } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const sessionId = form.get('sessionId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileName = `${session.user.id}-${Date.now()}.webm`

  try {
    const blob = await uploadRecording(file, fileName)

    if (sessionId) {
      await prisma.recording.create({
        data: {
          sessionId,
          userId:    session.user.id,
          fileName,
          fileUrl:   blob.url,
          mimeType:  file.type || 'audio/webm',
          sizeBytes: file.size,
        },
      })
    }

    return NextResponse.json({ url: blob.url, fileName })
  } catch (err) {
    console.error('[recordings/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
