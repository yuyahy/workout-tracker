# ワークアウト記録アプリ ハンズオン

Next.js 15 App Router + React 19 + TypeScript を使用した実践的なハンズオンです。
完全無料・ローカル環境で完結します。

## 目次

1. [環境セットアップ](#phase-0-環境セットアップ)
2. [Phase 1: プロジェクト作成と認証](#phase-1-プロジェクト作成と認証)
3. [Phase 2: CRUD実装](#phase-2-crud実装)
4. [Phase 3: API層の追加](#phase-3-api層の追加)
5. [Phase 4: DynamoDB連携](#phase-4-dynamodb連携)

## 学習目標

このハンズオンで以下を習得します:

- **Next.js 15 App Router**: ファイルベースルーティング、Server Components
- **React 19**: Server Components, Server Actions の新しい思想
- **Server Actions**: フォーム送信、データ変更の新しいパターン
- **Prisma ORM**: スキーマ定義、マイグレーション、型安全なクエリ
- **NextAuth.js**: セッション管理、認証フロー
- **Hono Framework**: 軽量高速なAPIフレームワーク
- **PostgreSQL**: リレーショナルデータの管理
- **DynamoDB**: NoSQLでの集計データ管理

## アプリケーション仕様

### 機能要件

1. **ユーザー認証**
   - メール/パスワードでのサインアップ・ログイン
   - セッション管理

2. **ワークアウト記録**
   - ワークアウトの作成(日付、種目、セット数、回数、重量)
   - 一覧表示
   - 詳細表示
   - 編集・削除

3. **統計情報(Phase 4)**
   - 種目別の累計回数
   - 月別の実施回数
   - DynamoDBで集計データを管理

### データモデル

```
User (PostgreSQL)
├── id
├── email
├── password (ハッシュ化)
└── workouts []

Workout (PostgreSQL)
├── id
├── userId
├── date
├── exerciseName (例: ベンチプレス)
├── sets (例: 3セット)
├── reps (例: 10回)
├── weight (例: 60kg)
└── notes

WorkoutStats (DynamoDB)
├── userId (partition key)
├── exerciseName (sort key)
├── totalReps (累計回数)
├── totalSets (累計セット数)
└── lastUpdated
```

---

## Phase 0: 環境セットアップ

### 前提条件

- Node.js 20.x 以上
- Docker & Docker Compose
- エディタ(VS Code推奨)

### ステップ 0-1: 作業ディレクトリ作成

```bash
mkdir workout-tracker
cd workout-tracker
```

### ステップ 0-2: Docker環境の準備

`docker-compose.yml` を作成:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: workout-postgres
    environment:
      POSTGRES_USER: workout
      POSTGRES_PASSWORD: workout123
      POSTGRES_DB: workout_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  dynamodb-local:
    image: amazon/dynamodb-local:latest
    container_name: workout-dynamodb
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath ./data"
    volumes:
      - dynamodb_data:/home/dynamodblocal/data

volumes:
  postgres_data:
  dynamodb_data:
```

### ステップ 0-3: Dockerコンテナ起動

```bash
docker-compose up -d
```

確認:
```bash
docker ps
# workout-postgres と workout-dynamodb が起動していることを確認
```

---

## Phase 1: プロジェクト作成と認証

### ステップ 1-1: Next.jsプロジェクト作成

```bash
npx create-next-app@latest workout-app
```

プロンプトで以下を選択:
```
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … Yes
✔ Would you like to use Tailwind CSS? … Yes
✔ Would you like your code inside a `src/` directory? … Yes
✔ Would you like to use App Router? … Yes
✔ Would you like to use Turbopack for next dev? … Yes
✔ Would you like to customize the import alias? … No
```

```bash
cd workout-app
```

### ステップ 1-2: 必要なパッケージのインストール

```bash
# Prisma
npm install prisma @prisma/client

# NextAuth.js
npm install next-auth@beta

# パスワードハッシュ化
npm install bcryptjs
npm install -D @types/bcryptjs

# Zod (バリデーション)
npm install zod
```

**注意**: Next.js 15 では NextAuth.js v5 (beta) が必要です。

### ステップ 1-3: Prismaのセットアップ

```bash
npx prisma init
```

`.env` ファイルが作成されます。DATABASE_URLを編集:

```env
DATABASE_URL="postgresql://workout:workout123@localhost:5432/workout_db"
```

### ステップ 1-4: Prismaスキーマ定義

`prisma/schema.prisma` を編集:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  workouts  Workout[]
}

model Workout {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date         DateTime
  exerciseName String
  sets         Int
  reps         Int
  weight       Float?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
  @@index([date])
}
```

### ステップ 1-5: マイグレーション実行

```bash
npx prisma migrate dev --name init
```

これにより:
1. PostgreSQLにテーブルが作成されます
2. Prisma Clientが生成されます

確認:
```bash
npx prisma studio
```
ブラウザで `http://localhost:5555` が開き、データベースのGUIが表示されます。

### ステップ 1-6: Prisma Clientのセットアップ

`src/lib/prisma.ts` を作成:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**解説**: 
- 開発時のホットリロードで複数のPrismaインスタンスが作成されるのを防ぐパターン
- GoでいうとSingletonパターンに相当

### ステップ 1-7: NextAuth.js設定

`.env` に追加:

```env
AUTH_SECRET="your-super-secret-key-change-this-in-production"
```

本番環境用のシークレット生成:
```bash
openssl rand -base64 32
```

`src/lib/auth.ts` を作成:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // バリデーション
        const validatedFields = signInSchema.safeParse(credentials)
        
        if (!validatedFields.success) {
          return null
        }

        const { email, password } = validatedFields.data

        // ユーザー検索
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        // パスワード検証
        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

**解説**:
- `Credentials` プロバイダーでメール/パスワード認証を実装
- Zodでバリデーション(Goのvalidatorライブラリに相当)
- bcryptでパスワードをハッシュ化して検証
- `callbacks`でセッションにユーザーIDを追加

### ステップ 1-8: NextAuth.js型定義の拡張

`src/types/next-auth.d.ts` を作成:

```typescript
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
    }
  }
}
```

### ステップ 1-9: API Routeの作成

`src/app/api/auth/[...nextauth]/route.ts` を作成:

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

**解説**:
- App Routerでは Route Handlers を使用
- `[...nextauth]` はキャッチオールルート(すべての認証関連パスをキャッチ)

### ステップ 1-10: サインアップ用Server Action

`src/app/actions/auth.ts` を作成:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
  name: z.string().min(1, '名前を入力してください'),
})

export async function signUp(formData: FormData) {
  const validatedFields = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.errors[0].message,
    }
  }

  const { email, password, name } = validatedFields.data

  // 既存ユーザーチェック
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return {
      error: 'このメールアドレスは既に登録されています',
    }
  }

  // パスワードハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10)

  // ユーザー作成
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })

  return {
    success: true,
  }
}
```

**解説**:
- `'use server'` ディレクティブでServer Actionとして宣言
- GoのHTTPハンドラーに相当しますが、フォームから直接呼び出せる
- バリデーション→重複チェック→作成という典型的なフロー

### ステップ 1-11: サインアップページ

`src/app/signup/page.tsx` を作成:

```typescript
'use client'

