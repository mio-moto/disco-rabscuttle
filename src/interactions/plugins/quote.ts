import { AutocompleteInteraction, Client, ChatInputCommandInteraction, ApplicationCommandOptionType } from 'discord.js';
import { readFile, writeFile } from 'fs';
import { AutoCompletePlugin, InteractionPlugin } from '../../message/hooks';
import { Config } from '../../config';
import { Logger } from 'winston';
import { shuffle } from './pepe-storage/randomizer';

let logger: Logger;

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
      logger.error("Could not populate 'data/quote.json'");
      return;
    }

    quotes.push(...(JSON.parse(data.toString()) as Records));
    logger.info(`Populated quote dataset (${quotes.length} entries).`);
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
  return `${quote[0]}:\n> ${quote[1]
    .split('||')
    .join('\n> ')}${metaData}`;
};

const getUsercount = (): number => {
  const users = new Set();
  quotes.forEach(x => users.add(x));
  return users.size;
};

const getAutoCompleteEntry = (quote: Quote) => {
  const indexName = `[${quote[0]}] `;
  const quoteText = quote[1].slice(0, 100 - indexName.length);
  return {
    value: quote[0],
    name: `${indexName}${quoteText}`
  };
};

const getAutoCompleteEntryString = (quote: Quote) => {
  const entry = getAutoCompleteEntry(quote);
  return { ...entry, value: `${entry.value}` }
}

const runtime = {
  pickRandomQuote: (extras: boolean) =>
    formatQuote(quotes[randomInt(quotes.length)], extras),
  getQuote: (index: number, extras: boolean) => {
    const quote = quotes.find(x => x[0] == index);
    if (quote == null) {
      return `The quote with the index [${index}] does not seem to exist`
    }
    return formatQuote(quote, extras);
  },
  statusReport: () =>
    `There are ${quotes.length
    } quotes from ${getUsercount()} shitposters. You're welcome.`,
  addQuote: (interaction: ChatInputCommandInteraction): string => {
    // quote: string, author: string
    var quote = interaction.options.getString("quote", true);
    var author = interaction.member?.user.username ?? 'unknown';
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
        logger.error(`Could not write 'data/quotes.json':\n${err}`);
      }
    });
    return `${author}s quote has been added, its index is ${newQuoteIndex + 1}`;
  },
  searchQuote: (query: string) => {
    if (query === '') {
      return shuffle(quotes)
        .slice(0, 25)
        .map(getAutoCompleteEntryString);
    }
    return quotes
      .filter(x => query.toLowerCase().split(" ").every(y => x[1].toLowerCase().includes(y)))
      .slice(0, 25)
      .map(getAutoCompleteEntryString);
  },
  searchIndex: (index: number) => {
    if (index == 0) {
      return shuffle(quotes)
        .slice(0, 25)
        .sort((a, b) => a[0] - b[0])
        .map(getAutoCompleteEntry);
    }
    var stringIndex = `${index}`
    return quotes
      .map((x: Quote): [string, number] => [`${x[0]}`, x[0]])
      .filter(x => x[0].startsWith(stringIndex))
      .map(x => quotes.find(y => y[0] === x[1])!)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 25)
      .map(getAutoCompleteEntry);
  }
} as const;

const plugin: InteractionPlugin & AutoCompletePlugin = {
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
            required: true
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
            required: true
          },
        ],
      },
    ],
  },

  onInit: async (_: Client, __: Config, log: Logger) => {
    logger = log;
    load();
  },
  onNewInteraction: async (interaction: ChatInputCommandInteraction) => {
    const subCommand = interaction.options.getSubcommand() as "random" | "status" | "add" | "search" | "index";
    let index: number;
    switch (subCommand) {
      case 'random':
        return await interaction.reply(runtime.pickRandomQuote(false));
      case 'status':
        return await interaction.reply(runtime.statusReport());
      case 'add':
        return await interaction.reply(runtime.addQuote(interaction));
      case 'search':
        index = parseInt(interaction.options.getString('query', true));
        return await interaction.reply(runtime.getQuote(index, false));
      case 'index':
        index = interaction.options.getNumber('index', true);
        return await interaction.reply(runtime.getQuote(index, false));
    }
  },
  onAutoComplete: async (interaction: AutocompleteInteraction) => {
    const subcommand = interaction.options.getSubcommand() as "search" | "index";
    switch (subcommand) {
      case 'search':
        return await interaction.respond(runtime.searchQuote(interaction.options.getString('query', true)))
      case 'index':
        return await interaction.respond(runtime.searchIndex(interaction.options.getNumber('index', true)))
    }
  }
};

export default plugin;
