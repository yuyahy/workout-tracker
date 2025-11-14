import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StatsClient } from "./stats-client"

async function getStats(userId: string) {
    // 内部APIを直接呼び出すのではなく、Prismaを使用
    // 実際のAPI呼び出しをはクライアント側で行う
    return null
}

export default async function StatsPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">統計情報</h1>
            <StatsClient />
        </div>
    )
}