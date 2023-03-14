import { PromisedDatabase } from "promised-sqlite3";

const CreateTable = `
CREATE TABLE IF NOT EXISTS
    pepe_voting (
        message TEXT NOT NULL,
        user TEXT NOT NULL,
        weight INTEGER,
        PRIMARY KEY ( message, user )
    )
`

const TableName = "pepe_voting";


export const buildVoter = async (db: PromisedDatabase) => {
    await db.createTable(TableName, true, "message TEXT NOT NULL", "user TEXT NOT NULL", "weight INTEGER", "PRIMARY KEY ( message, user )");

    return {
        submitVote: async (messageId: string, user: string, value: number) => {
            await db.replace(TableName, { message: messageId, user: user, weight: value });
            return (await db.get("SELECT SUM(weight) AS sum FROM pepe_voting WHERE message = ?", messageId))["sum"] as number;
        }
    }
}
