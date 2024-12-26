import { Kysely } from 'kysely'
import { BunWorkerDialect } from 'kysely-bun-worker'
import { loggerFactory } from '../logging'

export interface DatabaseConfig {
  location: string
}

export const initializeDatabase = async (databaseLocation: string) => {
  const logger = loggerFactory('S:Database')

  // biome-ignore lint/suspicious/noExplicitAny: irrelevant
  const db = new Kysely<any>({
    dialect: new BunWorkerDialect({
      url: databaseLocation,
    }),
  })

  const tables = await db.introspection.getTables()
  logger.info(`Initialized tabase, got [${tables.length}] tables: [${tables.map((x) => x.name).join(', ')}]`)
  return db
}
