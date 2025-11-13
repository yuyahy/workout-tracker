'use client'

import { useSearchParams } from 'next/navigation'

export default function LoginError() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const errorMessage = error === 'CredentialsSignin'
        ? 'メールアドレスまたはパスワードが間違っています'
        : '認証に失敗しました'

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
                <h2 className="text-center text-3xl font-bold">ログインエラー</h2>
                <div className="rounded bg-red-50 p-3 text-red-500">
                    {errorMessage}
                </div>
                <a href="/login" className="block text-center text-blue-600 hover:underline">
                    ログイン画面に戻る
                </a>
            </div>
        </div>
    )
}