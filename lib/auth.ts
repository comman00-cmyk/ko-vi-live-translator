import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { blocked: true } })
      if (dbUser?.blocked) return false // 차단된 계정 로그인 거부
      return true
    },
    session({ session, user }) {
      session.user.id = user.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.user.role = (user as any).role ?? 'user'
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
})
