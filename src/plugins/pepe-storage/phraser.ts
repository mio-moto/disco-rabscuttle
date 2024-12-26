import type { Kysely } from 'kysely'

const PhrasingTable = 'pepe_phrases'

interface PepePhraseTable {
  phrase: string
  url: string
}

interface Database {
  [PhrasingTable]: PepePhraseTable
}

export const buildPhraser = async (flexibleDb: Kysely<unknown>) => {
  await flexibleDb.schema
    .createTable(PhrasingTable)
    .ifNotExists()
    .addColumn('phrase', 'text', (x) => x.primaryKey().notNull())
    .addColumn('url', 'text', (x) => x.notNull())
    .execute()

  const db = <Kysely<Database>>flexibleDb
  return {
    submitPhrase: async (phrase: string, url: string) => {
      await db
        .replaceInto(PhrasingTable)
        .values({
          phrase: phrase,
          url: url,
        })
        .execute()
    },
    getImage: async (phrase: string) => {
      return await db.selectFrom(PhrasingTable).selectAll().where('phrase', '==', phrase).executeTakeFirst()
    },
  }
}
