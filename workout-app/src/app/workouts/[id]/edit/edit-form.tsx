'use client'

import { updateWorkout } from "@/app/actions/workouts"
import { useState } from "react"
import type { Workout } from "@prisma/client"

export function EditForm({ workout }: { workout: Workout }) {
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        const result = await updateWorkout(workout.id, formData)

        if (result?.error) {
            setError(result.error)
        }
    }
    return (
        <>
            {error && (
                <div className="mb-4 rounded bg-red-50 p-3 text-red-500">
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium mb-2">
                        日付
                    </label>
                    <input
                        type="date"
                        id="date"
                        name="date"
                        defaultValue={workout.date.toISOString().split('T')[0]}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label htmlFor="exerciseName" className="block text-sm font-medium mb-2">
                        種目名
                    </label>
                    <input
                        type="text"
                        id="exerciseName"
                        name="exerciseName"
                        defaultValue={workout.exerciseName}
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="sets" className="block text-sm font-medium mb-2">
                            セット数
                        </label>
                        <input
                            type="number"
                            id="sets"
                            name="sets"
                            defaultValue={workout.sets}
                            min="1"
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="reps" className="block text-sm font-medium mb-2">
                            回数
                        </label>
                        <input
                            type="number"
                            id="reps"
                            name="reps"
                            defaultValue={workout.reps}
                            min="1"
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label htmlFor="weight" className="block text-sm font-medium mb-2">
                            重量 (kg)
                        </label>
                        <input
                            type="number"
                            id="weight"
                            name="weight"
                            defaultValue={workout.weight || ''}
                            step="0.5"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium mb-2">
                        メモ (任意)
                    </label>
                    <textarea
                        id="notes"
                        name="notes"
                        defaultValue={workout.notes || ''}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        更新
                    </button>
                    <a
                        href={`/workouts/${workout.id}`}
                        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center hover:bg-gray-50"
                    >
                        キャンセル
                    </a>
                </div>
            </form>
        </>
    )
}