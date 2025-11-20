"use client"

import { useEffect, useState } from "react"

interface Stats {
    totalWorkouts: number
    statsByExercise: Array<{
        exerciseName: string
        totalWorkouts: number
        totalSets: number
        totalReps: number
        maxWeight: number
    }>
}

export function StatsClient() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/stats")
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    if (loading) {
        return <div>読み込み中...</div>
    }

    if (!stats) {
        return <div>統計情報を取得できませんでした</div>
    }

    return (
        <div className="space-y-8">
            <div className="rounded-lg border p-6">
                <h2 className="text-xl font-bold mb-4">全体統計</h2>
                <div className="text-4xl font-bold text-blue-600">
                    {stats.totalWorkouts}
                </div>
                <p className="text-gray-600">総ワークアウト数</p>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">種目別統計</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stats.statsByExercise.map((stat) => (
                        <div key={stat.exerciseName} className="rounded-lg border p-4">
                            <h3 className="font-bold text-lg mb-2">{stat.exerciseName}</h3>
                            <dl className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-600">実施回数:</dt>
                                    <dd className="font-medium">{stat.totalWorkouts}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-600">総セット数:</dt>
                                    <dd className="font-medium">{stat.totalSets}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-600">総回数:</dt>
                                    <dd className="font-medium">{stat.totalReps}</dd>
                                </div>
                                {stat.maxWeight > 0 && (
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">最大重量:</dt>
                                        <dd className="font-medium">{stat.maxWeight} kg</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}