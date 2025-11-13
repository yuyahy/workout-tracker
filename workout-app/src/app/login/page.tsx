import { signInAction } from "@/app/actions/auth"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
                <h2 className="text-center text-3xl font-bold">ログイン</h2>

                <form action={signInAction} className="space-y-6">
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
                        ログイン
                    </button>
                </form>

                <p className="text-center text-sm">
                    アカウントをお持ちでないですか？{' '}
                    <a href="/signup" className="text-blue-600 hover:underline">
                        新規登録
                    </a>
                </p>
            </div>
        </div>
    )
}