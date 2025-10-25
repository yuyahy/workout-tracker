# ワークアウト記録アプリ ハンズオン - Phase 3 & 4

## Phase 3: Hono Framework で API層の追加

Phase 3では、Hono Frameworkを使ってREST APIエンドポイントを作成します。
Server ActionsとAPI Routesの使い分けも学びます。

### Server Actions vs API Routes の使い分け

**Server Actions を使うべき場合:**
- フォームからのデータ送信
- 内部的なデータ変更
- Next.jsアプリケーション内でのみ使用

**API Routes を使うべき場合:**
- 外部クライアント(モバイルアプリなど)からのアクセス
- Webhookの受信
- 公開API として提供
- サードパーティ連携

今回は学習目的で、ワークアウトの統計情報を取得するAPIを作成します。

### ステップ 3-1: Honoのインストール

```bash
npm install hono
npm install -D @hono/node-server
```

### ステップ 3-2: Honoアプリケーションのセットアップ

`src/lib/hono-app.ts` を作成:

```typescript
import { Hono } from 'hono'
import { prisma } from './prisma'
import { auth } from './auth'

const app = new Hono()

// ミドルウェア: 認証チェック
app.use('/api/*', async (c, next) => {
  const session = await auth()
  
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('userId', session.user.id)
  await next()
})

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

// ワークアウト統計取得
app.get('/api/stats', async (c) => {
  const userId = c.get('userId') as string

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

  return c.json({
    totalWorkouts: workouts.length,
    statsByExercise: Object.values(statsByExercise),
  })
})

// 月別の統計
app.get('/api/stats/monthly', async (c) => {
  const userId = c.get('userId') as string
  const year = c.req.query('year') || new Date().getFullYear().toString()
  
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      date: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  })

  // 月別の集計
  const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
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
app.get('/api/stats/exercise/:name', async (c) => {
  const userId = c.get('userId') as string
  const exerciseName = c.req.param('name')

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      exerciseName,
    },
    orderBy: {
      date: 'asc',
    },
  })

  if (workouts.length === 0) {
    return c.json({ error: 'No workouts found for this exercise' }, 404)
  }

  // プログレッションデータ(重量の推移)
  const progression = workouts.map((w) => ({
    date: w.date.toISOString().split('T')[0],
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
```

**解説**:
- Honoの軽量さ: Expressよりもシンプルで高速
- ミドルウェアパターン: `c.set()` でコンテキストに値を保存
- `c.req.query()`, `c.req.param()` でパラメータ取得
- Goのgin/echoに似たAPI設計

### ステップ 3-3: Next.js Route Handlerとの統合

`src/app/api/[[...route]]/route.ts` を作成:

```typescript
import { handle } from 'hono/vercel'
import app from '@/lib/hono-app'

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
```

**解説**:
- `[[...route]]` はオプショナルなキャッチオールルート
- `/api/*` のすべてのリクエストをHonoアプリにルーティング
- Vercel用のアダプター `hono/vercel` を使用

### ステップ 3-4: 統計ページの作成

`src/app/stats/page.tsx` を作成:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { StatsClient } from './stats-client'

async function getStats(userId: string) {
  // 内部APIを直接呼び出すのではなく、Prismaを使用
  // 実際のAPI呼び出しはクライアント側で行う
  return null
}

export default async function StatsPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">統計情報</h1>
      <StatsClient />
    </div>
  )
}
```

`src/app/stats/stats-client.tsx` を作成:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalWorkouts: number
  statsByExercise: Array<{
    exerciseName: string
    totalWorkouts: number
    totalSets: number
    totalReps: number
    maxWeight: number
  }>
}

export function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (!stats) {
    return <div>統計情報を取得できませんでした</div>
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">全体統計</h2>
        <div className="text-4xl font-bold text-blue-600">
          {stats.totalWorkouts}
        </div>
        <p className="text-gray-600">総ワークアウト数</p>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">種目別統計</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.statsByExercise.map((stat) => (
            <div key={stat.exerciseName} className="rounded-lg border p-4">
              <h3 className="font-bold text-lg mb-2">{stat.exerciseName}</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">実施回数:</dt>
                  <dd className="font-medium">{stat.totalWorkouts}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">総セット数:</dt>
                  <dd className="font-medium">{stat.totalSets}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">総回数:</dt>
                  <dd className="font-medium">{stat.totalReps}</dd>
                </div>
                {stat.maxWeight > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">最大重量:</dt>
                    <dd className="font-medium">{stat.maxWeight} kg</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### ステップ 3-5: ナビゲーションに統計を追加

`src/components/navbar.tsx` を更新:

```typescript
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'

