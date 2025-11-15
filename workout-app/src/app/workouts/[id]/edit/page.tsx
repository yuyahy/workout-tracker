import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'

export default async function EditWorkoutPage({
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
        redirect("/workouts")
    }

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">ワークアウト編集</h1>
            <EditForm workout={workout} />
        </div>
    )
}