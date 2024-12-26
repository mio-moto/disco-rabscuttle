import { randomInt } from 'node:crypto'
import { type Kysely, sql } from 'kysely'
import { loggerFactory } from '../../logging'
import {
  type Database,
  MarkovTable,
  OccurrenceCol,
  TokenOneCol,
  TokenThreeCol,
  TokenTwoCol,
  createDatabase,
  dropDatabase,
  retrieveToken,
  storeToken,
} from './queries'
import { renderSentence } from './renderer'
import { type Token, type TokenType, TokenTypeList, tokenize } from './tokenizer'

const randomFloat = () => randomInt(0, 281474976710655) / 281474976710655

const logger = loggerFactory('markov')

type NGramValue = { value: string; type: TokenType; id: bigint }
type Trigram = [NGramValue, NGramValue, NGramValue]

const storeTokens = async (tokens: Token[], db: Kysely<Database>) => {
  for (const entry of tokens) {
    await storeToken(db, entry)
  }
}

const retrieveTokens = async (tokens: Token[], db: Kysely<Database>, tokenTypes: Record<TokenType, bigint>): Promise<NGramValue[]> => {
  const storedTokens: { value: string; type: TokenType; id: bigint }[] = []
  for (const token of tokens) {
    const storedToken = await retrieveToken(db, token)
    if (!storedToken?.id) {
      continue
    }
    if (storedToken) {
      storedTokens.push({
        value: storedToken.value,
        type: storedToken.type,
        id: storedToken.id,
      })
    }
  }
  return storedTokens
}

const writeIntoMarkovDb = async (trigram: Trigram, db: Kysely<Database>) => {
  /*
    const writtenTokens = await storeTokens(trigram, db);
    if(writtenTokens.length != trigram.length) {
        throw new Error(`some failure while inserting the trigram of: ${JSON.stringify(trigram)}, received: ${JSON.stringify(writtenTokens)}`);
    }
    */

  await db
    .insertInto(MarkovTable)
    .values({
      [TokenOneCol]: trigram[0].id,
      [TokenTwoCol]: trigram[1].id,
      [TokenThreeCol]: trigram[2].id,
      [OccurrenceCol]: 1,
    })
    .onConflict((oc) =>
      oc.doUpdateSet({
        [OccurrenceCol]: () => sql`count + 1`,
      }),
    )
    .execute()
}

const learnTokens = async (tokens: Token[], db: Kysely<Database>, tokenTypes: Record<TokenType, bigint>) => {
  if (tokens.length < 3) {
    return
  }
  await storeTokens(tokens, db)
  const learntTokens = await retrieveTokens(tokens, db, tokenTypes)
  if (learntTokens.length !== tokens.length) {
    throw new Error('Could not learn all tokens, aborting')
  }
  for (let i = 0; i < learntTokens.length - 3; i++) {
    const ngram = [learntTokens[i + 0], learntTokens[i + 1], learntTokens[i + 2]]
    const [first, second, third] = ngram

    await writeIntoMarkovDb([first, second, third], db)
  }
}

const allowedTokens: TokenType[] = [
  'heading_start',
  'heading_end',
  'item_start',
  'block_quote_start',
  'user_token',
  'emoji',
  'symbols',
  'newline',
  'brace_open',
  'punctuation_control',
  'punctuation_interrupt',
  'url',
  'user_name',
  'text',
]

export const buildMarkovChainer = async (flexibleDb: Kysely<unknown>, drop: boolean, temperature: number) => {
  const result = await createDatabase(flexibleDb, TokenTypeList)
  const db = result[0]
  let tokenTypes = result[1]

  return {
    learn: async (body: string) => {
      const bodyLowercase = body.toLowerCase()
      const tokens = tokenize(bodyLowercase).filter((x) => allowedTokens.includes(x.type))
      await learnTokens(tokens, db, tokenTypes)
    },
    drop: async () => {
      const result = await createDatabase(await dropDatabase(db), TokenTypeList)
      tokenTypes = result[1]
    },
    reply: async (body: string): Promise<string> => {
      return await renderSentence(db, body)
    },
  }
}
