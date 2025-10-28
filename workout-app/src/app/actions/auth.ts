'use server'

// ユーザー登録のSever Action
// 専用のAPIエンドポイントを作らなくても、クライアントからサーバ上の処理を直接呼び出せる

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signUpSchema = z.object({
    email: z.email("有効なメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上である必要があります"),
    name: z.string().min(1, "名前を入力してください"),
})

export async function signUp(formData: FormData) {
    const validateFields = signUpSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        name: formData.get("name"),
    })

    if (!validateFields.success) {
        return {
            error: validateFields.error.message,
        }
    }

    const { email, password, name } = validateFields.data

    // 既存ユーザーかをチェック
    const existingUser = await prisma.user.findUnique({
        where: { email },
    })

    if (existingUser) {
        return {
            error: "このメールアドレスはすでに登録されています"
        }
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // ユーザー作成
    await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    })

    return {
        success: true,
    }
}