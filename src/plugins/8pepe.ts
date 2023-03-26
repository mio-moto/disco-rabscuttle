import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
} from 'discord.js';
import { AutoCompletePlugin, ButtonPlugin, ContextMenuPlugin, InteractionPlugin } from '../message/hooks';
import { initializePepeInterface, PepeConfig, PepeIconData, PepeInterface, PepeVoting, Rarity } from './pepe-storage';
import { embedNormal, embedPepeOfTheDay, embedPepeSearchResult, embedRare, embedUltra } from './pepe-storage/embed-builders';
import interactionError from './utils/interaction-error';
import logger from '../logging';
import { PromisedDatabase } from 'promised-sqlite3';

/***
 * Configuration
 **/
const alwaysExcepts = (_?: any, __?: any, ___?: any) => { throw new Error("Not initialized yet"); }
const createOrRetrieveStore = (() => {
  let initialized = false;
  let promise: Promise<PepeInterface> | null = null;

  return async (client: Client, config: PepeConfig, db: PromisedDatabase): Promise<PepeInterface> => {
    if(!initialized) {
      initialized = true;
      promise = initializePepeInterface(config, db);
      promise.then(store => {
        setInterval(async () => {
          const messages = await store!.getVotingsOlderThan(12 * 60);
          messages.forEach(x => closeVotingSession(client, store!, x.channel, x.message));
        }, 60 * 1000);  
      })
    }
    return promise!;
  }
})()
const retrievePepeConfig = <T>(obj: T): T & { pepes: PepeConfig } => {
  const pepeConfig = obj as T & { pepes: PepeConfig }
  if (!pepeConfig.pepes) {
    throw new Error("Could not initialize pepe storage, no config with key \"pepes\"");
  }
  return pepeConfig;
}

const closeVotingSession = async (client: Client, voter: PepeVoting, channelId: string, messageId: string) => {
  try {
    const channel = (await client.channels.fetch(channelId));
    if(!channel) {
      return;
    }
    if(!channel.isTextBased()) {
      return;
    }

    const message = await channel.messages.fetch(messageId);
    const result = await voter.getVotingResult(messageId) ?? 0;
    const components = result === 0 ? [] : [buildVotingResult(result)];
    message.edit({ embeds: message.embeds, components: components });
  } catch (e) {
    console.log(`Discarding voting, error encountered: ${e}`);
  } finally {
    voter.closeVoting(messageId);
  }
}


/***
 * PepeGPT Command
 **/
const buildEightPepeCommand = (client: Client, store: PepeInterface, icons: PepeIconData) => {
  return async (interaction: CommandInteraction, phrase: string | null): Promise<any> => {
    const hit = store.gachaPepe(phrase);
    logger.info(`PepeGPT Embed URI: ${JSON.stringify(hit.value)}`)
    if (hit.rarity === Rarity.ultra) {
      const ownerEntry = store.proposeOwner(hit.value, interaction.user.id, interaction.guild!.id);
      const ownerName = await client.users.fetch(ownerEntry.owner);
      await interaction.reply({ ephemeral: false, embeds: [embedUltra(icons.ultra, { ownerId: ownerEntry.owner, ownerName: ownerName.username, timestamp: ownerEntry.timestamp }, hit)] });
      return;
    }

    if (hit.rarity === Rarity.rare) {
      await interaction.reply({ ephemeral: false, embeds: [embedRare(icons.rare, hit)] });
      return;
    }

    if (!phrase) {
      await interaction.reply(hit.value);
      return;
    }

    await interaction.reply({ ephemeral: false, embeds: [embedNormal(phrase, hit)], components: [buildButtonRow(0)] });
    const reply = await interaction.fetchReply();
    store.beginVoting(reply.channelId, reply.id);
  }
}

const formatNumber = (counter: number) => {
  if(counter == 0) {
    return "±0";
  }
  if(counter > 0) {
    return `+${counter}`;
  };
  return `${counter}`;
}

const buildVotingResult = (counter: number) =>
  new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("result")
        .setEmoji("🐸")
        .setStyle(ButtonStyle.Secondary)
        .setLabel(`Voting Result: ${counter}`)
        .setDisabled(true)
    )

const buildButtonRow = (counter: number) => 
  new ActionRowBuilder<ButtonBuilder>()
    .addComponents([
      new ButtonBuilder()
        .setCustomId("sentient")
        .setEmoji("🐸")
        .setStyle(ButtonStyle.Success)
        .setLabel("sentient"),
      new ButtonBuilder()
        .setCustomId("score")
        .setDisabled(true)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(formatNumber(counter)),
      new ButtonBuilder()
        .setCustomId("meh")
        .setEmoji("👎")
        .setStyle(ButtonStyle.Danger)
        .setLabel("meh")
    ]);

