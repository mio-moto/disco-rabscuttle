import { readFile, writeFile } from 'node:fs'
import { ApplicationCommandOptionType, type AutocompleteInteraction, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { marked } from 'marked'
import type { Logger } from 'winston'
import type { AutoCompletePlugin, InteractionPlugin } from '../message/hooks'
import { createOrRetrieveStore, retrievePepeConfig } from './8pepe'
import { type PepeInterface, Rarity } from './pepe-storage'
import { shuffle } from './pepe-storage/randomizer'

let logger: Logger

interface Quote {
  0: number
  1: string
  2: string
  3: number
}

type Records = Array<Quote>

const stubError = () => {
  throw new Error('Stub, not an implementation')
}
let pepeInterface: PepeInterface = {
  [Rarity.ultra]: [],
  [Rarity.normal]: [],
  [Rarity.rare]: [],
  hashNormal: stubError,
  hashRare: stubError,
  hashUltra: stubError,
  randomNormal: stubError,
  randomRare: stubError,
  randomUltra: stubError,
  doesExist: stubError,
  hash: stubError,
  pepeOfTheDay: stubError,
  gachaPepe: stubError,
  proposeOwner: stubError,
  getPepepOfTheDay: stubError,
  setPepeOfTheDay: stubError,
  suggestPepeName: stubError,
  findPepeByName: stubError,
  submitVote: stubError,
  submitPhrase: stubError,
  getVotingResult: stubError,
  getAllVotings: stubError,
  getImage: stubError,
  getVotingsOlderThan: stubError,
  beginVoting: stubError,
  closeVoting: stubError,
}

const quotes: Records = [[1, '2', '3', 4]]

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

const load = () => {
  readFile('./data/quotes.json', (err, data) => {
    if (err) {
      logger.error("Could not populate 'data/quote.json'")
      return
    }

    quotes.push(...(JSON.parse(data.toString()) as Records))
    logger.info(`Populated quote dataset (${quotes.length} entries).`)
  })
}

const randomInt = (max: number): number => {
  return Math.floor(Math.random() * Math.floor(max))
}

const embedQuote = async (quote: Quote) =>
  new EmbedBuilder()
    .setDescription(quote[1])
    .setFooter({ text: `Quote #${quote[0]} — submitted by ${quote[2]}` })
    .setImage((await pepeInterface.hashNormal(quote[1])).value)
    .setTimestamp(quote[3] * 1000)
    .setColor('Aqua')
const getUsercount = (): number => {
  const users = new Set()
  for (const quote of quotes) {
    users.add(quote)
  }
  return users.size
}

const getAutoCompleteEntry = (quote: Quote) => {
  const indexName = `[${quote[0]}] `
  const tokens = marked.lexer(quote[1], { breaks: true, gfm: true })
  const quoteText = tokens
    .map((x) => ('text' in x ? x.text : undefined))
    .filter((x) => !!x)
    .join(' ')
    .replace(/\*\*/gm, '')
    .slice(0, 100 - indexName.length)
  return {
    value: quote[0],
    name: `${indexName}${quoteText}`,
  }
}

const getAutoCompleteEntryString = (quote: Quote) => {
  const entry = getAutoCompleteEntry(quote)
  return { ...entry, value: `${entry.value}` }
}

const runtime = {
  pickRandomQuote: () => {
    return embedQuote(quotes[randomInt(quotes.length)])
  },
  getQuote: async (index: number) => {
    const quote = quotes.find((x) => x[0] === index)
    if (quote == null) {
      return new EmbedBuilder().setColor('Red').setTitle(`The quote with the index [${index}] does not seem to exist`)
    }
    return await embedQuote(quote)
  },
  statusReport: () => `There are ${quotes.length} quotes from ${getUsercount()} shitposters. You're welcome.`,
  addQuote: (interaction: ChatInputCommandInteraction): string => {
    // quote: string, author: string
    const quote = interaction.options.getString('quote', true)
    const author = interaction.member?.user.username ?? 'unknown'
    const newQuoteIndex = quotes[quotes.length - 1][0] + 1
    const newQuote: Quote = [newQuoteIndex, quote, author, new Date().getTime() / 1000]
    quotes.push(newQuote)
    writeFile('./data/quotes.json', JSON.stringify(quotes), (err) => {
      if (err) {
        logger.error(`Could not write 'data/quotes.json':\n${err}`)
      }
    })
    return `${author}s quote has been added, its index is ${newQuoteIndex + 1}`
  },
  searchQuote: (query: string) => {
    if (query === '') {
      return shuffle(quotes).slice(0, 25).map(getAutoCompleteEntryString)
    }
    return quotes
      .filter((x) =>
        query
          .toLowerCase()
          .split(' ')
          .every((y) => x[1].toLowerCase().includes(y)),
      )
      .slice(0, 25)
      .map(getAutoCompleteEntryString)
  },
  searchIndex: (index: number) => {
    if (index === 0) {
      return shuffle(quotes)
        .slice(0, 25)
        .sort((a, b) => a[0] - b[0])
        .map(getAutoCompleteEntry)
    }
    const stringIndex = `${index}`
    return quotes
      .map((x: Quote): [string, number] => [`${x[0]}`, x[0]])
      .filter((x) => x[0].startsWith(stringIndex))
      .map((x) => quotes.find((y) => y[0] === x[1]))
      .filter((x) => !!x)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 25)
      .map(getAutoCompleteEntry)
  },
} as const

const plugin: InteractionPlugin & AutoCompletePlugin = {
  name: 'Quote',
  descriptor: {
    name: 'quote',
    description: 'Sending and storing quotes',
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'random',
        description: 'Blerp a random quote',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'add',
        description: 'Add a new command',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'quote',
            description: 'Type the message you want to add.',
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'status',
        description: 'Brief panel about the contents of this database.',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'search',
        description: 'Reply with a specific quote.',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'query',
            description: 'string that partially matches a quote',
            autocomplete: true,
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'index',
        description: 'Send a specific quote by its number',
        options: [
          {
            type: ApplicationCommandOptionType.Number,
            name: 'index',
            description: 'Number that matches the quote',
            autocomplete: true,
            required: true,
          },
        ],
      },
    ],
  },

  onInit: async (client, db, config, log) => {
    logger = log
    const pepeConfig = retrievePepeConfig(config).pepes
    pepeInterface = await createOrRetrieveStore(client, pepeConfig, db)
    load()
  },
  onNewInteraction: async (interaction: ChatInputCommandInteraction) => {
    const subCommand = interaction.options.getSubcommand() as 'random' | 'status' | 'add' | 'search' | 'index'
    let index: number
    switch (subCommand) {
      case 'random':
        return await interaction.reply({ embeds: [await runtime.pickRandomQuote()] })
      case 'status':
        return await interaction.reply(runtime.statusReport())
      case 'add':
        return await interaction.reply(runtime.addQuote(interaction))
      case 'search':
        index = Number.parseInt(interaction.options.getString('query', true))
        return await interaction.reply({ embeds: [await runtime.getQuote(index)] })
      case 'index':
        index = interaction.options.getNumber('index', true)
        return await interaction.reply({ embeds: [await runtime.getQuote(index)] })
    }
  },
  onAutoComplete: async (interaction: AutocompleteInteraction) => {
    const subcommand = interaction.options.getSubcommand() as 'search' | 'index'
    switch (subcommand) {
      case 'search':
        return await interaction.respond(runtime.searchQuote(interaction.options.getString('query', true)))
      case 'index':
        return await interaction.respond(runtime.searchIndex(interaction.options.getNumber('index', true)))
    }
  },
}

export default plugin
