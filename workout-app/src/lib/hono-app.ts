import { Hono } from "hono"
import { prisma } from "./prisma"
import { auth } from "./auth"

// Honoの型定義
type Variables = {
    userId: string
}

const app = new Hono<{ Variables: Variables }>()

// ミドルウェア: 認証チェック
app.use("/api/*", async (c, next) => {
    const session = await auth()

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    c.set("userId", session.user.id)
    await next()
})

// ヘルスチェック
app.get("/api/health", (c) => {
    return c.json({ status: "ok" });
})

//ワークアウト統計取得
app.get("/api/stats", async (c) => {
    const userId = c.get("userId") as string

    const workouts = await prisma.workout.findMany({
        where: { userId },
    })

    // 種目別の統計を計算
    const statsByExercise = workouts.reduce((acc, workout) => {
        if (!acc[workout.exerciseName]) {
            acc[workout.exerciseName] = {
                exerciseName: workout.exerciseName,
                totalWorkouts: 0,
                totalSets: 0,
                totalReps: 0,
                maxWeight: 0,
            }
        }

        acc[workout.exerciseName].totalWorkouts += 1
        acc[workout.exerciseName].totalSets += workout.sets
        acc[workout.exerciseName].totalReps += workout.reps

        if (workout.weight && workout.weight > acc[workout.exerciseName].maxWeight) {
            acc[workout.exerciseName].maxWeight = workout.weight
        }

        return acc
    }, {} as Record<string, any>)
})

// 月別の統計
app.get("/api/stats/monthly", async (c) => {
    const userId = c.get("userId") as string
    const year = c.req.query("year") || new Date().getFullYear().toString()

    const workouts = await prisma.workout.findMany({
        where: {
            userId,
            date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
            }
        }
    })

    // 月別の集計
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0
    }))

    workouts.forEach((workout) => {
        const month = new Date(workout.date).getMonth()
        monthlyStats[month].count += 1
    })

    return c.json({
        year: parseInt(year),
        monthlyStats,
    })
})

// 特定種目の詳細統計
app.get("/api/stats/exercise/:name", async (c) => {
    const userId = c.get("userId") as string
    const exerciseName = c.req.param("name")

    const workouts = await prisma.workout.findMany({
        where: {
            userId,
            exerciseName,
        },
        orderBy: {
            date: "asc",
        },
    })

    if (workouts.length === 0) {
        return c.json({ error: "No workouts found for this exercise" }, 404)
    }

    // 重量の推移
    const progression = workouts.map((w) => ({
        date: w.date.toISOString().split("T")[0],
        weight: w.weight || 0,
        volume: w.sets * w.reps * (w.weight || 0), // ボリューム = セット × 回数 × 重量
    }))

    const totalVolume = progression.reduce((sum, p) => sum + p.volume, 0)

    return c.json({
        exerciseName,
        totalWorkouts: workouts.length,
        totalVolume,
        progression,
    })
})

export default app