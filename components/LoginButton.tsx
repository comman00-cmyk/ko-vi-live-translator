'use client'
import { signIn, signOut, useSession } from 'next-auth/react'
import { User } from 'lucide-react'
import Image from 'next/image'

export default function LoginButton() {
  const { data: session } = useSession()

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ''}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="text-sm text-gray-700 hidden sm:block">{session.user.name}</span>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
    >
      <User className="w-4 h-4" />
      Google 로그인
    </button>
  )
}
