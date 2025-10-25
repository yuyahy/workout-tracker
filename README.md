# Workout Tracker

Next.js 15 + React 19 + TypeScript のキャッチアップを目的としたワークアウト記録アプリケーション

## 技術スタック

### フロントエンド
- **Next.js 15** - App Router
- **React 19** - Server Components / Client Components
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング

### バックエンド
- **Next.js Server Actions** - フォーム送信・データ変更
- **Prisma ORM** - データベースアクセス
- **NextAuth.js v5** - 認証・セッション管理
- **Hono Framework** - 軽量REST API (予定)

### データベース
- **PostgreSQL** - リレーショナルデータ (ユーザー、ワークアウト記録)
- **DynamoDB Local** - NoSQL (統計データ) (予定)

## 機能

- ✅ ユーザー認証 (メール/パスワード)
- 🚧 ワークアウト記録のCRUD
- 🚧 統計情報の表示
- 🚧 種目別の分析

## プロジェクト構成
```
workout-tracker/
├── docker-compose.yml          # PostgreSQL + DynamoDB Local
├── docs/                       # ハンズオンドキュメント
└── workout-app/                # Next.jsアプリケーション
    ├── src/
    │   ├── app/               # App Router (ページ・API)
    │   ├── lib/               # ユーティリティ (Prisma, Auth)
    │   └── components/        # Reactコンポーネント
    ├── prisma/
    │   ├── schema.prisma      # データベーススキーマ
    │   └── migrations/        # マイグレーション履歴
    └── public/                # 静的ファイル
```

## セットアップ

### 前提条件

- Node.js 20.x 以上
- Docker & Docker Compose
- npm または yarn

### 1. リポジトリをクローン
```bash
git clone <repository-url>
cd workout-tracker
```

### 2. Dockerコンテナを起動
```bash
docker-compose up -d
```

起動確認:
```bash
docker ps
# workout-postgres と workout-dynamodb が起動していることを確認
```

### 3. Next.jsアプリのセットアップ
```bash
cd workout-app

# 依存関係のインストール
npm install

# 環境変数の設定
cat > .env << 'EOL'
DATABASE_URL="postgresql://workout:workout123@localhost:5432/workout_db"
AUTH_SECRET="your-super-secret-key-change-this-in-production"
EOL

# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 4. Prisma Studioでデータベース確認 (オプション)
```bash
npx prisma studio
```

http://localhost:5555 でデータベースのGUIが開きます

## 開発コマンド
```bash
cd workout-app

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# Prisma Studio起動
npx prisma studio

# データベースマイグレーション作成
npx prisma migrate dev --name <migration-name>

# Prisma Clientの再生成
npx prisma generate
```

## データベーススキーマ

### User
- id (String, PK)
- email (String, Unique)
- password (String, ハッシュ化)
- name (String, nullable)
- workouts (Workout[])

### Workout
- id (String, PK)
- userId (String, FK)
- date (DateTime)
- exerciseName (String)
- sets (Int)
- reps (Int)
- weight (Float, nullable)
- notes (String, nullable)

## 環境変数

`.env` ファイルに以下を設定:
```env
# PostgreSQL接続文字列
DATABASE_URL="postgresql://workout:workout123@localhost:5432/workout_db"

# NextAuth.js シークレットキー (本番環境では必ず変更)
AUTH_SECRET="your-super-secret-key-change-this-in-production"
```

本番環境用のシークレットキー生成:
```bash
openssl rand -base64 32
```

## トラブルシューティング

### Prismaマイグレーションエラー
```bash
# Prisma Clientの再生成
npx prisma generate

# マイグレーションのリセット (開発環境のみ)
npx prisma migrate reset
```

### Dockerコンテナの再起動
```bash
docker-compose down
docker-compose up -d
```

### ポートの競合

PostgreSQL (5432) や DynamoDB (8000) のポートが既に使用されている場合、`docker-compose.yml` のポート設定を変更してください。

## 学習リソース

このプロジェクトは以下のハンズオンに基づいています:
- [Phase 0-2](./docs/workout-app-handson.md) - 基本セットアップと認証
- [Phase 3-4](./docs/workout-app-handson-phase3-4.md) - API層とDynamoDB連携

## ライセンス

MIT

## 作成者

学習目的のプロジェクト
