import { randomInt } from 'node:crypto'
import type { Kysely } from 'kysely'
import { loggerFactory } from '../../logging'
import {
  type Database,
  getRandomNgram,
  getTextNgram,
  getTextTextNgram,
  getTextTokenNgram,
  getTokenNgram,
  getTokenTextNgram,
  getTokenTokenNgram,
  getTokensByType,
} from './queries'
import { type Token, type TokenType, tokenize } from './tokenizer'

type TokenFrequency = Token & { occurence: number }
const randomFloat = () => randomInt(0, 281474976710655) / 281474976710655

const selectByToken: TokenType[] = [
  'bold_start',
  'bold_end',
  'italic_start',
  'italic_end',
  'strikethrough_start',
  'strikethrough_end',
  'underline_start',
  'underline_end',
  'code_inline_start',
  'code_inline_end',
  'code_block_start',
  'code_block_end',
  'heading_start',
  'heading_end',
  'list_start',
  'list_end',
  'item_start',
  'item_end',
  'block_quote_start',
  'block_quote_end',
  'paragraph_start',
  'paragraph_end',
  'horizontal_line',
  'user_token',
  'emoji',
  'symbols',
  'newline',
  'brace_open',
  'brace_close',
  'punctuation_control',
  'punctuation_interrupt',
  'url',
  'end_of_message',
  'user_name',
]
const selectByValue: TokenType[] = ['text']

const byToken = (token: Token) => selectByToken.includes(token.type)
const byValue = (token: Token) => selectByValue.includes(token.type)

const logger = loggerFactory('Markov')

export const renderSentence = async (db: Kysely<Database>, seedPhrase: string) => {
  const tokens = tokenize(seedPhrase).filter((x) => x.type === 'text')
  const startToken = tokens.length > 1 ? tokens[randomInt(0, tokens.length - 1)] : (await getRandomNgram(db)).ngrams[0]

  const phrase = [startToken]
  for (let i = 0; i < 35; i++) {
    const tokens = await findNgram(db, phrase.slice(-2))
    const nextToken = selectFromSetWeighted(tokens, 0.9)
    phrase.push(nextToken)
  }

  const phrasing: string[] = []
  for (const word of phrase) {
    phrasing.push(await renderToken(db, word))
  }
  return phrasing.join(' ')
}

const renderToken = async (db: Kysely<Database>, token: Token) => {
  if (byValue(token)) {
    return token.value
  }

  if (byToken(token)) {
    const results = await getTokensByType(db, token)
    return selectFromSetWeighted(results, 0.9).value
  }

  throw new Error(`Out of range, ngram was neither selected by text or token - was: ${JSON.stringify(token)}`)
}

const selectFromSetWeighted = (entries: TokenFrequency[], temperature: number) => {
  const sum = entries.reduce((val, a) => val + a.occurence, 0)
  const sortedEntries = entries.sort((a, b) => a.occurence - b.occurence)
  if (sum <= 0) {
    throw new Error('Occurence weight was <= zero')
  }

  const noramlizedSum = randomInt(sum) / sum
  const temperedLocation = noramlizedSum ** (1 - temperature)
  const idx = Math.ceil(temperedLocation * sum)

  let iterSum = idx
  for (const entry of sortedEntries) {
    iterSum -= entry.occurence
    if (iterSum <= 0) {
      return entry
    }
  }
  if (sortedEntries.length > 0) {
    return sortedEntries[0]
  }
  throw new Error('No entries given, throwing')
}

const topFrequencyByType = (tokens: TokenFrequency[]) => {
  // the idea here is to stop character classes to drown out other tokens
  // what we essentially
  const topTiers: Partial<Record<TokenType, TokenFrequency>> = {}
  const keepers: Token[] = []
  for (const token of tokens) {
    if (byValue(token)) {
      keepers.push(token)
      continue
    }

    if (byToken(token)) {
      const current = topTiers[token.type]
      if (current == null || current.occurence < token.occurence) {
        topTiers[token.type] = token
      }
      continue
    }

    throw new Error(`Out of range, ngram was neither selected by text or token - was: ${JSON.stringify(token)}`)
  }

  return [...Object.keys(topTiers).map((x) => topTiers[<TokenType>x]), ...keepers]
}

const findNgram = async (db: Kysely<Database>, tokens: Token[]): Promise<TokenFrequency[]> => {
  if (tokens.length > 1) {
    const result = await findTwoTokenNgram(db, [tokens[0], tokens[1]])
    if (result.length > 0) {
      return result.map((x) => ({
        value: x.ngram.value,
        type: x.ngram.type,
        occurence: x.count,
      }))
    }
  }

  if (tokens.length > 0) {
    const result = await findOneTokenNgram(db, tokens[0])
    if (result.length > 0) {
      return result.map((x) => ({
        value: x.ngrams[0].value,
        type: x.ngrams[0].type,
        occurence: x.count,
      }))
    }
  }

  const randomResult = await getRandomNgram(db)
  return [
    {
      value: randomResult.ngrams[0].value,
      type: randomResult.ngrams[0].type,
      occurence: randomResult.count,
    },
  ]
}

const findTwoTokenNgram = (db: Kysely<Database>, tokens: [Token, Token]) => {
  if (byToken(tokens[0]) && byToken(tokens[1])) {
    return getTokenTokenNgram(db, [tokens[0].type, tokens[1].type])
  }
  if (byToken(tokens[0]) && byValue(tokens[1])) {
    return getTokenTextNgram(db, [tokens[0].type, tokens[1].value])
  }
  if (byValue(tokens[0]) && byToken(tokens[1])) {
    return getTextTokenNgram(db, [tokens[0].value, tokens[1].type])
  }
  if (byValue(tokens[0]) && byValue(tokens[1])) {
    return getTextTextNgram(db, [tokens[0].value, tokens[1].value])
  }
  throw new Error(`Out of range, ngram was neither selected by text or token - was: ${JSON.stringify(tokens)}`)
}

const findOneTokenNgram = (db: Kysely<Database>, token: Token) => {
  if (byToken(token)) {
    return getTokenNgram(db, token.type)
  }
  if (byValue(token)) {
    return getTextNgram(db, token.value)
  }
  throw new Error(`Out of range, ngram was neither selected by text or token - was: ${JSON.stringify(token)}`)
}