export async function Navbar() {
  const session = await auth()

  if (!session) {
    return null
  }

  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <div className="flex gap-6">
          <Link href="/dashboard" className="font-bold text-xl">
            ワークアウトトラッカー
          </Link>
          <Link href="/workouts" className="text-gray-600 hover:text-gray-900">
            記録一覧
          </Link>
          <Link href="/workouts/new" className="text-gray-600 hover:text-gray-900">
            新規記録
          </Link>
          <Link href="/stats" className="text-gray-600 hover:text-gray-900">
            統計情報
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.name}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
```

### ステップ 3-6: 統計ページのレイアウト

`src/app/stats/layout.tsx` を作成:

```typescript
import { Navbar } from '@/components/navbar'

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl p-8">{children}</main>
    </>
  )
}
```

### ステップ 3-7: APIの動作確認

```bash
npm run dev
```

1. **APIエンドポイントの直接テスト**
   
   ターミナルで:
   ```bash
   # ログイン後のセッションクッキーが必要なため、
   # ブラウザで http://localhost:3000/api/stats にアクセス
   ```

2. **統計ページの確認**
   - `/stats` にアクセス
   - 種目別の統計が表示されることを確認

3. **複数のワークアウトを追加**
   - 異なる種目で複数のワークアウトを記録
   - 統計が正しく集計されているか確認

### Phase 3 まとめ

✅ 完了した内容:
- Hono Frameworkでの軽量REST API構築
- Next.js Route Handlersとの統合
- ミドルウェアパターンでの認証
- クライアントサイドでのAPIフェッチ

🎯 理解すべきポイント:
- **Hono**: Goのginに似た軽量フレームワーク
- **API設計**: RESTfulなエンドポイント設計
- **Server vs Client**: データフェッチの使い分け

---

## Phase 4: DynamoDB連携

Phase 4では、DynamoDBを使って集計データを管理します。
PostgreSQL(RDB)とDynamoDB(NoSQL)の使い分けを学びます。

### RDB vs NoSQL の使い分け

**PostgreSQL (RDB) を使う場合:**
- トランザクション整合性が必要
- 複雑なリレーション
- 正規化されたデータモデル
- 例: ユーザー情報、ワークアウト記録

**DynamoDB (NoSQL) を使う場合:**
- 高速な読み取りが必要
- 集計データ、キャッシュ
- 非正規化されたデータ
- 水平スケーラビリティ
- 例: 統計情報、ダッシュボード用データ

今回は、頻繁にアクセスされる統計データをDynamoDBに保存します。

### ステップ 4-1: AWS SDK のインストール

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### ステップ 4-2: DynamoDB クライアントのセットアップ

`src/lib/dynamodb.ts` を作成:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
})

export const dynamodb = DynamoDBDocumentClient.from(client)
```

**解説**:
- ローカル環境用の設定
- 本番では環境変数から認証情報を取得
- `DynamoDBDocumentClient` で簡単にJSONを扱える

### ステップ 4-3: DynamoDBテーブル作成スクリプト

`scripts/setup-dynamodb.ts` を作成:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
})

async function setupTables() {
  try {
    // 既存テーブルの確認
    const listResult = await client.send(new ListTablesCommand({}))
    console.log('既存テーブル:', listResult.TableNames)

    // WorkoutStatsテーブルの作成
    if (!listResult.TableNames?.includes('WorkoutStats')) {
      await client.send(
        new CreateTableCommand({
          TableName: 'WorkoutStats',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' }, // Partition key
            { AttributeName: 'exerciseName', KeyType: 'RANGE' }, // Sort key
          ],
          AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'exerciseName', AttributeType: 'S' },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        })
      )
      console.log('✅ WorkoutStatsテーブルを作成しました')
    } else {
      console.log('✅ WorkoutStatsテーブルは既に存在します')
    }
  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

