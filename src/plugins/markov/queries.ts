import { type Kysely, WhereNode, sql } from 'kysely'
import type { TokenType } from './tokenizer'

export const MarkovTable = 'markov_ngram'

export const TripletIndex = 'markov_triplets'
export const QuadrupleIndex = 'markov_quadruplets'

export const RowIdCol = 'rowid'
export const TokenOneCol = 'token_1'
export const TokenTwoCol = 'token_2'
export const TokenThreeCol = 'token_3'
export const OccurrenceCol = 'count'

export const TokenTypeTable = 'markov_token_types'

export const MetaTokenTable = 'markov_token_table'

export const TokenTypeIndex = 'meta_type'

export const TokenValueCol = 'token_value'
export const TokenTypeCol = 'token_type'

export interface MarkovTable {
  [RowIdCol]?: bigint
  [TokenOneCol]: bigint
  [TokenTwoCol]: bigint
  [TokenThreeCol]: bigint
  [OccurrenceCol]: number
}

export interface TokenTypeTable {
  [RowIdCol]?: bigint
  [TokenTypeCol]: TokenType
}

export interface MetaTokenTable {
  // this is a meta prop of sqlite
  [RowIdCol]?: bigint
  [TokenValueCol]: string
  [TokenTypeCol]: bigint
  [OccurrenceCol]: number
}

export interface Database {
  [MarkovTable]: MarkovTable
  [MetaTokenTable]: MetaTokenTable
  [TokenTypeTable]: TokenTypeTable
}

type FullToken = {
  entryId: bigint
  value: string
  type: TokenType
  typeId: bigint
}
type FullNGram = [FullToken, FullToken, FullToken]

type Token = {
  value: string
  type: TokenType
}
type NGram = [Token, Token, Token]

export const createDatabase = async (
  db: Kysely<unknown>,
  tokenList: TokenType[],
): Promise<readonly [Kysely<Database>, Record<TokenType, bigint>]> => {
  // table for all token type registrations
  await db.schema
    .createTable(TokenTypeTable)
    .ifNotExists()
    .addColumn(RowIdCol, 'integer', (x) => x.primaryKey().autoIncrement().notNull())
    .addColumn(TokenTypeCol, 'text', (x) => x.notNull())
    .execute()

  // table for all meta insertions
  await db.schema
    .createTable(MetaTokenTable)
    .ifNotExists()
    .addColumn(RowIdCol, 'integer', (x) => x.primaryKey().autoIncrement().notNull())
    .addColumn(TokenValueCol, 'text', (x) => x.notNull())
    .addColumn(TokenTypeCol, 'bigint', (x) => x.notNull().references(`${TokenTypeTable}.${RowIdCol}`))
    .addColumn(OccurrenceCol, 'integer', (x) => x.notNull())
    .addUniqueConstraint(`${MetaTokenTable}_uniqueness`, [TokenValueCol, TokenTypeCol])
    .execute()

  // index on token types to find specific kinds and their values quickly
  await db.schema.createIndex(TokenTypeIndex).ifNotExists().on(MetaTokenTable).column(TokenTypeCol).execute()

  // primary table for trigrams
  await db.schema
    .createTable(MarkovTable)
    .ifNotExists()
    .addColumn(RowIdCol, 'integer', (x) => x.primaryKey().autoIncrement().notNull())
    .addColumn(TokenOneCol, 'integer', (x) => x.references(`${MetaTokenTable}.${RowIdCol}`).notNull().onDelete('cascade'))
    .addColumn(TokenTwoCol, 'integer', (x) => x.references(`${MetaTokenTable}.${RowIdCol}`).notNull().onDelete('cascade'))
    .addColumn(TokenThreeCol, 'integer', (x) => x.references(`${MetaTokenTable}.${RowIdCol}`).notNull().onDelete('cascade'))
    .addColumn(OccurrenceCol, 'integer', (x) => x.notNull())
    .addUniqueConstraint(`${MarkovTable}_uniqueness`, [TokenOneCol, TokenTwoCol, TokenThreeCol])
    .execute()
  // an index on duplets
  await db.schema.createIndex(QuadrupleIndex).ifNotExists().on(MarkovTable).columns([TokenOneCol, TokenTwoCol]).execute()
  // an index on triplets
  await db.schema.createIndex(TripletIndex).ifNotExists().on(MarkovTable).columns([TokenOneCol, TokenTwoCol, TokenThreeCol]).execute()

  // the db is now ready to use
  const typedDb = <Kysely<Database>>db
  console.log(tokenList)
  await typedDb
    .insertInto(TokenTypeTable)
    .values(tokenList.map((x) => ({ [TokenTypeCol]: x })))
    .execute()

  const tokens = await typedDb.selectFrom(TokenTypeTable).select([RowIdCol, TokenTypeCol]).execute()

  return [
    typedDb,
    tokens.reduce(
      (acc, item) => {
        if (!item.rowid) {
          return acc
        }
        acc[item.token_type] = item.rowid
        return acc
      },
      {} as Record<TokenType, bigint>,
    ),
  ] as const
}

