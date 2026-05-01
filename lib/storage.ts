import { put } from '@vercel/blob'

export async function uploadRecording(file: Blob | File, fileName: string) {
  return put(`recordings/${fileName}`, file, {
    access: 'public',
    contentType: (file as File).type || 'audio/webm',
  })
}