setupTables()
```

`package.json` にスクリプトを追加:

```json
{
  "scripts": {
    "setup-dynamodb": "tsx scripts/setup-dynamodb.ts"
  }
}
```

tsxをインストール:
```bash
npm install -D tsx
```

実行:
```bash
npm run setup-dynamodb
```

### ステップ 4-4: DynamoDB統計更新関数

`src/lib/workout-stats.ts` を作成:

```typescript
import { dynamodb } from './dynamodb'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

export interface WorkoutStats {
  userId: string
  exerciseName: string
  totalWorkouts: number
  totalSets: number
  totalReps: number
  totalVolume: number // セット × 回数 × 重量の累計
  maxWeight: number
  lastWorkoutDate: string
  lastUpdated: string
}

export async function getWorkoutStats(
  userId: string,
  exerciseName: string
): Promise<WorkoutStats | null> {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: 'WorkoutStats',
      Key: { userId, exerciseName },
    })
  )

  return result.Item as WorkoutStats | null
}

export async function updateWorkoutStats(
  userId: string,
  exerciseName: string,
  workout: {
    sets: number
    reps: number
    weight: number | null
    date: Date
  }
) {
  const volume = workout.sets * workout.reps * (workout.weight || 0)
  const now = new Date().toISOString()

  // 既存の統計を取得
  const existingStats = await getWorkoutStats(userId, exerciseName)

  if (existingStats) {
    // 更新
    await dynamodb.send(
      new UpdateCommand({
        TableName: 'WorkoutStats',
        Key: { userId, exerciseName },
        UpdateExpression: `
          SET totalWorkouts = totalWorkouts + :one,
              totalSets = totalSets + :sets,
              totalReps = totalReps + :reps,
              totalVolume = totalVolume + :volume,
              maxWeight = if_not_exists(maxWeight, :zero),
              maxWeight = if_not_exists(maxWeight, :weight),
              lastWorkoutDate = :date,
              lastUpdated = :now
        `,
        ExpressionAttributeValues: {
          ':one': 1,
          ':sets': workout.sets,
          ':reps': workout.reps,
          ':volume': volume,
          ':weight': workout.weight || 0,
          ':zero': 0,
          ':date': workout.date.toISOString(),
          ':now': now,
        },
      })
    )

    // maxWeightの更新(条件付き)
    if (workout.weight && workout.weight > existingStats.maxWeight) {
      await dynamodb.send(
        new UpdateCommand({
          TableName: 'WorkoutStats',
          Key: { userId, exerciseName },
          UpdateExpression: 'SET maxWeight = :weight',
          ExpressionAttributeValues: {
            ':weight': workout.weight,
          },
        })
      )
    }
  } else {
    // 新規作成
    await dynamodb.send(
      new PutCommand({
        TableName: 'WorkoutStats',
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
        },
      })
    )
  }
}