export const dropDatabase = async (db: Kysely<Database>): Promise<Kysely<unknown>> => {
  // drop the view
  await db.schema.dropView('markov_ngram_full').ifExists().execute()
  // drop the markov table
  await db.schema.dropIndex(QuadrupleIndex).ifExists().execute()
  await db.schema.dropIndex(TripletIndex).ifExists().execute()
  await db.schema.dropTable(MarkovTable).execute()
  // drop the meta table
  await db.schema.dropIndex(TokenTypeIndex).ifExists().execute()
  await db.schema.dropTable(MetaTokenTable).execute()
  // drop the token type table
  await db.schema.dropTable(TokenTypeTable).execute()

  // compress the database
  await sql`VACUUM`.execute(db)
  return db as Kysely<unknown>
}

export const getNgramWithTypes = async (db: Kysely<Database>, ngram: NGram) => {
  const result = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_1', 'tt_1.token_type', 'ttypes_1.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select([
      'rowid',
      'token_1 as t1',
      'tt_1.token_value as t1_value',
      'ttypes_1.token_type as t1_type',
      'token_2 as t2',
      'tt_2.token_value as t2_value',
      'ttypes_2.token_type as t2_type',
      'token_3 as t3',
      'tt_3.token_value as t3_value',
      'ttypes_3.token_type as t3_type',
    ])
    .where('tt_1.token_value', '=', ngram[0].value)
    .where('ttypes_1.token_type', '=', ngram[0].type)
    .where('tt_2.token_value', '=', ngram[1].value)
    .where('ttypes_2.token_type', '=', ngram[1].type)
    .where('tt_3.token_value', '=', ngram[2].value)
    .where('ttypes_3.token_type', '=', ngram[2].type)
    .limit(1)
    .executeTakeFirst()
  if (!result) {
    return null
  }
  return {
    rowid: result.rowid,
    tokens: [
      {
        rowid: result.t1,
        value: result.t1_value,
        type: result.t1_type,
      },
      {
        rowid: result.t2,
        value: result.t2_value,
        type: result.t2_type,
      },
      {
        rowid: result.t3,
        value: result.t3_value,
        type: result.t3_type,
      },
    ] as const,
  }
}

export const getTextTextNgram = async (db: Kysely<Database>, components: [string, string]) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select(['markov_ngram.rowid', 'markov_ngram.count', 'markov_ngram.token_3', 'tt_3.token_value', 'ttypes_3.token_type'])
    .where('tt_1.token_value', '=', components[0])
    .where('tt_2.token_value', '=', components[1])
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngram: {
      id: x.token_3,
      value: x.token_value,
      type: x.token_type,
    },
  }))
}

export const getTextTokenNgram = async (db: Kysely<Database>, components: [string, TokenType]) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select(['markov_ngram.rowid', 'markov_ngram.count', 'markov_ngram.token_3', 'tt_3.token_value', 'ttypes_3.token_type'])
    .where('tt_1.token_value', '=', components[0])
    .where('ttypes_2.token_type', '=', components[1])
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngram: {
      id: x.token_3,
      value: x.token_value,
      type: x.token_type,
    },
  }))
}

export const getTokenTextNgram = async (db: Kysely<Database>, components: [TokenType, string]) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_1', 'tt_1.token_type', 'ttypes_1.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select(['markov_ngram.rowid', 'markov_ngram.count', 'markov_ngram.token_3', 'tt_3.token_value', 'ttypes_3.token_type'])
    .where('ttypes_1.token_type', '=', components[0])
    .where('tt_2.token_value', '=', components[1])
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngram: {
      id: x.token_3,
      value: x.token_value,
      type: x.token_type,
    },
  }))
}

export const getTokenTokenNgram = async (db: Kysely<Database>, components: [TokenType, TokenType]) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_1', 'tt_1.token_type', 'ttypes_1.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select(['markov_ngram.rowid', 'markov_ngram.count', 'markov_ngram.token_3', 'tt_3.token_value', 'ttypes_3.token_type'])
    .where('ttypes_1.token_type', '=', components[0])
    .where('ttypes_2.token_type', '=', components[1])
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngram: {
      id: x.token_3,
      value: x.token_value,
      type: x.token_type,
    },
  }))
}

