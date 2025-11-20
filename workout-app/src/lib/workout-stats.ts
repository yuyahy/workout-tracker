import { dynamodb } from "./dynamodb"
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"

export interface WorkoutStats {
    userId: string
    exerciseName: string
    totalWorkouts: number
    totalSets: number
    totalReps: number
    totalVolume: number // セット×回数×重量の集計
    maxWeight: number
    lastWorkoutDate: string
    lastUpdated: string
}

export async function getWorkoutStats(userId: string, exerciseName: string): Promise<WorkoutStats | null> {
    const result = await dynamodb.send(
        new GetCommand({
            TableName: "WorkoutStats",
            Key: { userId, exerciseName },
        })
    )

    return result.Item as WorkoutStats | null
}

export async function updateWorkoutStats(userId: string, exerciseName: string, workout: { sets: number, reps: number, weight: number | null, date: Date }) {
    const volume = workout.sets * workout.reps * (workout.weight || 0)
    const now = new Date().toISOString()

    // 既存の統計を取得
    const existingStats = await getWorkoutStats(userId, exerciseName)

    if (existingStats) {
        // 更新
        await dynamodb.send(
            new UpdateCommand({
                TableName: "WorkoutStats",
                Key: { userId, exerciseName },
                UpdateExpression: `
                SET totatlWorkouts=totalWorkouts + "one,
                totalSets=totalSets+:sets,
                totalReps=totalReps+:reps,
                totalVolume=totalVolume+:volume,
                maxWeight=if_not_exists(maxWeight, :zero),
                maxWeight=if_not_exists(maxWeight, :weight),
                lastWorkoutDate=:date,
                lastUpdated=:now
            `,
                ExpressionAttributeValues: {
                    ":one": 1,
                    ":sets": workout.sets,
                    "reps": workout.reps,
                    ":volume": volume,
                    ":weight": workout.weight || 0,
                    ":zero": 0,
                    ":date": workout.date.toISOString(),
                    ":now": now,
                }
            })
        )

        // maxWeightの更新(条件つき)
        if (workout.weight && workout.weight > existingStats.maxWeight) {
            await dynamodb.send(
                new UpdateCommand({
                    TableName: "WorkoutStats",
                    Key: { userId, exerciseName },
                    UpdateExpression: "SET maxWeight=:weight",
                    ExpressionAttributeValues: {
                        ":weight": workout.weight,
                    }
                })
            )
        }
    } else {
        // 新規作成
        await dynamodb.send(
            new PutCommand({
                TableName: "WorkoutStats",
                Item: {
                    userId,
                    exerciseName,
                    totalWorkouts: 1,
                    totalSets: workout.sets,
                    totalReps: workout.reps,
                    totalVolume: volume,
                    maxWeight: workout.weight || 0,
                    lastWorkoutDate: workout.date.toISOString(),
                    lastUpdated: now,
                }
            })
        )
    }
}

export async function decrementWorkoutStats(userId: string, exerciseName: string, workout: { sets: number, reps: number, weight: number | null }) {
    const volume = workout.sets * workout.reps * (workout.weight || 0)

    await dynamodb.send(
        new UpdateCommand({
            TableName: "WorkoutStats",
            Key: { userId, exerciseName },
            UpdateExpression: `
                SET totalWorkouts = totalWorkouts - :one,
                totalSets = totalSets - :sets,
                totalReps = totalReps - :reps,
                totalVolumen = totalVolume - :volume,
                lastUpdated = :now
            `,
            ExpressionAttributeValues: {
                ":one": 1,
                ":sets": workout.sets,
                ":reps": workout.reps,
                ":volume": volume,
                ":now": new Date().toISOString()
            }
        })
    )
}