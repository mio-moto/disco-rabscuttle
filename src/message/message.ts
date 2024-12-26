import {
  type Message as DiscordMessage,
  type Interaction,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
  messageLink,
} from 'discord.js'
import type { Config } from '../config'
import { loggerFactory } from '../logging'
import {
  type AutoCompletePlugin,
  type ButtonPlugin,
  type ContextMenuPlugin,
  type InteractionPlugin,
  type MessagePlugin,
  type ModalPlugin,
  type ReactionPlugin,
  isModalPlugin,
} from './hooks'

export type MessageCallback = (message: DiscordMessage) => void
const logger = loggerFactory('S:Plugins')

const plugins: {
  interactions: {
    [command: string]: InteractionPlugin
  }
  messages: MessagePlugin[]
  buttons: ButtonPlugin[]
  reactions: ReactionPlugin[]
  autocompletes: {
    [command: string]: AutoCompletePlugin
  }
  contextMenu: {
    [command: string]: ContextMenuPlugin
  }
  modals: ModalPlugin[]
} = {
  interactions: {},
  messages: [],
  buttons: [],
  reactions: [],
  autocompletes: {},
  contextMenu: {},
  modals: [],
}

export type PluginTypes = InteractionPlugin | MessagePlugin | ButtonPlugin | AutoCompletePlugin | ContextMenuPlugin | ReactionPlugin | ModalPlugin

function isInteractionPlugin(plugin: PluginTypes): plugin is InteractionPlugin {
  return (<InteractionPlugin>plugin).onNewInteraction !== undefined
}

function isMessagePlugin(plugin: PluginTypes): plugin is MessagePlugin {
  return (<MessagePlugin>plugin).onNewMessage !== undefined
}

function isButtonPlugin(plugin: PluginTypes): plugin is ButtonPlugin {
  return (<ButtonPlugin>plugin).onNewButtonClick !== undefined
}

function canAutoComplete(plugin: PluginTypes): plugin is AutoCompletePlugin {
  return (<AutoCompletePlugin>plugin).onAutoComplete !== undefined
}

function isContextMenuAction(plugin: PluginTypes): plugin is ContextMenuPlugin {
  return (<ContextMenuPlugin>plugin).onNewContextAction !== undefined
}

function isReactionPlugin(plugin: PluginTypes): plugin is ReactionPlugin {
  return (<ReactionPlugin>plugin).onNewReaction !== undefined
}

const registerInteractionPlugin = (plugin: InteractionPlugin) => {
  const name = plugin.descriptor.name
  plugins.interactions[name] = plugin
}

const registerAutoComplete = (plugin: AutoCompletePlugin) => {
  const name = plugin.descriptor.name
  plugins.autocompletes[name] = plugin
}

const registerContextMenuPlugin = (plugin: ContextMenuPlugin) => {
  const name = plugin.descriptor.name
  plugins.contextMenu[name] = plugin
}

const registerReactionPlugin = (plugin: ReactionPlugin) => {
  plugins.reactions.push(plugin)
}

const registerModalPlugin = (plugin: ModalPlugin) => {
  plugins.modals.push(plugin)
}

export function register(plugin: PluginTypes) {
  if (isMessagePlugin(plugin)) {
    plugins.messages.push(plugin)
  }

  if (isInteractionPlugin(plugin)) {
    registerInteractionPlugin(plugin)
  }

  if (canAutoComplete(plugin)) {
    registerAutoComplete(plugin)
  }

  if (isButtonPlugin(plugin)) {
    const idCollisions = plugin.publishedButtonIds.filter((id) => plugins.buttons.some((x) => x.publishedButtonIds.includes(id)))
    for (const idCollision of idCollisions) {
      const pluginCollisions = plugins.buttons.filter((plugin) => plugin.publishedButtonIds.includes(idCollision))
      logger.warn(
        `Button ID '${idCollision}' of [${plugin.name}] collides with these plugins publishing the same custom ID [${pluginCollisions.join(', ')}]`,
      )
    }
    plugins.buttons.push(plugin)
  }

  if (isContextMenuAction(plugin)) {
    registerContextMenuPlugin(plugin)
  }

  if (isReactionPlugin(plugin)) {
    registerReactionPlugin(plugin)
  }

  if (isModalPlugin(plugin)) {
    const idCollisions = plugin.publishedModalIds.filter((id) => plugins.modals.some((x) => x.publishedModalIds.includes(id)))
    for (const idCollision of idCollisions) {
      const pluginCollisions = plugins.modals.filter((plugin) => plugin.publishedModalIds.includes(idCollision))
      logger.warn(
        `Button ID '${idCollision}' of [${plugin.name}] collides with these plugins publishing the same custom ID [${pluginCollisions.join(', ')}]`,
      )
    }
    registerModalPlugin(plugin)
  }
}

export function buildEventBus(config: Config) {
  return {
    onNewMessage: (message: DiscordMessage) => onNewMessage(message, config),
    onNewInteraction: onNewInteraction,
    onNewReaction: (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => onNewReaction(reaction, user, config),
    register: register,
  }
}

export async function onNewReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, config: Config) {
  logger.warn('Hello from the reaction event bus')
  if (reaction.partial) {
    await reaction.fetch()
  }
  if (reaction.partial) {
    logger.warn('Partial reaction loading failed, still is partial after fetching.')
    return
  }
  // the reaction is from the bot itself
  if (user.id === config.userId) {
    return
  }

  // the message is not from the bot
  if (reaction.message.author?.id !== config.userId) {
    return
  }

  for (const plugin of plugins.reactions) {
    try {
      plugin.onNewReaction(reaction, user)
    } catch (e) {
      logger.error(e)
    }
  }
}

export function onNewMessage(discordMessage: DiscordMessage, config: Config) {
  // reject messages from the bot himself.
  if (discordMessage.author.id === config.userId) {
    return
  }

  for (const plugin of plugins.messages) {
    try {
      plugin.onNewMessage(discordMessage)
    } catch (e) {
      logger.error(e)
    }
  }
}

const tryInvoke = (action: () => void) => {
  try {
    action()
  } catch (e) {
    logger.error(e)
  }
}

export function onNewInteraction(interaction: Interaction) {
  // commands can allow for auto-complete
  if (interaction.isAutocomplete()) {
    tryInvoke(() => plugins.autocompletes[interaction.commandName]?.onAutoComplete(interaction))
    return
  }

  // button interactions (when the bot sent out a bunch of buttons and they get clicked)
  if (interaction.isButton()) {
    for (const plugin of plugins.buttons) {
      // a button should have *always* a custom id
      // that's then being used to dispatch to the correct plugin
      const id = interaction.customId
      if (plugin.publishedButtonIds.includes(id)) {
        tryInvoke(() => plugin.onNewButtonClick(interaction))
      }
    }
    return
  }

  // complete command interactions
  if (interaction.isChatInputCommand()) {
    tryInvoke(() => {
      plugins.interactions[interaction.commandName]?.onNewInteraction(interaction)
    })
    return
  }

  if (interaction.isContextMenuCommand()) {
    tryInvoke(() => {
      plugins.contextMenu[interaction.commandName]?.onNewContextAction(interaction)
    })
  }

  if (interaction.isModalSubmit()) {
    const id = interaction.customId
    tryInvoke(() => {
      for (const plugin of plugins.modals) {
        if (plugin.publishedModalIds.includes(id)) {
          plugin.onNewModal(interaction)
        }
      }
    })
  }
}
