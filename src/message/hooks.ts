import {
  ApplicationCommandData,
  AutocompleteInteraction,
  ButtonInteraction,
  Client,
  ChatInputCommandInteraction,
} from 'discord.js';
import {Logger} from 'winston';
import {Config} from '../config';
import {MessageCallback} from './message';

export type BasePlugin = {
  onInit?: (client: Client, config: Config, logger: Logger) => Promise<void>;
};

export type MessagePlugin = {
  onNewMessage: MessageCallback;
} & BasePlugin;

export type InteractionPlugin = {
  descriptor: ApplicationCommandData;
  onNewInteraction: (interaction: ChatInputCommandInteraction) => Promise<any>;
} & BasePlugin;

export type ButtonPlugin = {
  onNewButtonClick: (interaction: ButtonInteraction) => Promise<void>;
} & BasePlugin;

export type AutoCompletePlugin = {
  descriptor: ApplicationCommandData;
  onAutoComplete: (interaction: AutocompleteInteraction) => Promise<void>;
} & BasePlugin;