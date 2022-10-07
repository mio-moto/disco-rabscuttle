import { InteractionType } from 'discord-api-types/v10';
import { Config } from '../config';
import { loggerFactory } from '../logging';
import { Interaction, MessageCreate } from '../robot';
import { AutoCompletePlugin, ButtonPlugin, InteractionPlugin, MessagePlugin } from './hooks';

export interface MessageCallback {
  (message: MessageCreate): void;
}
const logger = loggerFactory('Plugins');

const plugins: {
  interactions: {
    [command: string]: InteractionPlugin;
  };
  messages: MessagePlugin[];
  buttons: ButtonPlugin[];
  autocompletes: {
    [command: string]: AutoCompletePlugin;
  };
} = {
  interactions: {},
  messages: [],
  buttons: [],
  autocompletes: {}
};

type PluginTypes = InteractionPlugin | MessagePlugin | ButtonPlugin | AutoCompletePlugin;

function isInteractionPlugin(plugin: PluginTypes): plugin is InteractionPlugin {
  return (<InteractionPlugin>plugin).onNewInteraction !== undefined;
}

function isMessagePlugin(plugin: PluginTypes): plugin is MessagePlugin {
  return (<MessagePlugin>plugin).onNewMessage !== undefined;
}

function isButtonPlugin(plugin: PluginTypes): plugin is ButtonPlugin {
  return (<ButtonPlugin>plugin).onNewButtonClick !== undefined;
}

function canAutoComplete(plugin: PluginTypes): plugin is AutoCompletePlugin {
  return (<AutoCompletePlugin>plugin).onAutoComplete !== undefined;
}

const registerInteractionPlugin = (plugin: InteractionPlugin) => {
  const name = plugin.descriptor.name;
  plugins.interactions[name] = plugin;
};

const registerAutoComplete = (plugin: AutoCompletePlugin) => {
  const name = plugin.descriptor.name;
  plugins.autocompletes[name] = plugin;
}

export function register(plugin: PluginTypes) {
  if (isMessagePlugin(plugin)) {
    plugins.messages.push(plugin);
  }

  if (isInteractionPlugin(plugin)) {
    registerInteractionPlugin(plugin);
  }

  if(canAutoComplete(plugin)) {
    registerAutoComplete(plugin)
  };

  if (isButtonPlugin(plugin)) {
    plugins.buttons.push(plugin);
  }
}

let botConfig: Config;

export function setup(config: Config) {
  botConfig = config;
}

export function onNewMessage(discordMessage: MessageCreate) {
  // reject messages from the bot himself.
  if (discordMessage.author.id === botConfig?.userId) {
    return;
  }

  plugins.messages.forEach(x => {
    try {
      x.onNewMessage(discordMessage)
    } catch (e) {
      logger.error(e);
    }
  });
}

const tryInvoke = (action: () => void) => {
  try {
    action();
  } catch (e) {
    logger.error(e);
  }
}

export function onNewInteraction(interaction: Interaction) {
  // commands can allow for auto-complete
  switch(interaction.type) {
    case InteractionType.ApplicationCommandAutocomplete:
      tryInvoke(() => plugins.autocompletes[interaction.data.data.name]?.onAutoComplete(interaction));
      return;
    case InteractionType.ModalSubmit:
      plugins.buttons.forEach(x => tryInvoke(() => x.onNewButtonClick(interaction)))
      return;
    case InteractionType.ApplicationCommand:
      tryInvoke(() => plugins.interactions[interaction.data.data.name]?.onNewInteraction(interaction));
      return;
  }
}
