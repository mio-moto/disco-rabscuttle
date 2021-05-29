import {Interaction, Message as DiscordMessage} from 'discord.js';
import {Config} from '../config';
import {loggerFactory} from '../logging';
import {InteractionPlugin, MessagePlugin} from './hooks';

export interface MessageCallback {
  (message: DiscordMessage): void;
}
const logger = loggerFactory('Plugins');

const plugins: {
  interactions: {
    [command: string]: InteractionPlugin;
  };
  messages: MessagePlugin[];
} = {
  interactions: {},
  messages: [],
};

function isInteractionPlugin(
  plugin: InteractionPlugin | MessagePlugin
): plugin is InteractionPlugin {
  return (<InteractionPlugin>plugin).onNewInteraction !== undefined;
}

function isMessagePlugin(
  plugin: InteractionPlugin | MessagePlugin
): plugin is MessagePlugin {
  return (<MessagePlugin>plugin).onNewMessage !== undefined;
}

const registerInteractionPlugin = (plugin: InteractionPlugin) => {
  const name = plugin.descriptor.name;
  plugins.interactions[name] = plugin;
};

export function register(plugin: InteractionPlugin | MessagePlugin) {
  if (isMessagePlugin(plugin)) {
    plugins.messages.push(plugin);
  }

  if (isInteractionPlugin(plugin)) {
    registerInteractionPlugin(plugin);
  }
}

let botConfig: Config;

export function setup(config: Config) {
  botConfig = config;
}

export function onNewMessage(discordMessage: DiscordMessage) {
  // reject messages from the bot himself.
  if (discordMessage.author.id === botConfig?.userId) {
    return;
  }

  plugins.messages.forEach(x => x.onNewMessage(discordMessage));
}

export function onNewInteraction(interaction: Interaction) {
  if (!interaction.isCommand()) {
    return;
  }

  if (!(interaction.commandName in plugins.interactions)) {
    return;
  }
  try {
    plugins.interactions[interaction.commandName].onNewInteraction(interaction);
  } catch (e) {
    logger.error(e);
  }
}