export const getTokenNgram = async (db: Kysely<Database>, component: TokenType) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_1', 'tt_1.token_type', 'ttypes_1.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select([
      'markov_ngram.rowid',
      'markov_ngram.count',
      'markov_ngram.token_2 as t2',
      'tt_2.token_value as t2_value',
      'ttypes_2.token_type as t2_type',
      'markov_ngram.token_3 as t3',
      'tt_3.token_value as t3_value',
      'ttypes_3.token_type as t3_type',
    ])
    .where('ttypes_1.token_type', '=', component)
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngrams: [
      {
        id: x.t2,
        value: x.t2_value,
        type: x.t2_type,
      },
      {
        id: x.t3,
        value: x.t3_value,
        type: x.t3_type,
      },
    ],
  }))
}

export const getTextNgram = async (db: Kysely<Database>, component: string) => {
  const results = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select([
      'markov_ngram.rowid',
      'markov_ngram.count',
      'markov_ngram.token_2 as t2',
      'tt_2.token_value as t2_value',
      'ttypes_2.token_type as t2_type',
      'markov_ngram.token_3 as t3',
      'tt_3.token_value as t3_value',
      'ttypes_3.token_type as t3_type',
    ])
    .where('tt_1.token_value', '=', component)
    .execute()

  return results.map((x) => ({
    id: x.rowid,
    count: x.count,
    ngrams: [
      {
        id: x.t2,
        value: x.t2_value,
        type: x.t2_type,
      },
      {
        id: x.t3,
        value: x.t3_value,
        type: x.t3_type,
      },
    ],
  }))
}

export const getRandomNgram = async (db: Kysely<Database>) => {
  const result = await db
    .selectFrom('markov_ngram')
    .innerJoin('markov_token_table as tt_1', 'markov_ngram.token_1', 'tt_1.rowid')
    .innerJoin('markov_token_table as tt_2', 'markov_ngram.token_2', 'tt_2.rowid')
    .innerJoin('markov_token_table as tt_3', 'markov_ngram.token_3', 'tt_3.rowid')
    .innerJoin('markov_token_types as ttypes_1', 'tt_1.token_type', 'ttypes_1.rowid')
    .innerJoin('markov_token_types as ttypes_2', 'tt_2.token_type', 'ttypes_2.rowid')
    .innerJoin('markov_token_types as ttypes_3', 'tt_3.token_type', 'ttypes_3.rowid')
    .select([
      'markov_ngram.rowid',
      'markov_ngram.count',
      'token_1 as t1',
      'tt_1.token_value as t1_value',
      'ttypes_1.token_type as t1_type',
      'token_2 as t2',
      'tt_2.token_value as t2_value',
      'ttypes_2.token_type as t2_type',
      'token_3 as t3',
      'tt_3.token_value as t3_value',
      'ttypes_3.token_type as t3_type',
    ])
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .executeTakeFirstOrThrow()

  return {
    id: result.rowid,
    count: result.count,
    ngrams: [
      {
        id: result.t1,
        value: result.t1_value,
        type: result.t1_type,
      },
      {
        id: result.t2,
        value: result.t2_value,
        type: result.t2_type,
      },
      {
        id: result.t3,
        value: result.t3_value,
        type: result.t3_type,
      },
    ],
  }
}

export const retrieveToken = async (db: Kysely<Database>, token: Token) => {
  const storedToken = await db
    .selectFrom(MetaTokenTable)
    .innerJoin(TokenTypeTable, `${TokenTypeTable}.${RowIdCol}`, `${MetaTokenTable}.${TokenTypeCol}`)
    .select([`${MetaTokenTable}.${RowIdCol} as rowid`, `${MetaTokenTable}.${TokenValueCol} as value`, `${TokenTypeTable}.${TokenTypeCol} as type`])
    .where(TokenValueCol, '=', token.value)
    .where('markov_token_types.token_type', '=', token.type)
    .limit(1)
    .executeTakeFirst()
  if (storedToken) {
    return {
      value: storedToken.value,
      type: storedToken.type,
      id: storedToken.rowid,
    }
  }
  return null
}

export const storeToken = async (db: Kysely<Database>, token: Token) => {
  await db
    .insertInto(MetaTokenTable)
    .values({
      [TokenValueCol]: token.value,
      [TokenTypeCol]: sql`(SELECT rowid FROM "markov_token_types" WHERE token_type = ${token.type})`,
      [OccurrenceCol]: 1,
    })
    .onConflict((oc) => oc.doUpdateSet({ [OccurrenceCol]: () => sql`count + 1` }))
    .execute()
}

export const getTokensByType = async (db: Kysely<Database>, token: Token) => {
  const result = await db
    .selectFrom('markov_token_table')
    .innerJoin('markov_token_types as ttype', 'markov_token_table.token_type', 'ttype.rowid')
    .select(['markov_token_table.token_value', 'ttype.token_type', 'markov_token_table.count'])
    .where('ttype.token_type', '=', token.type)
    .execute()
  return result.map((x) => ({ value: x.token_value, type: x.token_type, occurence: x.count }))
}
