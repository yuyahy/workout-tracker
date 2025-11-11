'use client'

import { deleteWorkout } from "@/app/actions/workouts"
import { useState } from "react"

// idプロパティを持つオブジェクトからidを分割代入
export function DeleteButton({ id }: { id: string }) {
    // 削除処理中かどうかを管理するState
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete() {
        if (!confirm("本当に削除しますか？")) {
            return
        }

        // 削除処理に時間がかかった場合に多重で削除ボタンが押下されないように、
        // 削除処理中フラグをONにし、削除ボタンを無効化する
        setIsDeleting(true)
        await deleteWorkout(id)
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
        >
            {isDeleting ? '削除中...' : '削除'}
        </button>
    )
}