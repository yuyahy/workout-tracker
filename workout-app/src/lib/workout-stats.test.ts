import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkoutStats, updateWorkoutStats, decrementWorkoutStats, type WorkoutStats } from './workout-stats'

const mockSend = vi.fn()

vi.mock('./dynamodb', () => ({
  dynamodb: {
    send: (command: unknown) => mockSend(command),
  },
}))

describe('workout-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00.000Z'))
  })

  describe('getWorkoutStats', () => {
    it('存在する統計データを取得できる', async () => {
      const mockStats: WorkoutStats = {
        userId: 'user-1',
        exerciseName: 'ベンチプレス',
        totalWorkouts: 10,
        totalSets: 30,
        totalReps: 300,
        totalVolume: 30000,
        maxWeight: 100,
        lastWorkoutDate: '2025-01-10T00:00:00.000Z',
        lastUpdated: '2025-01-10T12:00:00.000Z',
      }

      mockSend.mockResolvedValueOnce({ Item: mockStats })

      const result = await getWorkoutStats('user-1', 'ベンチプレス')

      expect(result).toEqual(mockStats)
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TableName: 'WorkoutStats',
            Key: { userId: 'user-1', exerciseName: 'ベンチプレス' },
          },
        })
      )
    })

    it('存在しない統計データの場合はnull/undefinedを返す', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined })

      const result = await getWorkoutStats('user-1', '存在しない種目')

      expect(result).toBeFalsy()
    })
  })

  describe('updateWorkoutStats', () => {
    it('新規の統計データを作成できる', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: undefined }) // getWorkoutStats
        .mockResolvedValueOnce({}) // PutCommand

      await updateWorkoutStats('user-1', 'スクワット', {
        sets: 3,
        reps: 10,
        weight: 80,
        date: new Date('2025-01-15'),
      })

      expect(mockSend).toHaveBeenCalledTimes(2)
      // PutCommand (新規作成)
      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'WorkoutStats',
            Item: {
              userId: 'user-1',
              exerciseName: 'スクワット',
              totalWorkouts: 1,
              totalSets: 3,
              totalReps: 10,
              totalVolume: 2400, // 3 * 10 * 80
              maxWeight: 80,
              lastWorkoutDate: '2025-01-15T00:00:00.000Z',
              lastUpdated: '2025-01-15T10:00:00.000Z',
            },
          }),
        })
      )
    })

    it('既存の統計データを更新できる', async () => {
      const existingStats: WorkoutStats = {
        userId: 'user-1',
        exerciseName: 'ベンチプレス',
        totalWorkouts: 5,
        totalSets: 15,
        totalReps: 150,
        totalVolume: 15000,
        maxWeight: 70,
        lastWorkoutDate: '2025-01-10T00:00:00.000Z',
        lastUpdated: '2025-01-10T12:00:00.000Z',
      }

      mockSend
        .mockResolvedValueOnce({ Item: existingStats }) // getWorkoutStats
        .mockResolvedValueOnce({}) // UpdateCommand (統計更新)
        .mockResolvedValueOnce({}) // UpdateCommand (maxWeight更新)

      await updateWorkoutStats('user-1', 'ベンチプレス', {
        sets: 4,
        reps: 8,
        weight: 80, // maxWeightより大きい
        date: new Date('2025-01-15'),
      })

      expect(mockSend).toHaveBeenCalledTimes(3)
      // UpdateCommand (統計更新)
      expect(mockSend).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'WorkoutStats',
            Key: { userId: 'user-1', exerciseName: 'ベンチプレス' },
            ExpressionAttributeValues: expect.objectContaining({
              ':one': 1,
              ':sets': 4,
              ':reps': 8,
              ':volume': 2560, // 4 * 8 * 80
            }),
          }),
        })
      )
      // UpdateCommand (maxWeight更新)
      expect(mockSend).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'WorkoutStats',
            Key: { userId: 'user-1', exerciseName: 'ベンチプレス' },
            ExpressionAttributeValues: {
              ':weight': 80,
            },
          }),
        })
      )
    })

    it('maxWeightが既存値以下の場合はmaxWeightを更新しない', async () => {
      const existingStats: WorkoutStats = {
        userId: 'user-1',
        exerciseName: 'デッドリフト',
        totalWorkouts: 5,
        totalSets: 15,
        totalReps: 150,
        totalVolume: 22500,
        maxWeight: 100,
        lastWorkoutDate: '2025-01-10T00:00:00.000Z',
        lastUpdated: '2025-01-10T12:00:00.000Z',
      }

      mockSend
        .mockResolvedValueOnce({ Item: existingStats }) // getWorkoutStats
        .mockResolvedValueOnce({}) // UpdateCommand (統計更新のみ)

      await updateWorkoutStats('user-1', 'デッドリフト', {
        sets: 3,
        reps: 5,
        weight: 90, // maxWeight(100)より小さい
        date: new Date('2025-01-15'),
      })

      // maxWeight更新のUpdateCommandは呼ばれない
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('weightがnullの場合、volumeは0として計算される', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: undefined }) // getWorkoutStats
        .mockResolvedValueOnce({}) // PutCommand

      await updateWorkoutStats('user-1', '腕立て伏せ', {
        sets: 3,
        reps: 20,
        weight: null,
        date: new Date('2025-01-15'),
      })

      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Item: expect.objectContaining({
              totalVolume: 0, // weight=null なので 0
              maxWeight: 0,
            }),
          }),
        })
      )
    })
  })

  describe('decrementWorkoutStats', () => {
    it('統計データを減算できる', async () => {
      mockSend.mockResolvedValueOnce({})

      await decrementWorkoutStats('user-1', 'ベンチプレス', {
        sets: 3,
        reps: 10,
        weight: 60,
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'WorkoutStats',
            Key: { userId: 'user-1', exerciseName: 'ベンチプレス' },
            ExpressionAttributeValues: expect.objectContaining({
              ':one': 1,
              ':sets': 3,
              ':reps': 10,
              ':volume': 1800, // 3 * 10 * 60
            }),
          }),
        })
      )
    })

    it('weightがnullの場合、volumeは0として計算される', async () => {
      mockSend.mockResolvedValueOnce({})

      await decrementWorkoutStats('user-1', '腕立て伏せ', {
        sets: 3,
        reps: 20,
        weight: null,
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ':volume': 0,
            }),
          }),
        })
      )
    })
  })
})
