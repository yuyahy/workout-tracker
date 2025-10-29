import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">ワークアウトトラッカー</h1>
      <p className="mt-4 text-gray-600">筋トレの記録を管理しましょう</p>

      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          ログイン
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-blue-600 px-6 py-3 text-blue-600 hover:bg-blue-50"
        >
          新規登録
        </Link>
      </div>
    </div>
  )
}