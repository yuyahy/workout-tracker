import { auth, signOut } from "@/lib/auth"
import Link from "next/link"

// Server Componentとしてナビゲーションバーを実装
export async function Navbar() {
    const session = await auth()

    if (!session) {
        return null
    }

    return (
        <nav className="border-b">
            <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
                <div className="flex gap-6">
                    <Link href="/dashboard" className="font-bold text-xl">
                        ワークアウトトラッカー
                    </Link>
                    <Link href="/workouts" className="text-gray-600 hover:text-gray-900">
                        記録一覧
                    </Link>
                    <Link href="/workouts/new" className="text-gray-600 hover:text-gray-900">
                        新規記録
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{session.user.name}</span>
                    <form
                        action={async () => {
                            'use server'
                            await signOut({ redirectTo: '/' })
                        }}
                    >
                        <button
                            type="submit"
                            className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
                        >
                            ログアウト
                        </button>
                    </form>
                </div>
            </div>
        </nav>
    )
}