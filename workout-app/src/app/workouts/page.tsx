import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function WorkoutPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    const workouts = await prisma.workout.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            date: "desc"
        }
    })
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">ワークアウト記録一覧</h1>
                <Link
                    href="/workouts/new"
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    新規記録
                </Link>
            </div>

            {workouts.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">まだワークアウトの記録がありません</p>
                    <Link
                        href="/workouts/new"
                        className="text-blue-600 hover:underline"
                    >
                        最初の記録を追加する
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {workouts.map((workout) => (
                        <Link
                            key={workout.id}
                            href={`/workouts/${workout.id}`}
                            className="block rounded-lg border p-4 hover:bg-gray-50"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">{workout.exerciseName}</h3>
                                    <p className="text-sm text-gray-600">
                                        {new Date(workout.date).toLocaleDateString('ja-JP')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg">
                                        {workout.sets} セット × {workout.reps} 回
                                    </p>
                                    {workout.weight && (
                                        <p className="text-sm text-gray-600">{workout.weight} kg</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}