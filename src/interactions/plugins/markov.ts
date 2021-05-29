import {Client, CommandInteraction, Message} from 'discord.js';
import {createWriteStream, readFile, WriteStream} from 'fs';
import {InteractionPlugin, MessagePlugin} from '../../message/hooks';
import loadConfig, {Config} from '../../config';
import {Logger} from 'winston';

let logger: Logger;
const jsmegahal = require('jsmegahal');
const brain = new jsmegahal(2);

function chunk(arr: Array<string>, chunkSize: number) {
  if (chunkSize <= 0) throw 'Invalid chunk size';
  const R = [];
  for (let i = 0, len = arr.length; i < len; i += chunkSize)
    R.push(arr.slice(i, i + chunkSize));
  return R;
}

const loadBrain = (brainFile: string, onFinished: () => void) => {
  readFile(brainFile, {encoding: 'utf-8'}, async (err, data) => {
    if (err) {
      logger.error(err);
      return;
    }

    const lines = data.toString().split('\n');
    const chunks = chunk(lines, 10000);
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].forEach(x => brain.addMass(x));
      await new Promise(r => setTimeout(r, 10));
    }

    logger.info(`Markov Brain tokenized ${lines.length} lines`);
    onFinished();
  });
};

export function markovReply(message: Message) {
  if (Math.random() < 1.0 / 3.0) {
    message.reply(brain.getReplyFromSentence(message.content));
  } else if (Math.random() < 1.0 / 5.0) {
    message.reply(brain.getReply());
  } else {
    message.channel.send(brain.getReply());
  }
}

interface Preload {
  preloadTexts: string[];
  loaded: boolean;
  writeStream?: WriteStream;
}

const plugin: InteractionPlugin & MessagePlugin & Preload = {
  descriptor: {
    name: 'markov',
    description: 'Let the bot babble.',
    options: [
      {
        name: 'prompt',
        description: 'Prompt the bot in some regard.',
        type: 'STRING',
        required: false,
      },
    ],
  },
  preloadTexts: [] as string[],
  loaded: false,

  async onInit(client: Client, config: Config, log: Logger) {
    logger = log;
    loadBrain(loadConfig().brainFile, () => {
      this.loaded = true;
    });

    this.writeStream = createWriteStream(config.brainFile, {flags: 'a'});
  },
  onNewInteraction(interaction: CommandInteraction) {
    interaction.defer();
    if (interaction.options[0]) {
      interaction.followUp(
        brain.getReplyFromSentence(interaction.options[0].value)
      );
      return;
    }
    interaction.followUp(brain.getReply());
  },
  onNewMessage(message: Message) {
    if (this.loaded && this.preloadTexts.length > 0) {
      this.preloadTexts.forEach(x => brain.addMass(x));
      this.preloadTexts.length = 0;
    }

    this.writeStream?.write(`\n${message.cleanContent.replace(/^<.*?> /, '')}`);
    const content = message.cleanContent.toString();
    this.loaded ? brain.addMass(content) : this.preloadTexts.push(content);

    if (Math.random() < 1.0 / 5000.0) {
      markovReply(message);
    }
  },
};

export default plugin;
