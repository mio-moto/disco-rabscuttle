import {
  ChatInputCommandInteraction,
  Message,
  ApplicationCommandOptionType,
} from 'discord.js';
import {createWriteStream, readFile, WriteStream} from 'fs';
import {InteractionPlugin, MessagePlugin} from '../message/hooks';
import loadConfig from '../config';
import {Logger} from 'winston';

let logger: Logger;
const jsmegahal = require('jsmegahal');
const brain = new jsmegahal(4);

function chunk(arr: Array<string>, chunkSize: number) {
  if (chunkSize <= 0) throw 'Invalid chunk size';
  const R = [];
  for (let i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
}

const loadBrain = async (brainFile: string, onFinished: () => void) => {
  readFile(brainFile, {encoding: 'utf-8'}, async (err, data) => {
    if (err) {
      logger.error(err);
      return;
    }

    const lines = data.toString().split('\n');
    const chunks = chunk(lines, 5000);
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].forEach(x => brain.addMass(x));
      await new Promise(r => setTimeout(r, 8));
    }

    logger.info(`Markov Brain tokenized ${lines.length} lines`);
    onFinished();
  });
};

export async function markovReply(message: Message) {
  if (Math.random() < 1.0 / 3.0) {
    await message.reply(brain.getReplyFromSentence(message.content));
  } else if (Math.random() < 1.0 / 5.0) {
    await message.reply(brain.getReply());
  } else {
    await message.channel.send(brain.getReply());
  }
}

interface Preload {
  preloadTexts: string[];
  loaded: boolean;
  writeStream?: WriteStream;
}

const plugin: InteractionPlugin & MessagePlugin & Preload = {
  name: "Markov",
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

  async onInit(_, __, config, log) {
    logger = log;
    await loadBrain(loadConfig().brainFile, () => {
      this.loaded = true;
    });

    this.writeStream = createWriteStream(config.brainFile, {flags: 'a'});
  },
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt');
    if (prompt) {
      await interaction.followUp(brain.getReplyFromSentence(prompt));
      return;
    }
    await interaction.followUp(brain.getReply());
  },
  async onNewMessage(message: Message) {
    if (this.loaded && this.preloadTexts.length > 0) {
      this.preloadTexts.forEach(x => brain.addMass(x));
      this.preloadTexts.length = 0;
    }

    this.writeStream?.write(`\n${message.cleanContent.replace(/^<.*?> /, '')}`);
    const content = message.cleanContent.toString();
    this.loaded ? brain.addMass(content) : this.preloadTexts.push(content);

    if (Math.random() < 1.0 / 5000.0) {
      await markovReply(message);
    }
  },
};

export default plugin;