import { signUp } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await signUp(formData)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <h2 className="text-center text-3xl font-bold">アカウント作成</h2>
        
        {error && (
          <div className="rounded bg-red-50 p-3 text-red-500">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              名前
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            登録
          </button>
        </form>

        <p className="text-center text-sm">
          アカウントをお持ちですか？{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            ログイン
          </a>
        </p>
      </div>
    </div>
  )
}
```

**解説**:
- `'use client'` でClient Component化(useStateを使うため)
- `action={handleSubmit}` でServer Actionを呼び出し
- フォームのネイティブな挙動を活用

### ステップ 1-12: ログインページ

`src/app/login/page.tsx` を作成:

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('メールアドレスまたはパスワードが間違っています')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <h2 className="text-center text-3xl font-bold">ログイン</h2>
        
        {error && (
          <div className="rounded bg-red-50 p-3 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            ログイン
          </button>
        </form>

        <p className="text-center text-sm">
          アカウントをお持ちでないですか？{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            新規登録
          </a>
        </p>
      </div>
    </div>
  )
}
```

### ステップ 1-13: ダッシュボードページ(仮)

`src/app/dashboard/page.tsx` を作成:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">ダッシュボード</h1>
      <p className="mt-4">ようこそ、{session.user.name}さん！</p>
    </div>
  )
}
```

**解説**:
- Server Componentなので `async` 関数
- `auth()` でサーバー側でセッション取得
- 未認証ならログインページへリダイレクト

### ステップ 1-14: トップページの更新

`src/app/page.tsx` を編集:

```typescript
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
```

### ステップ 1-15: 動作確認

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開く:

1. **新規登録テスト**
   - `/signup` で新しいアカウント作成
   - メール: `test@example.com`
   - パスワード: `password123`
   - 名前: `テストユーザー`

2. **ログインテスト**
   - `/login` で作成したアカウントでログイン
   - ダッシュボードにリダイレクトされることを確認

3. **Prisma Studioで確認**
   ```bash
   npx prisma studio
   ```
   - `User` テーブルにレコードが追加されていることを確認
   - パスワードがハッシュ化されていることを確認

### Phase 1 まとめ

✅ 完了した内容:
- Next.js 15 + App Router プロジェクト作成
- PostgreSQL + Prisma ORM のセットアップ
- NextAuth.js によるメール/パスワード認証
- Server Action を使ったサインアップ
- セッション管理とリダイレクト

🎯 理解すべきポイント:
- **App Router**: ファイルベースルーティング、Server/Client Components
- **Server Actions**: `'use server'` でサーバー側処理を定義
- **Prisma**: スキーマ駆動開発、型安全なクエリ
- **NextAuth.js**: providers、callbacks、session管理

---

## Phase 2: CRUD実装

Phase 2では、ワークアウト記録の作成・読み取り・更新・削除を実装します。

### ステップ 2-1: ナビゲーションバーの作成

`src/components/navbar.tsx` を作成:

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

**解説**:
- Server Componentとして実装
- インラインServer Actionでログアウト機能
- `signOut` に `redirectTo` を指定してトップページへ

### ステップ 2-2: レイアウトの更新

`src/app/dashboard/layout.tsx` を作成:

```typescript
import { Navbar } from '@/components/navbar'

