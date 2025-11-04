'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const workoutSchema = z.object({
    date: z.string(),
    exerciseName: z.string().min(1, "種目名を入力してください"),
    sets: z.coerce.number().min(1, "セット数は1以上である必要があります"),
    reps: z.coerce.number().min(1, "回数は1以上である必要があります"),
    weight: z.coerce.number().optional(),
    notes: z.string().optional(),
})

export async function createWorkout(formData: FormData) {
    const session = await auth()

    if (!session) {
        throw new Error("認証されていません")
    }

    const validateFields = workoutSchema.safeParse({
        date: formData.get("date"),
        exerciseName: formData.get("exerciseName"),
        sets: formData.get("sets"),
        reps: formData.get("reps"),
        weight: formData.get("weight"),
        notes: formData.get("notes"),
    })

    if (!validateFields.success) {
        return {
            error: validateFields.error.issues[0].message,
        }
    }

    const { date, exerciseName, sets, reps, weight, notes } = validateFields.data

    await prisma.workout.create({
        data: {
            userId: session.user.id,
            date: new Date(date),
            exerciseName,
            sets,
            reps,
            weight: weight || null,
            notes: notes || null,
        },
    })

    revalidatePath("/workouts")
    redirect("/workouts")
}

export async function updateWorkout(id: string, formData: FormData) {
    const session = await auth()

    if (!session) {
        throw new Error("認証されていません")
    }

    // 所有権チェック
    const workout = await prisma.workout.findUnique({
        where: { id },
    })

    if (!workout || workout.userId !== session.user.id) {
        throw new Error("権限がありません")
    }

    const validatedFields = workoutSchema.safeParse({
        date: formData.get('date'),
        exerciseName: formData.get('exerciseName'),
        sets: formData.get('sets'),
        reps: formData.get('reps'),
        weight: formData.get('weight'),
        notes: formData.get('notes'),
    })

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.issues[0].message,
        }
    }

    const { date, exerciseName, sets, reps, weight, notes } = validatedFields.data

    await prisma.workout.update({
        where: { id },
        data: {
            date: new Date(date),
            exerciseName,
            sets,
            reps,
            weight: weight || null,
            notes: notes || null,
        },
    })
    revalidatePath("/workouts")
    revalidatePath(`/workouts/${id}`)
    redirect("/workouts")
}

export async function deleteWorkout(id: string) {
    const session = await auth()

    if (!session) {
        throw new Error("認証されていません")
    }

    // 所有権チェック
    const workout = await prisma.workout.findUnique({
        where: { id },
    })

    if (!workout || workout.userId !== session.user.id) {
        throw new Error("権限がありません")
    }

    await prisma.workout.delete({
        where: { id },
    })

    revalidatePath("/workouts")
    redirect("/workouts")
}