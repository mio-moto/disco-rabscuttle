import type { Kysely } from 'kysely'

const ticketTable = 'tickets'

interface TicketTable {
  id: string
  document: string
}

interface TicketDatabase {
  [ticketTable]: TicketTable
}

export const makeTicketStorage = async (flexibleDb: Kysely<unknown>) => {
  await flexibleDb.schema
    .createTable(ticketTable)
    .ifNotExists()
    .addColumn('id', 'text', (x) => x.notNull().primaryKey())
    .addColumn('document', 'text', (x) => x.notNull())
    .execute()
  const db = flexibleDb as Kysely<TicketDatabase>

  return {
    createOrUpdateTicket: async <T extends {}>(id: string, document: T) => {
      await db
        .replaceInto(ticketTable)
        .values({
          id,
          document: JSON.stringify(document),
        })
        .execute()
    },
    retrieveTicket: async <T extends {}>(id: string) => {
      const document = (await db.selectFrom(ticketTable).select('document').where('id', '==', id).executeTakeFirst())?.document
      if (document) {
        return JSON.parse(document) as T
      }
      return undefined
    },
    removeTicket: async (id: string) => {
      await db.deleteFrom(ticketTable).where('id', '==', id).execute()
    },
  }
}

export type TicketStorage = Awaited<ReturnType<typeof makeTicketStorage>>
