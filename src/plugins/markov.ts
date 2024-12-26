import { type WriteStream, createWriteStream, readFile } from 'node:fs'
import Database from 'better-sqlite3'
import { ApplicationCommandOptionType, type ChatInputCommandInteraction, type Message } from 'discord.js'
import { Kysely, SqliteDialect, sql } from 'kysely'
import type { Logger } from 'winston'
import loadConfig from '../config'
import type { InteractionPlugin, MessagePlugin } from '../message/hooks'
import { buildMarkovChainer } from './markov/database'

let logger: Logger
const jsmegahal = require('jsmegahal')
const brain = new jsmegahal(3)
const dbName = './data/bible.db'

function chunk(arr: Array<string>, chunkSize: number): string[][] {
  if (chunkSize <= 0) throw 'Invalid chunk size'
  const R = []
  for (let i = 0, len = arr.length; i < len; i += chunkSize) R.push(arr.slice(i, i + chunkSize))
  return R
}

const loadBrain = async (brainFile: string, db: Kysely<unknown>, onFinished: () => void) => {
  readFile(brainFile, { encoding: 'utf-8' }, async (err, data) => {
    if (err) {
      logger.error(err)
      return
    }

    const brainDb = new Kysely<unknown>({
      dialect: new SqliteDialect({
        database: new Database(dbName),
      }),
    })
    const markovTrainer = await buildMarkovChainer(brainDb, true, 0.85)
    const startTransaction = sql`BEGIN IMMEDIATE TRANSACTION`
    const endTransaction = sql`COMMIT TRANSACTION`
    await markovTrainer.drop()
    const lines = data.toString().split('\n')
    const chunks = chunk(lines, 15000)
    for (let i = 0; i < chunks.length; i++) {
      startTransaction.execute(brainDb)
      for (const piece of chunks[i]) {
        await markovTrainer.learn(piece)
      }
      endTransaction.execute(brainDb)
      for (const chunk of chunks) {
        brain.addMass(chunk)
      }
      await new Promise((r) => setTimeout(r, 16))
      logger.info(`Chunk [${i + 1}]/[${chunks.length}] done`)
    }
    await sql`VACUUM`.execute(brainDb)

    logger.info(`Markov Brain tokenized ${lines.length} lines`)
    onFinished()
  })
}

export async function markovReply(message: Message) {
  if (Math.random() < 1.0 / 3.0) {
    await message.reply(brain.getReplyFromSentence(message.content))
  } else if (Math.random() < 1.0 / 5.0) {
    await message.reply(brain.getReply())
  } else if (message.channel.isSendable()) {
    await message.channel.send(brain.getReply())
  }
}

interface Preload {
  preloadTexts: string[]
  loaded: boolean
  writeStream?: WriteStream
}

const plugin: InteractionPlugin & MessagePlugin & Preload = {
  name: 'Markov',
  descriptor: {
    name: 'markov',
    description: 'Let the ultimate wisdom of the god bot be bestowed upon you',
    options: [
      {
        name: 'prompt',
        description: 'Ye, oh ye, let thy words be inspire the god bot',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  preloadTexts: [] as string[],
  loaded: false,

  async onInit(_, db, config, log) {
    logger = log
    await loadBrain(loadConfig().brainFile, db, () => {
      this.loaded = true
    })

    this.writeStream = createWriteStream(config.brainFile, { flags: 'a' })
  },
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const brainDb = new Kysely<unknown>({
      dialect: new SqliteDialect({
        database: new Database(dbName),
      }),
    })
    const markovTrainer = await buildMarkovChainer(brainDb, true, 0.85)
    const sentence = await markovTrainer.reply(interaction.options.getString('prompt', false) ?? '')
    interaction.followUp(sentence.slice(0, 2000))

    /*
    const prompt = interaction.options.getString('prompt');
    if (prompt) {
      await interaction.followUp(brain.getReplyFromSentence(prompt));
      return;
    }
    await interaction.followUp(brain.getReply());
    */
  },
  async onNewMessage(message: Message) {
    return
    /*
    if (this.loaded && this.preloadTexts.length > 0) {
      this.preloadTexts.forEach(x => brain.addMass(x));
      this.preloadTexts.length = 0;
    }
    
    await message.fetch()
    const content = message.cleanContent.toString();
    const brainDb = new Kysely<any>({
      dialect: new SqliteDialect({
        database: new Database("./data/markov.db")
      })
    });
    const markovTrainer = await buildMarkovChainer(brainDb, true, 0.85);
    const sentence = (await markovTrainer.reply(content));
    message.reply(sentence);

    // const tokenized = tokenize(content.split(" "));
    // logger.info(`Received '${content.split(" ")}': \n${JSON.stringify(tokenized, null, 2)}`);
    if(content.length <= 1) {
      return;
    }
    this.writeStream?.write(`${content}\n`);
    this.loaded ? brain.addMass(content) : this.preloadTexts.push(content);

    if (Math.random() < 1.0 / 5000.0) {
      const brainDb = new Kysely<any>({
        dialect: new SqliteDialect({
          database: new Database("./data/markov.db")
        })
      });
      const markovTrainer = await buildMarkovChainer(brainDb, true, 0.85);
      const sentence = (await markovTrainer.reply(content));
      message.reply(sentence);
    }
    */
  },
}

export default plugin
