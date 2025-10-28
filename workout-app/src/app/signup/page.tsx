'use client'

// Client Component
// useStateを使用し、登録メールアドレスの長福寺に再レンダリングさせるため

import { signUp } from "@/app/actions/auth"
import { useRouter } from "next/navigation"
import { useState } from "react"


export default function SignUpPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        const result = await signUp(formData)

        if (result.error) {
            setError(result.error)
        } else {
            router.push("/login")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
                <h2 className="text-center text-3xl font-bold">アカウント作成</h2>

                {error && (
                    <div className="rounded bg-red-50 p-3 text-red-500">
                        {error}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium">
                            名前
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium">
                            メールアドレス
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium">
                            パスワード
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        登録
                    </button>
                </form>

                <p className="text-center text-sm">
                    アカウントをお持ちですか？{' '}
                    <a href="/login" className="text-blue-600 hover:underline">
                        ログイン
                    </a>
                </p>
            </div>
        </div>
    )
}