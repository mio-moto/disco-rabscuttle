import { PromisedDatabase } from "promised-sqlite3";
import { createLogger } from "winston";
import logger, { loggerFactory } from "../logging";

export interface DatabaseConfig { 
    location: string;
}


const listAllTables = `
SELECT name
FROM sqlite_master
WHERE 
    type ='table' AND 
    name NOT LIKE 'sqlite_%'
`;

export const initializeDatabase = async (databaseLocation: string) => {
    
    const logger = loggerFactory("db");
    const db = new PromisedDatabase();
    await db.open(databaseLocation);

    const tables: string[] = [];
    await db.each(listAllTables, [], (result) => {
        tables.push(result as string);
    });

    logger.info(`Initialized database, got [${tables.length}] tables: ${JSON.stringify(tables)}`);
    return db;
}