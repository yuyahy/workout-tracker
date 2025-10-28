import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signInSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                // バリデーション
                const validatedFields = signInSchema.safeParse(credentials)

                if (!validatedFields.success) {
                    return null
                }

                const { email, password } = validatedFields.data

                // ユーザー検索
                const user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    return null
                }

                // パスワード検証
                const passwordMatch = await bcrypt.compare(password, user.password)

                if (!passwordMatch) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? undefined,
                }
            },
        })
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        // ログイン時 & リクエスト毎に実行
        // JWTにuserのidを追加
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        // セッション取得時に実行
        // JWTに含まれるuserのidをSessionに追加
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
            }
            return session
        },
    },
})