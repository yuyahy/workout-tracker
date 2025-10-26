import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// ホットリロード時に同じPrismaインスタンスを使うようにシングルトンを用意
// ??はNull合体演算子。左側がnull or undefinedの場合、右側の値を返す。
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
}