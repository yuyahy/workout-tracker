import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from './delete-button'

export default async function WorkoutDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    const { id } = await params

    const workout = await prisma.workout.findUnique({
        where: { id },
    })

    if (!workout) {
        notFound()
    }

    if (workout.userId !== session.user.id) {
        redirect("/workouts")
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-8">
                <Link href="/workouts" className="text-blue-600 hover:underline">
                    ← 一覧に戻る
                </Link>
            </div>

            <div className="rounded-lg border p-6">
                <h1 className="text-3xl font-bold mb-6">{workout.exerciseName}</h1>

                <dl className="space-y-4">
                    <div>
                        <dt className="text-sm font-medium text-gray-600">日付</dt>
                        <dd className="mt-1 text-lg">
                            {new Date(workout.date).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </dd>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-gray-600">セット数</dt>
                            <dd className="mt-1 text-2xl font-bold">{workout.sets}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-600">回数</dt>
                            <dd className="mt-1 text-2xl font-bold">{workout.reps}</dd>
                        </div>
                        {workout.weight && (
                            <div>
                                <dt className="text-sm font-medium text-gray-600">重量</dt>
                                <dd className="mt-1 text-2xl font-bold">{workout.weight} kg</dd>
                            </div>
                        )}
                    </div>

                    {workout.notes && (
                        <div>
                            <dt className="text-sm font-medium text-gray-600">メモ</dt>
                            <dd className="mt-1 whitespace-pre-wrap">{workout.notes}</dd>
                        </div>
                    )}
                </dl>

                <div className="mt-8 flex gap-4">
                    <Link
                        href={`/workouts/${workout.id}/edit`}
                        className="flex-1 rounded-md border border-blue-600 px-4 py-2 text-center text-blue-600 hover:bg-blue-50"
                    >
                        編集
                    </Link>
                    <DeleteButton id={workout.id} />
                </div>
            </div>
        </div>
    )
}