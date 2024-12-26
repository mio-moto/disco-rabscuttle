import type {
  ApplicationCommandData,
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ContextMenuCommandInteraction,
  MessageReaction,
  ModalSubmitInteraction,
  PartialMessageReaction,
  PartialUser,
  User,
} from 'discord.js'
import type { Kysely } from 'kysely'
import type { Logger } from 'winston'
import type { Config } from '../config'
import type { MessageCallback } from './message'

export type BasePlugin = {
  name: string
  onInit?: (client: Client, database: Kysely<unknown>, config: Config, logger: Logger) => Promise<void>
}

export type UserInteractionPlugin = InteractionPlugin | ContextMenuPlugin
export type CallbackPlugin = MessagePlugin | ButtonPlugin | AutoCompletePlugin
export function isUserInteractionPlugin(plugin: Plugin): plugin is UserInteractionPlugin {
  return (<UserInteractionPlugin>plugin).descriptor !== undefined
}

export function isCallbackPlugin(plugin: Plugin): plugin is CallbackPlugin {
  return !isUserInteractionPlugin(plugin)
}

export type Plugin = InteractionPlugin | MessagePlugin | ButtonPlugin | AutoCompletePlugin | ContextMenuPlugin | ReactionPlugin | ModalPlugin

export function isInteractionPlugin(plugin: Plugin): plugin is InteractionPlugin {
  return (<InteractionPlugin>plugin).onNewInteraction !== undefined
}

export function isMessagePlugin(plugin: Plugin): plugin is MessagePlugin {
  return (<MessagePlugin>plugin).onNewMessage !== undefined
}

export function isButtonPlugin(plugin: Plugin): plugin is ButtonPlugin {
  return (<ButtonPlugin>plugin).onNewButtonClick !== undefined
}

export function canAutoComplete(plugin: Plugin): plugin is AutoCompletePlugin {
  return (<AutoCompletePlugin>plugin).onAutoComplete !== undefined
}

export function isContextMenuAction(plugin: Plugin): plugin is ContextMenuPlugin {
  return (<ContextMenuPlugin>plugin).onNewContextAction !== undefined
}

export function isModalPlugin(plugin: Plugin): plugin is ModalPlugin {
  return (<ModalPlugin>plugin).onNewModal !== undefined
}

export type MessagePlugin = {
  onNewMessage: MessageCallback
} & BasePlugin

export type InteractionPlugin = {
  descriptor: ApplicationCommandData
  onNewInteraction: (interaction: ChatInputCommandInteraction) => Promise<unknown>
} & BasePlugin

export type ModalPlugin = {
  publishedModalIds: string[]
  onNewModal: (interaction: ModalSubmitInteraction) => Promise<unknown>
} & BasePlugin

export type ButtonPlugin = {
  publishedButtonIds: string[]
  onNewButtonClick: (interaction: ButtonInteraction) => Promise<unknown>
} & BasePlugin

export type AutoCompletePlugin = {
  descriptor: ApplicationCommandData
  onAutoComplete: (interaction: AutocompleteInteraction) => Promise<unknown>
} & BasePlugin

export type ContextMenuPlugin = {
  descriptor: ApplicationCommandData
  onNewContextAction: (interaction: ContextMenuCommandInteraction) => Promise<unknown>
} & BasePlugin

export type ReactionPlugin = {
  onNewReaction: (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => unknown
} & BasePlugin
