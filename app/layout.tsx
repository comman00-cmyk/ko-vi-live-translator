import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import LoginButton from '@/components/LoginButton'
import Link from 'next/link'
import { LogoWordmark } from '@/components/Logo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KO-VI 실시간 통역',
  description: '한국어-베트남어 실시간 통역 서비스',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProvider>
          <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/">
                <LogoWordmark variant="A" />
              </Link>
              <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
                <Link href="/translate" className="hover:text-blue-600 transition-colors">통역</Link>
                <Link href="/records"   className="hover:text-blue-600 transition-colors">기록</Link>
                <Link href="/admin"     className="hover:text-blue-600 transition-colors">관리</Link>
              </nav>
              <LoginButton />
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
}
