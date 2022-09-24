import {
  AutocompleteInteraction,
  CommandInteraction,
  MessageEmbed
} from 'discord.js';
import { AutoCompletePlugin, InteractionPlugin } from '../../message/hooks';
import { readFileSync } from 'fs';

const pepeNameRegex = /assets\/emoji\/(?<id>\d+)?[-_]?(?<pepe>.*?)\.(?:gif|png)/

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const hash = (s: string) => {
  let h = 0;
  for(let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}

const camelize = (str: string) => {
  return str
    .replace("-", " ")
    .replace("_", " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
    .replace(/\s+/g, '');
}

const URIs = JSON.parse(readFileSync('data/pepes.json', 'utf-8')) as string[];
const pepes = URIs.map(x => {
  const result = pepeNameRegex.exec(x);
  if (!result) {
    return null;
  }
  const id = result.groups!["id"] ?? '';
  const idText = id.length > 0 ? `[${id}] ` : '';
  const name = camelize(result.groups!["pepe"])
  const renderedText = `${idText}${name.slice(0, 100 - idText.length)}`;
  return {
    "name": renderedText,
    "value": x
  }
}).filter(notEmpty)

export const shuffle = <T>(array: Array<T>) => {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};

let activeList: string[] = [];

const seedPepe = (phrase: string) => {
  const hashValue = Math.abs(hash(phrase.toLowerCase().trim()));
  const entry = hashValue % URIs.length;
  return new MessageEmbed().setFooter({ text: phrase }).setImage(URIs[entry]);
}

const randomPepe = () => {
  if (activeList.length === 0) {
    activeList = shuffle(URIs);
  }
  return activeList.shift() ?? '';
};

const pepeReply = async (interaction: CommandInteraction) => {
  const phrase = interaction.options.getString('phrase');
  if (phrase && phrase.length > 0) {
    await interaction.reply({
      ephemeral: false,
      embeds: [seedPepe(phrase)]
    })
  } else {
    await interaction.reply(randomPepe())
  }
};

const pepeSearch = async (interaction: AutocompleteInteraction) => {
  const query = interaction.options.getString("query", true).toLowerCase();
  if (query.length <= 0) {
    const randomPepes = shuffle(pepes).slice(0, 25).sort((a, b) => a.name.localeCompare(b.name));
    return await interaction.respond(randomPepes);
  }
  const matches = shuffle(pepes.filter(x => x.name.toLowerCase().includes(query))).slice(0, 25);
  await interaction.respond(matches);
}

const pepeSearchReply = async (interaction: CommandInteraction) => {
  const url = interaction.options.getString("query", true);
  const pepe = pepes.find(x => x.value == url)!;
  await interaction.reply({
    ephemeral: false,
    embeds: [
      new MessageEmbed()
        .setTitle(pepe.name ?? "")
        .setURL(pepe.value)
        .setImage(url)
    ]
  });
}

export const SearchPepe: InteractionPlugin & AutoCompletePlugin = {
  descriptor: {
    name: 'pepe',
    description: 'Search the pepe library',
    options: [{
      type: 'STRING',
      name: 'query',
      description: 'Search phrase to find a pepe from',
      required: true,
      autocomplete: true
    }]
  },
  onNewInteraction: pepeSearchReply,
  onAutoComplete: pepeSearch
}

export const EightPepe: InteractionPlugin = {
  descriptor: {
    name: '8pepe',
    description: 'Ask the mighty Rabscootle a question and he will respond.',
    options: [
      {
        type: 'STRING',
        name: 'phrase',
        description: 'Optional seed phrase',
        required: false
      }
    ]
  },
  onNewInteraction: pepeReply
};