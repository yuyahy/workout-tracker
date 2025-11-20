'use client'

import { useEffect, useState } from 'react'

interface DynamoDBStats {
    exerciseName: string,
    totalWorkouts: number,
    totalSets: number,
    totalReps: number,
    totalVolume: number,
    maxWeight: number,
    lastWorkoutDate: string
}

export default function DynamoDBStatsPage() {
    const [stats, setStats] = useState<DynamoDBStats[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/stats/dynamodb")
                if (res.ok) {
                    const data = await res.json()
                    setStats(data.stats)
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

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">DynamoDB統計</h1>

            {stats.length === 0 ? (
                <p className="text-gray-600">統計データがありません</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.exerciseName} className="rounded-lg border p-6">
                            <h3 className="font-bold text-xl mb-4">{stat.exerciseName}</h3>

                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-sm text-gray-600">実施回数</dt>
                                    <dd className="text-2xl font-bold">{stat.totalWorkouts}</dd>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <dt className="text-gray-600">総セット数</dt>
                                        <dd className="font-medium">{stat.totalSets}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-600">総回数</dt>
                                        <dd className="font-medium">{stat.totalReps}</dd>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <dt className="text-gray-600">総ボリューム</dt>
                                        <dd className="font-medium">{stat.totalVolume.toFixed(0)}</dd>
                                    </div>
                                    {stat.maxWeight > 0 && (
                                        <div>
                                            <dt className="text-gray-600">最大重量</dt>
                                            <dd className="font-medium">{stat.maxWeight} kg</dd>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 text-sm">
                                    <dt className="text-gray-600">最終実施日</dt>
                                    <dd>
                                        {new Date(stat.lastWorkoutDate).toLocaleDateString('ja-JP')}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}