export default function DashboardLayout({
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

`src/app/workouts/layout.tsx` も同じ内容で作成。

### ステップ 2-3: ワークアウト作成用Server Action

`src/app/actions/workouts.ts` を作成:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

  revalidatePath('/workouts')
  redirect('/workouts')
}

export async function updateWorkout(id: string, formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('認証されていません')
  }

  // 所有権チェック
  const workout = await prisma.workout.findUnique({
    where: { id },
  })

  if (!workout || workout.userId !== session.user.id) {
    throw new Error('権限がありません')
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

  revalidatePath('/workouts')
  revalidatePath(`/workouts/${id}`)
  redirect('/workouts')
}

export async function deleteWorkout(id: string) {
  const session = await auth()

  if (!session) {
    throw new Error('認証されていません')
  }

  // 所有権チェック
  const workout = await prisma.workout.findUnique({
    where: { id },
  })

  if (!workout || workout.userId !== session.user.id) {
    throw new Error('権限がありません')
  }

  await prisma.workout.delete({
    where: { id },
  })

  revalidatePath('/workouts')
  redirect('/workouts')
}
```

**解説**:
- `revalidatePath()`: Next.jsのキャッシュを無効化
- `redirect()`: Server Actionから直接リダイレクト可能
- `z.coerce.number()`: 文字列を数値に変換(フォームデータは文字列で送信されるため)
- 所有権チェックでセキュリティを確保

### ステップ 2-4: ワークアウト新規作成ページ

`src/app/workouts/new/page.tsx` を作成:

```typescript
'use client'

import { createWorkout } from '@/app/actions/workouts'
import { useState } from 'react'

export default function NewWorkoutPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const result = await createWorkout(formData)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">新規ワークアウト記録</h1>

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
            defaultValue={new Date().toISOString().split('T')[0]}
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
            placeholder="例: ベンチプレス"
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
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            記録する
          </button>
          <a
            href="/workouts"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center hover:bg-gray-50"
          >
            キャンセル
          </a>
        </div>
      </form>
    </div>
  )
}
```

### ステップ 2-5: ワークアウト一覧ページ

`src/app/workouts/page.tsx` を作成:

```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function WorkoutsPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const workouts = await prisma.workout.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      date: 'desc',
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ワークアウト記録一覧</h1>
        <Link
          href="/workouts/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          新規記録
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">まだワークアウトの記録がありません</p>
          <Link
            href="/workouts/new"
            className="text-blue-600 hover:underline"
          >
            最初の記録を追加する
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <Link
              key={workout.id}
              href={`/workouts/${workout.id}`}
              className="block rounded-lg border p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{workout.exerciseName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(workout.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg">
                    {workout.sets} セット × {workout.reps} 回
                  </p>
                  {workout.weight && (
                    <p className="text-sm text-gray-600">{workout.weight} kg</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**解説**:
- Server Componentで直接Prismaクエリを実行
- `findMany` でデータ取得、`orderBy` で降順ソート
- 空の状態(Empty State)も考慮したUI

### ステップ 2-6: ワークアウト詳細ページ

`src/app/workouts/[id]/page.tsx` を作成:

```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from './delete-button'

export default async function WorkoutDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const workout = await prisma.workout.findUnique({
    where: { id: params.id },
  })

  if (!workout) {
    notFound()
  }

  if (workout.userId !== session.user.id) {
    redirect('/workouts')
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
```

### ステップ 2-7: 削除ボタンコンポーネント

`src/app/workouts/[id]/delete-button.tsx` を作成:

```typescript
'use client'

import { deleteWorkout } from '@/app/actions/workouts'
import { useState } from 'react'

export function DeleteButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('本当に削除しますか?')) {
      return
    }

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
```

**解説**:
- Client Componentに分離(onClick、confirmを使うため)
- `disabled` で二重送信を防止

### ステップ 2-8: 編集ページ

`src/app/workouts/[id]/edit/page.tsx` を作成:

```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'

export default async function EditWorkoutPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const workout = await prisma.workout.findUnique({
    where: { id: params.id },
  })

  if (!workout) {
    notFound()
  }

  if (workout.userId !== session.user.id) {
    redirect('/workouts')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">ワークアウト編集</h1>
      <EditForm workout={workout} />
    </div>
  )
}
```

`src/app/workouts/[id]/edit/edit-form.tsx` を作成:

```typescript
'use client'

import { updateWorkout } from '@/app/actions/workouts'
import { useState } from 'react'
import type { Workout } from '@prisma/client'

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
```

### ステップ 2-9: ダッシュボードの更新

`src/app/dashboard/page.tsx` を更新:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const workoutCount = await prisma.workout.count({
    where: { userId: session.user.id },
  })

  const recentWorkouts = await prisma.workout.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 5,
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-600">総ワークアウト数</h3>
          <p className="mt-2 text-3xl font-bold">{workoutCount}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">最近の記録</h2>
          <Link href="/workouts" className="text-blue-600 hover:underline">
            すべて見る
          </Link>
        </div>

        {recentWorkouts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500 mb-4">まだワークアウトの記録がありません</p>
            <Link
              href="/workouts/new"
              className="text-blue-600 hover:underline"
            >
              最初の記録を追加する
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((workout) => (
              <Link
                key={workout.id}
                href={`/workouts/${workout.id}`}
                className="block rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{workout.exerciseName}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(workout.date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{workout.sets} × {workout.reps}</p>
                    {workout.weight && <p className="text-gray-600">{workout.weight} kg</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### ステップ 2-10: 404ページの作成

`src/app/not-found.tsx` を作成:

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-gray-600">ページが見つかりません</p>
      <Link href="/" className="mt-8 text-blue-600 hover:underline">
        トップページに戻る
      </Link>
    </div>
  )
}
```

### ステップ 2-11: 動作確認

```bash
npm run dev
```

以下をテスト:

1. **ワークアウト作成**
   - `/workouts/new` で新規記録を作成
   - 例: ベンチプレス、3セット、10回、60kg

2. **一覧表示**
   - `/workouts` で作成した記録が表示されることを確認
   - 日付降順にソートされているか

3. **詳細表示**
   - 記録をクリックして詳細ページへ
   - すべての情報が表示されているか

4. **編集**
   - 編集ボタンから編集ページへ
   - 値を変更して更新
   - 詳細ページで変更が反映されているか

5. **削除**
   - 削除ボタンで確認ダイアログが表示されるか
   - 削除後に一覧ページへリダイレクトされるか

6. **ダッシュボード**
   - `/dashboard` で総ワークアウト数が正しいか
   - 最近の5件が表示されているか

### Phase 2 まとめ

✅ 完了した内容:
- Server Actionsを使ったCRUD操作
- 動的ルーティング `[id]`
- フォームバリデーション
- revalidatePath でキャッシュ管理
- 認可(所有権チェック)

🎯 理解すべきポイント:
- **Server Actions**: データ変更のベストプラクティス
- **Server Components**: データフェッチを直接実行
- **Client Components**: インタラクティブな処理のみ
- **revalidatePath**: Next.jsのキャッシュ戦略

---

続きはPhase 3でHono Frameworkを使ったAPI層の追加に進みます。
ここまでで質問や不明点はありますか?
