import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import {loggerFactory} from '../logging';

export interface DatabaseConfig {
  location: string;
}

export const initializeDatabase = async (databaseLocation: string) => {
  const logger = loggerFactory('S:Database');

  const db = new Kysely<any>({
    dialect: new SqliteDialect({
      database: new Database(databaseLocation)
    })
  });

  const tables = await db.introspection.getTables();
  logger.info(`Initialized tabase, got [${tables.length}] tables: [${tables.map(x => x.name).join(", ")}]`);
  return db;
};
