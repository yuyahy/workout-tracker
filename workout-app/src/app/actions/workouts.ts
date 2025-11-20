'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { updateWorkoutStats, decrementWorkoutStats } from "@/lib/workout-stats"

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

    // PostgreSQLに保存
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

    // DynamoDBの統計を更新
    try {
        await updateWorkoutStats(session.user.id, exerciseName, {
            sets,
            reps,
            weight: weight || null,
            date: new Date(date),
        })
    } catch (error) {
        console.error("DynamoDB統計更新エラー:", error)
        // エラーがあってもワークアウトは保存済みなので続行
    }

    revalidatePath("/workouts")
    redirect("/workouts")
}

export async function updateWorkout(id: string, formData: FormData) {
    const session = await auth()

    if (!session) {
        throw new Error("認証されていません")
    }

    // 所有権チェック & データ取得
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

    // DynamoDB統計の更新処理
    try {
        // 1. 旧データの統計を減算
        await decrementWorkoutStats(session.user.id, workout.exerciseName, {
            sets: workout.sets,
            reps: workout.reps,
            weight: workout.weight,
        })

        // 2. 新データの統計を加算
        await updateWorkoutStats(session.user.id, exerciseName, {
            sets,
            reps,
            weight: weight || null,
            date: new Date(date),
        })
    } catch (error) {
        console.error("DynamoDB統計更新エラー:", error)
        // エラーがあっても続行
    }

    // PostgreSQLを更新
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

    // 所有権チェック & データ取得
    const workout = await prisma.workout.findUnique({
        where: { id },
    })

    if (!workout || workout.userId !== session.user.id) {
        throw new Error("権限がありません")
    }

    // PostgreSQLから削除
    await prisma.workout.delete({
        where: { id },
    })

    // DynamoDB統計を減算
    try {
        await decrementWorkoutStats(session.user.id, workout.exerciseName, {
            sets: workout.sets,
            reps: workout.reps,
            weight: workout.weight,
        })
    } catch (error) {
        console.error("DynamoDB統計更新エラー:", error)
    }

    revalidatePath("/workouts")
    redirect("/workouts")
}
