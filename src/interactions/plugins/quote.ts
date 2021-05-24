import {Client, CommandInteraction} from 'discord.js';
import {readFile, writeFile} from 'fs';
import {InteractionPlugin} from '../../message/hooks';
import {Config} from '../../config';

interface Quote {
  0: number;
  1: string;
  2: string;
  3: number;
}

type Records = Array<Quote>;

const quotes: Records = [[1, '2', '3', 4]];

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const load = () => {
  readFile('./data/quotes.json', (err, data) => {
    if (err) {
      console.error("Could not populate 'data/quote.json'");
      return;
    }

    quotes.push(...(JSON.parse(data.toString()) as Records));
    console.log(`Populated quote dataset (${quotes.length} entries).`);
  });
};

const randomInt = (max: number): number => {
  return Math.floor(Math.random() * Math.floor(max));
};

const timeFormatter = (unixTimestamp: number): string => {
  const time = new Date(unixTimestamp * 1000);
  const year = time.getFullYear();
  const month = months[time.getMonth()];
  const date = time.getDate();
  return `${date} ${month} ${year}`;
};

const formatQuote = (quote: Quote, extraInfo: boolean): string => {
  const metaData = extraInfo
    ? `\n _submitted by **${quote[2]}** on ${timeFormatter(quote[3])}`
    : '';
  return `${quote[0] + 1}: \n > ${quote[1]
    .split('||')
    .join('\n> ')}${metaData}`;
};

const getUsercount = (): number => {
  const users = new Set();
  quotes.forEach(x => users.add(x));
  return users.size;
};

const runtime = {
  pickRandomQuote: (extras: boolean) =>
    formatQuote(quotes[randomInt(quotes.length)], extras),
  getQuote: (index: number, extras: boolean) =>
    formatQuote(quotes[index - 1], extras),
  statusReport: () =>
    `There are ${
      quotes.length
    } quotes from ${getUsercount()} shitposters. You're welcome.`,
  addQuote: (quote: string, author: string): string => {
    author = author ?? 'unknown';
    const newQuoteIndex = quotes[quotes.length - 1][0] + 1;
    const newQuote: Quote = [
      newQuoteIndex,
      quote,
      author,
      new Date().getTime() / 1000,
    ];
    quotes.push(newQuote);
    writeFile('./data/quotes.json', JSON.stringify(quotes), err => {
      if (err) {
        console.error(`Could not write 'data/quotes.json':\n${err}`);
      }
    });
    return `${author}s quote has been added, its index is ${newQuoteIndex + 1}`;
  },
} as const;

const plugin: InteractionPlugin = {
  descriptor: {
    name: 'quote',
    description: 'Sending and storing quotes',
    options: [
      {
        type: 'SUB_COMMAND',
        name: 'random',
        description: 'Blerp a random quote',
      },
      {
        type: 'SUB_COMMAND',
        name: 'add',
        description: 'Add a new command',
        options: [
          {
            type: 'STRING',
            name: 'quote',
            description: 'Type the message you want to add.',
            required: true,
          },
        ],
      },
      {
        type: 'SUB_COMMAND',
        name: 'status',
        description: 'Brief panel about the contents of this database.',
      },
      {
        type: 'SUB_COMMAND',
        name: 'index',
        description: 'Reply with a specific quote.',
        options: [
          {
            type: 'INTEGER',
            name: 'number',
            description: 'Quote Index Number',
          },
        ],
      },
    ],
  },

  onInit: (_: Client, __: Config) => {
    load();
  },
  onNewInteraction: (interaction: CommandInteraction) => {
    if (interaction.options[0].name === 'random') {
      interaction.reply(runtime.pickRandomQuote(false));
      return;
    }

    if (interaction.options[0].name === 'status') {
      interaction.reply(runtime.statusReport());
    }

    if (
      interaction.options[0].name === 'add' &&
      interaction.options &&
      interaction.options[0].options &&
      interaction.options[0].options[0].value
    ) {
      runtime.addQuote(
        <string>interaction.options[0].options[0].value,
        interaction.member?.user.username ?? ''
      );
    }

    if (
      interaction.options[0].name === 'index' &&
      interaction.options &&
      interaction.options[0].options &&
      interaction.options[0].options[0].value
    ) {
      const index = <number>interaction.options[0].options[0].value;
      interaction.reply(runtime.getQuote(index, false));
    }
  },
};

export default plugin;
