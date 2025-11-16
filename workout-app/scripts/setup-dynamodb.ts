import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { CreateTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy",
    },
})

async function setupTables() {
    try {
        console.log("🔄 DynamoDB Localに接続中...")
        // 現在のテーブルの確認
        const listResult = await client.send(new ListTablesCommand({}))
        console.log("現在のテーブル:", listResult.TableNames)

        // WorkoutStatsテーブルの作成
        if (!listResult.TableNames?.includes("WorkoutStats")) {
            await client.send(
                new CreateTableCommand({
                    TableName: "WorkoutStats",
                    KeySchema: [
                        { AttributeName: "userId", KeyType: "HASH" },
                        { AttributeName: "exerciseName", KeyType: "RANGE" }
                    ],
                    AttributeDefinitions: [
                        { AttributeName: "userId", AttributeType: "S" },
                        { AttributeName: "exerciseName", AttributeType: "S" },
                    ],
                    BillingMode: "PAY_PER_REQUEST",
                })
            )
            console.log("✅ WorkoutStatsテーブルを作成しました")
        } else {
            console.log("✅ WorkoutStatsテーブルは既に存在します")
        }
    } catch (error) {
        console.error("❌ エラー:", error)
    }
}

console.log("📋 DynamoDBセットアップスクリプトを開始します")
setupTables()