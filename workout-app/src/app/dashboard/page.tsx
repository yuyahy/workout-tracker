import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    const workoutCount = await prisma.workout.count({
        where: { userId: session.user.id },
    })

    const recentWorkouts = await prisma.workout.findMany({
        where: { userId: session.user.id },
        orderBy: { date: 'desc' },
        take: 5,
    })

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="rounded-lg border p-6">
                    <h3 className="text-sm font-medium text-gray-600">総ワークアウト数</h3>
                    <p className="mt-2 text-3xl font-bold">{workoutCount}</p>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">最近の記録</h2>
                    <Link href="/workouts" className="text-blue-600 hover:underline">
                        すべて見る
                    </Link>
                </div>

                {recentWorkouts.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                        <p className="text-gray-500 mb-4">まだワークアウトの記録がありません</p>
                        <Link
                            href="/workouts/new"
                            className="text-blue-600 hover:underline"
                        >
                            最初の記録を追加する
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentWorkouts.map((workout) => (
                            <Link
                                key={workout.id}
                                href={`/workouts/${workout.id}`}
                                className="block rounded-lg border p-4 hover:bg-gray-50"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">{workout.exerciseName}</h3>
                                        <p className="text-sm text-gray-600">
                                            {new Date(workout.date).toLocaleDateString('ja-JP')}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p>{workout.sets} × {workout.reps}</p>
                                        {workout.weight && <p className="text-gray-600">{workout.weight} kg</p>}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}