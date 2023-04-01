import {Interaction, Message as DiscordMessage} from 'discord.js';
import {Config} from '../config';
import {loggerFactory} from '../logging';
import {
  AutoCompletePlugin,
  ButtonPlugin,
  ContextMenuPlugin,
  InteractionPlugin,
  MessagePlugin,
} from './hooks';

export interface MessageCallback {
  (message: DiscordMessage): void;
}
const logger = loggerFactory('S:Plugins');

const plugins: {
  interactions: {
    [command: string]: InteractionPlugin;
  };
  messages: MessagePlugin[];
  buttons: ButtonPlugin[];
  autocompletes: {
    [command: string]: AutoCompletePlugin;
  };
  contextMenu: {
    [command: string]: ContextMenuPlugin;
  };
} = {
  interactions: {},
  messages: [],
  buttons: [],
  autocompletes: {},
  contextMenu: {},
};

export type PluginTypes =
  | InteractionPlugin
  | MessagePlugin
  | ButtonPlugin
  | AutoCompletePlugin
  | ContextMenuPlugin;

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

function isContextMenuAction(plugin: PluginTypes): plugin is ContextMenuPlugin {
  return (<ContextMenuPlugin>plugin).onNewContextAction !== undefined;
}

const registerInteractionPlugin = (plugin: InteractionPlugin) => {
  const name = plugin.descriptor.name;
  plugins.interactions[name] = plugin;
};

const registerAutoComplete = (plugin: AutoCompletePlugin) => {
  const name = plugin.descriptor.name;
  plugins.autocompletes[name] = plugin;
};

const registerContextMenuPlugin = (plugin: ContextMenuPlugin) => {
  const name = plugin.descriptor.name;
  plugins.contextMenu[name] = plugin;
};

export function register(plugin: PluginTypes) {
  if (isMessagePlugin(plugin)) {
    plugins.messages.push(plugin);
  }

  if (isInteractionPlugin(plugin)) {
    registerInteractionPlugin(plugin);
  }

  if (canAutoComplete(plugin)) {
    registerAutoComplete(plugin);
  }

  if (isButtonPlugin(plugin)) {
    const idCollisions = plugin.publishedButtonIds.filter(id => plugins.buttons.some(x => x.publishedButtonIds.includes(id)));
    for (const idCollision of idCollisions) {
      const pluginCollisions = plugins.buttons.filter(plugin => plugin.publishedButtonIds.includes(idCollision));
      logger.warn(`Button ID '${idCollision}' of [${plugin.name}] collides with these plugins publishing the same custom ID [${pluginCollisions.join(", ")}]`);
    }
    plugins.buttons.push(plugin);
  }

  if (isContextMenuAction(plugin)) {
    registerContextMenuPlugin(plugin);
  }
}

export function buildEventBus(config: Config) {
  return {
    onNewMessage: (message: DiscordMessage) => onNewMessage(message, config),
    onNewInteraction: onNewInteraction,
    register: register,
  };
}

export function onNewMessage(discordMessage: DiscordMessage, config: Config) {
  // reject messages from the bot himself.
  if (discordMessage.author.id === config.userId) {
    return;
  }

  plugins.messages.forEach(x => {
    try {
      x.onNewMessage(discordMessage);
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
};

export function onNewInteraction(interaction: Interaction) {
  // commands can allow for auto-complete
  if (interaction.isAutocomplete()) {
    tryInvoke(() =>
      plugins.autocompletes[interaction.commandName]?.onAutoComplete(
        interaction
      )
    );
    return;
  }

  // button interactions (when the bot sent out a bunch of buttons and they get clicked)
  if (interaction.isButton()) {
    plugins.buttons.forEach(x => {
      // a button has *always* a custom id
      // that's then being used to dispatch to the correct plugin
      const id = interaction.customId;
      if(x.publishedButtonIds.includes(id)) {
        tryInvoke(() => x.onNewButtonClick(interaction))
      }
    });
    return;
  }

  // complete command interactions
  if (interaction.isChatInputCommand()) {
    tryInvoke(() => {
      plugins.interactions[interaction.commandName]?.onNewInteraction(
        interaction
      );
    });
    return;
  }

  if (interaction.isContextMenuCommand()) {
    tryInvoke(() => {
      plugins.contextMenu[interaction.commandName]?.onNewContextAction(
        interaction
      );
    });
  }
}
