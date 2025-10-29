import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await auth()

    // 未認証だった場合はログインページへリダイレクト
    if (!session) {
        redirect("/login")
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">ダッシュボード</h1>
            <p className="mt-4">ようこそ、{session.user.name}さん！</p>
        </div>
    )
}