import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

export default async function AdminGuard({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect('/')
  }
  return <>{children}</>
}