export async function decrementWorkoutStats(
  userId: string,
  exerciseName: string,
  workout: {
    sets: number
    reps: number
    weight: number | null
  }
) {
  const volume = workout.sets * workout.reps * (workout.weight || 0)

  await dynamodb.send(
    new UpdateCommand({
      TableName: 'WorkoutStats',
      Key: { userId, exerciseName },
      UpdateExpression: `
        SET totalWorkouts = totalWorkouts - :one,
            totalSets = totalSets - :sets,
            totalReps = totalReps - :reps,
            totalVolume = totalVolume - :volume,
            lastUpdated = :now
      `,
      ExpressionAttributeValues: {
        ':one': 1,
        ':sets': workout.sets,
        ':reps': workout.reps,
        ':volume': volume,
        ':now': new Date().toISOString(),
      },
    })
  )
}
```

**解説**:
- `GetCommand`: 単一アイテムの取得
- `PutCommand`: 新規アイテムの作成
- `UpdateCommand`: 既存アイテムの更新(部分更新)
- UpdateExpressionでアトミックな更新が可能

### ステップ 4-5: Server Actionsの更新

`src/app/actions/workouts.ts` を更新して、DynamoDB統計も更新:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { updateWorkoutStats, decrementWorkoutStats } from '@/lib/workout-stats'

const workoutSchema = z.object({
  date: z.string(),
  exerciseName: z.string().min(1, '種目名を入力してください'),
  sets: z.coerce.number().min(1, 'セット数は1以上である必要があります'),
  reps: z.coerce.number().min(1, '回数は1以上である必要があります'),
  weight: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export async function createWorkout(formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('認証されていません')
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
      error: validatedFields.error.errors[0].message,
    }
  }

  const { date, exerciseName, sets, reps, weight, notes } = validatedFields.data

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
    console.error('DynamoDB統計更新エラー:', error)
    // エラーがあってもワークアウトは保存済みなので続行
  }

  revalidatePath('/workouts')
  redirect('/workouts')
}

export async function deleteWorkout(id: string) {
  const session = await auth()

  if (!session) {
    throw new Error('認証されていません')
  }

  // 所有権チェック & データ取得
  const workout = await prisma.workout.findUnique({
    where: { id },
  })

  if (!workout || workout.userId !== session.user.id) {
    throw new Error('権限がありません')
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
    console.error('DynamoDB統計更新エラー:', error)
  }

  revalidatePath('/workouts')
  redirect('/workouts')
}

// updateWorkout も同様に更新...
```

### ステップ 4-6: DynamoDBから統計を取得するAPIエンドポイント

`src/lib/hono-app.ts` を更新:

```typescript
import { Hono } from 'hono'
import { prisma } from './prisma'
import { auth } from './auth'
import { dynamodb } from './dynamodb'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'

const app = new Hono()

// ミドルウェア: 認証チェック
app.use('/api/*', async (c, next) => {
  const session = await auth()
  
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  c.set('userId', session.user.id)
  await next()
})

// ... 既存のエンドポイント ...

// DynamoDBから統計取得
app.get('/api/stats/dynamodb', async (c) => {
  const userId = c.get('userId') as string

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: 'WorkoutStats',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    })
  )

  return c.json({
    stats: result.Items || [],
  })
})

export default app
```

### ステップ 4-7: DynamoDB統計表示ページ

`src/app/stats/dynamodb/page.tsx` を作成:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface DynamoDBStats {
  exerciseName: string
  totalWorkouts: number
  totalSets: number
  totalReps: number
  totalVolume: number
  maxWeight: number
  lastWorkoutDate: string
}

