import { marked } from 'marked'
import logger from '../../logging'

type FormatterToken =
  | 'bold_start'
  | 'bold_end'
  | 'italic_start'
  | 'italic_end'
  | 'strikethrough_start'
  | 'strikethrough_end'
  | 'underline_start'
  | 'underline_end'
type CodeToken = 'code_inline_start' | 'code_inline_end' | 'code_block_start' | 'code_block_end'
type HeadingToken = 'heading_start' | 'heading_end'
type ListToken = 'list_start' | 'list_end' | 'item_start' | 'item_end'
type QuoteToken = 'block_quote_start' | 'block_quote_end'
type ParagraphToken = 'paragraph_start' | 'paragraph_end'
type StylingToken = 'horizontal_line'
type Specialties = 'user_token' | 'user_name'
type TextToken = 'emoji' | 'symbols' | 'text' | 'newline' | 'brace_open' | 'brace_close' | 'punctuation_control' | 'punctuation_interrupt' | 'url'
type MetaToken = 'end_of_message'
export type TokenType =
  | FormatterToken
  | CodeToken
  | HeadingToken
  | ListToken
  | QuoteToken
  | ParagraphToken
  | StylingToken
  | TextToken
  | Specialties
  | MetaToken
export const TokenTypeList: TokenType[] = [
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
  'user_name',
  'emoji',
  'symbols',
  'text',
  'newline',
  'brace_open',
  'brace_close',
  'punctuation_control',
  'punctuation_interrupt',
  'url',
  'end_of_message',
]

const toMetaToken = (c: string) => String.fromCharCode(-c.charCodeAt(0))

export interface Token {
  type: TokenType
  value: string
}

const linearize = (token: marked.Token): Token[] => {
  const linearTokens: Token[] = []
  let start: string | undefined
  let end: string | undefined
  switch (token.type) {
    // apparently new lines are spacers
    case 'space':
      return [
        {
          type: 'newline',
          value: token.raw,
        },
      ]
    case 'code':
      return [
        {
          type: 'code_block_start',
          value: `\`\`\`${token.lang ?? ''}\n`,
        },
        {
          type: 'text',
          value: token.text,
        },
        {
          type: 'code_block_end',
          value: '\n```',
        },
      ]
    case 'heading':
      return [
        {
          type: 'heading_start',
          value: '#'.repeat(token.depth),
        },
        ...token.tokens.flatMap(linearize),
        {
          type: 'heading_end',
          value: '\n',
        },
      ]
    case 'hr':
      return [
        {
          type: 'horizontal_line',
          value: token.raw,
        },
      ]
    case 'blockquote':
      return [
        {
          type: 'block_quote_start',
          value: '> ',
        },
        ...token.tokens.flatMap(linearize),
        {
          type: 'block_quote_end',
          value: '\n',
        },
      ]
    case 'list':
      return [
        {
          type: 'list_start',
          value: toMetaToken('L'),
        },
        ...token.items.flatMap(linearize),
        {
          type: 'list_end',
          value: '\n',
        },
      ]
    case 'list_item':
      ;[start] = token.raw.split(token.text)
      return [
        {
          type: 'item_start',
          value: start.trim(),
        },
        ...token.tokens.flatMap(linearize),
        {
          type: 'item_end',
          value: '\n',
        },
      ]
    case 'paragraph':
      return [...token.tokens.flatMap(linearize), { type: 'paragraph_end', value: '\n' }]
    case 'text':
      return [
        {
          type: 'text',
          value: token.text.trim(),
        },
      ]
    // there's no support in discord, so them getting parsed is an error
    case 'table':
    case 'html':
    case 'def':
    case 'image':
    case 'link':

    // escapes are just more text tokens
    case 'escape':
      return [
        {
          type: 'text',
          value: token.raw,
        },
      ]
    case 'strong': {
      ;[start, end] = token.text.split(token.text)
      const formatter = start.trim()
      // discord considers __ as underline, the lexer spits out strong and then is handled in the formatter
      const underline = formatter.includes('_')
      return [
        {
          type: underline ? 'underline_start' : 'bold_start',
          value: formatter,
        },
        ...token.tokens.flatMap(linearize),
        {
          type: underline ? 'underline_start' : 'bold_end',
          value: (end ?? start).trim(),
        },
      ]
    }
    case 'em':
      ;[start, end] = token.raw.split(token.text)
      return [
        {
          type: 'italic_start',
          value: start.trim(),
        },
        ...token.tokens.flatMap(linearize),
        {
          type: 'italic_end',
          value: (end ?? start).trim(),
        },
      ]
    case 'codespan':
      ;[start, end] = token.raw.split(token.text)
      return [
        {
          type: 'code_inline_start',
          value: start,
        },
        {
          type: 'text',
          value: token.text.trim(),
        },
        {
          type: 'code_inline_end',
          value: (end ?? start).trim(),
        },
      ]
    case 'br':
      return [
        {
          type: 'newline',
          value: token.raw,
        },
      ]
    case 'del':
      ;[start, end] = token.raw.split(token.text)
      return [
        {
          type: 'strikethrough_start',
          value: start.trim(),
        },
        ...token.tokens.flatMap(linearize),
        {
          type: 'strikethrough_end',
          value: (end ?? start).trim(),
        },
      ]
  }
}