const buildVotingCommand = (voter: PepeVoting) => {
  return async (interaction: ButtonInteraction): Promise<any> => {
    const counter = interaction.message.components[0].components[1];
    if (counter.type != 2) {
      await interaction.update({});
      return;
    }
    const id = interaction.customId as ("meh" | "sentient");
    const delta = id == "sentient" ? +1 : -1;
    const value = await voter.submitVote(interaction.message.id, interaction.user.id, delta);
    await interaction.update({ components: [buildButtonRow(value)] });
  }
}

export const EightPepe: InteractionPlugin & ButtonPlugin = {
  descriptor: {
    name: 'pepegpt',
    description: 'Rabscuttles technology of deep space singularity machine learning will bring up the best Pepe!',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'phrase',
        description: 'Optional seed phrase',
        required: false
      }
    ]
  },
  onInit: async function (client, db, config, logger) {
    const pepeConfig = retrievePepeConfig(config).pepes;
    const store = await createOrRetrieveStore(client, pepeConfig, db)
    const totalCount = store.normal.length + store.rare.length + store.ultra.length;
    logger.info(`Total ${totalCount} pepes: [${store.normal.length}] normies, [${store.rare.length}] rares, [${store.ultra.length}] ultras`);
    const command = buildEightPepeCommand(client, store, pepeConfig.icons);
    this.onNewInteraction = (interaction) => command(interaction, interaction.options.getString('phrase', false));
    this.onNewButtonClick = buildVotingCommand(store);
  },
  onNewInteraction: alwaysExcepts,
  onNewButtonClick: alwaysExcepts,
};


/***
 * Pepe of the Day
 **/
const buildPepeOfTheDayCommand = (store: PepeInterface, config: PepeConfig) => {
  const capitalize = (str: string, lower = false) => (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());

  return async (interaction: ChatInputCommandInteraction) => {
    const potd = store.pepeOfTheDay();
    const previousPost = store.getPepepOfTheDay(potd.date, interaction.guildId!);
    if (previousPost) {
      await interaction.reply({ ephemeral: true, content: previousPost });
      return;
    }

    await interaction.reply({ ephemeral: false, embeds: [embedPepeOfTheDay(potd, config.icons, potd.date, capitalize(potd.dateText))], components: [buildButtonRow(0)] });
    const message = await interaction.fetchReply();
    store.beginVoting(message.channelId, message.id);
    store.setPepeOfTheDay(potd.date, interaction.guildId!, message.url);
    return;
  }
}

export const PepeThis: ContextMenuPlugin = {
  descriptor: {
    name: "Pepe this!",
    type: ApplicationCommandType.Message,
  },
  onInit: async function (client, db, config, logger) {
    const pepeConfig = retrievePepeConfig(config).pepes;
    const store = await createOrRetrieveStore(client, pepeConfig, db);
    const command = buildEightPepeCommand(client, store, pepeConfig.icons);


    this.onNewContextAction = async (interaction) => {
      if(!interaction.isMessageContextMenuCommand()) {
        return;
      }
  
      const content = interaction.targetMessage.cleanContent;
      return command(interaction, content);
    }
  },
  onNewContextAction: alwaysExcepts
}

export const PepeOfTheDay: InteractionPlugin = {
  descriptor: {
    name: 'potd',
    description: 'Pepe of the Day!',
  },
  onInit: async function (client, db, config, logger) {
    const pepeConfig = retrievePepeConfig(config).pepes;
    const store = await createOrRetrieveStore(client, pepeConfig, db)
    this.onNewInteraction = buildPepeOfTheDayCommand(store, pepeConfig);
  },
  onNewInteraction: alwaysExcepts
};



/***
 * Pepe Search
 **/
const buildSearchAutocomplete = (store: PepeInterface) => {
  return async (interaction: AutocompleteInteraction) => {
    const result = store.suggestPepeName(interaction.options.getString("query", true));
    interaction.respond(result);
  }
}

const buildSearchCommand = (store: PepeInterface) => {
  return async (interaction: ChatInputCommandInteraction) => {
    const query = interaction.options.getString("query", true);
    const result = store.findPepeByName(query);
    if (!result) {
      await interactionError(interaction, `I couldn't find the pepe you're looking for, the query you gave me was: '${query}'`, 5000);
      return;
    }

    interaction.reply({ ephemeral: false, embeds: [embedPepeSearchResult(result.value, result.name)] })
  }
}

export const SearchPepe: InteractionPlugin & AutoCompletePlugin = {
  descriptor: {
    name: 'pepe',
    description: 'Search the pepe library',
    options: [{
      type: ApplicationCommandOptionType.String,
      name: 'query',
      description: 'Search phrase to find a pepe from',
      required: true,
      autocomplete: true
    }]
  },
  onInit: async function (client, db, config, logger) {
    const pepeConfig = retrievePepeConfig(config).pepes;
    const store = await createOrRetrieveStore(client, pepeConfig, db)
    this.onAutoComplete = buildSearchAutocomplete(store);
    this.onNewInteraction = buildSearchCommand(store);
  },
  onNewInteraction: alwaysExcepts,
  onAutoComplete: alwaysExcepts
}