export default function DynamoDBStatsPage() {
  const [stats, setStats] = useState<DynamoDBStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/dynamodb')
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>読み込み中...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">DynamoDB統計</h1>
      
      {stats.length === 0 ? (
        <p className="text-gray-600">統計データがありません</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.exerciseName} className="rounded-lg border p-6">
              <h3 className="font-bold text-xl mb-4">{stat.exerciseName}</h3>
              
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-600">実施回数</dt>
                  <dd className="text-2xl font-bold">{stat.totalWorkouts}</dd>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">総セット数</dt>
                    <dd className="font-medium">{stat.totalSets}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">総回数</dt>
                    <dd className="font-medium">{stat.totalReps}</dd>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">総ボリューム</dt>
                    <dd className="font-medium">{stat.totalVolume.toFixed(0)}</dd>
                  </div>
                  {stat.maxWeight > 0 && (
                    <div>
                      <dt className="text-gray-600">最大重量</dt>
                      <dd className="font-medium">{stat.maxWeight} kg</dd>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-sm">
                  <dt className="text-gray-600">最終実施日</dt>
                  <dd>
                    {new Date(stat.lastWorkoutDate).toLocaleDateString('ja-JP')}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### ステップ 4-8: ナビゲーション更新

`src/components/navbar.tsx` に統計ページへのリンクを追加:

```typescript
// ... 前述のコード ...

<Link href="/stats/dynamodb" className="text-gray-600 hover:text-gray-900">
  DynamoDB統計
</Link>
```

### ステップ 4-9: 動作確認

```bash
npm run dev
```

1. **DynamoDBテーブル確認**
   ```bash
   # AWS CLI (ローカル用)をインストールしていれば:
   aws dynamodb scan \
     --table-name WorkoutStats \
     --endpoint-url http://localhost:8000 \
     --region local
   ```

2. **新規ワークアウト作成**
   - いくつかワークアウトを作成
   - PostgreSQLとDynamoDBの両方にデータが保存されることを確認

3. **統計ページ確認**
   - `/stats` (PostgreSQL集計)
   - `/stats/dynamodb` (DynamoDB統計)
   - 両方の結果が一致することを確認

4. **削除テスト**
   - ワークアウトを削除
   - DynamoDB統計が正しく減算されることを確認

### Phase 4 まとめ

✅ 完了した内容:
- DynamoDBローカル環境のセットアップ
- AWS SDK for JavaScriptの使用
- RDBとNoSQLの併用パターン
- アトミックな統計更新

🎯 理解すべきポイント:
- **Key設計**: Partition Key + Sort Key
- **UpdateExpression**: アトミックな更新
- **整合性**: PostgreSQLとDynamoDBのデータ一貫性
- **使い分け**: RDB vs NoSQL の選択基準

---

## 全体まとめ

### 学習した技術スタック

1. **Next.js 15 App Router**
   - ファイルベースルーティング
   - Server Components / Client Components
   - Route Handlers

2. **React 19**
   - Server Actions
   - useFormState
   - Server/Client境界

3. **TypeScript**
   - 型安全性
   - Zodバリデーション
   - Prisma生成型

4. **Prisma ORM**
   - スキーマ駆動開発
   - マイグレーション
   - 型安全なクエリ

5. **NextAuth.js**
   - Credentials認証
   - セッション管理
   - コールバック

6. **Hono Framework**
   - 軽量REST API
   - ミドルウェア
   - Next.js統合

7. **PostgreSQL**
   - リレーショナルデータ
   - トランザクション

8. **DynamoDB**
   - NoSQLデータモデル
   - Key-Value操作
   - アトミック更新

### Go/Pythonとの対応関係

| 概念 | Next.js/React | Go | Python |
|------|--------------|-----|--------|
| HTTPハンドラー | Server Action | `http.HandlerFunc` | FastAPI route |
| ORM | Prisma | GORM | SQLAlchemy |
| バリデーション | Zod | validator | Pydantic |
| ルーティング | App Router | gin/echo | FastAPI |
| ミドルウェア | Hono middleware | gin middleware | FastAPI middleware |

### ベストプラクティス

1. **Server/Client分離**
   - データフェッチはServer Componentで
   - インタラクションはClient Componentで

2. **Server Actions**
   - フォーム送信には必ず使用
   - バリデーションを必ず実装
   - revalidatePath でキャッシュ管理

3. **認可**
   - すべての変更操作で所有権チェック
   - セッション検証を徹底

4. **エラーハンドリング**
   - ユーザーフレンドリーなエラーメッセージ
   - try-catchで適切に処理

5. **型安全性**
   - Prismaの生成型を活用
   - Zodでランタイムバリデーション

### 次のステップ

このハンズオンを完了したら、以下を試してみてください:

1. **機能追加**
   - ワークアウトのフィルタリング・検索
   - 友達機能(ユーザー間のフォロー)
   - ワークアウトプランの作成

2. **改善**
   - 楽観的UI更新
   - リアルタイム更新(WebSocket)
   - PWA化

3. **デプロイ**
   - Vercelへのデプロイ
   - PostgreSQL (Supabase/Neon)
   - DynamoDB (AWS本番環境)

4. **テスト**
   - Vitestでユニットテスト
   - Playwrightでe2eテスト

### 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Hono Documentation](https://hono.dev/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)

---

お疲れ様でした!このハンズオンで実務に必要な技術スタックの基礎が習得できたはずです。
質問があればいつでもどうぞ!