const findWords = /^.*?(?<match>[\w\p{Pd}]+).*?/u

type UnidentifiedToken = {
  type: 'not_identified'
  value: string
}

/*

suppose we take a singular token and forward match it until either running out of characters or classifiers
    match against classifier
    if not matched: continue
    write the classifier into the list of tokens
    overwrite the modifier with what remains
    reset the classifier list
    start again
*/

interface TextClassifier {
  regex: RegExp
  getTokens: (matches: { [key: string]: string }) => Token[]
}

// tiny helper to extract singular matches
const getMatch =
  (type: TokenType = 'text', matchName = 'match') =>
  (matches: { [key: string]: string }) => [{ type: type, value: matches[matchName] }]

const classifiers: TextClassifier[] = [
  {
    // anything that's kind-of an url
    regex: /^<?(?<match>https?:\/\/[^\s]+)>?/,
    getTokens: getMatch('url'),
  },
  {
    // plain words with connecting punctuation or dashed punctuation
    regex: /^(?<match>(?:[\w']+(?:\p{Pc}|\p{Pd}|)*)+)/u,
    getTokens: getMatch(),
  },
  {
    // dashes and slashes
    regex: /^(?<match>[\p{Pc}\p{Pd}\/\\,;]+)/u,
    getTokens: getMatch('punctuation_interrupt'),
  },
  {
    // "open Punctuation" - braces and other openers
    regex: /^(?<match>[\p{Ps}\p{Pi}]+)/u,
    getTokens: getMatch('brace_open'),
  },
  {
    // "close Punctuation" - braces and other openers
    regex: /^(?<match>[\p{Pe}\p{Pf}]+)/u,
    getTokens: getMatch('brace_close'),
  },
  {
    // emojis
    regex: /^(?<match>[\p{Emoji}]+)/u,
    getTokens: getMatch('emoji'),
  },
  {
    // interpunctuation that ends sentences
    regex: /^(?<match>[!?.¡¿:]+)/u,
    getTokens: getMatch('punctuation_control'),
  },
  {
    // discord usernames
    regex: /^(?<token>@\u200b)(?<username>\w)+/,
    getTokens: (matches) => [
      { type: 'user_token', value: matches.token },
      { type: 'user_name', value: matches.username },
    ],
  },
  {
    // anything that's neither a word or a space
    regex: /^(?<match>[^\w\s]+)/,
    getTokens: getMatch('symbols'),
  },
  {
    // anything that's not a space, basically giving up
    regex: /^(?<match>[^\s]+)/,
    getTokens: getMatch('text'),
  },
]

const classifyText = (text: string, classifiers: TextClassifier[]): Token[] => {
  let remainder = text.trim()
  const tokens: Token[] = []

  for (let i = 0; i < classifiers.length && remainder.length > 0; i += 1) {
    const classifier = classifiers[i]

    const match = remainder.match(classifier.regex)
    if (!match || !match.groups) {
      continue
    }

    const parts = remainder.split(classifier.regex)
    remainder = parts[parts.length - 1].trim()
    for (const token of classifier.getTokens(match.groups)) {
      tokens.push(token)
    }
    i = -1
  }

  return tokens
}

const processTokens = (tokens: Token[]): Token[] => {
  return tokens.flatMap((token) => {
    if (token.type !== 'text') {
      return token
    }
    return classifyText(token.value, classifiers)
  })
}

export const tokenize = (paragraph: string) => {
  try {
    // lexer tree
    const tokens = marked.lexer(paragraph, { breaks: true, gfm: true })
    // linearizing as first phase processing
    const linearTokens: Token[] = [...tokens.flatMap(linearize)] // , { type: "end_of_message", value: toMetaToken("e") }]
    const processedTokens = processTokens(linearTokens)
    return processedTokens
  } catch (e) {
    logger.error(e)
    throw e
  }
}
