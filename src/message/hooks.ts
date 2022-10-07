import { APIApplicationCommand, APIApplicationCommandInteractionData, ApplicationCommandType, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';
import {Logger} from 'winston';
import {Config} from '../config';
import { DiscordClient } from '../robot';
import { AutocompleteInteraction, CommandInteraction, ModalInteraction } from '../robot/strategies/interaction-strategies';
import {MessageCallback} from './message';

export type BasePlugin = {
  onInit?: (client: DiscordClient, config: Config, logger: Logger) => Promise<void>;
};

export type MessagePlugin = {
  onNewMessage: MessageCallback;
} & BasePlugin;

export type InteractionPlugin = {
  descriptor: RESTPostAPIChatInputApplicationCommandsJSONBody ;
  onNewInteraction: (interaction: CommandInteraction) => Promise<any>;
} & BasePlugin;

export type ButtonPlugin = {
  onNewButtonClick: (interaction: ModalInteraction) => Promise<void>;
} & BasePlugin;

export type AutoCompletePlugin = {
  descriptor: RESTPostAPIChatInputApplicationCommandsJSONBody ;
  onAutoComplete: (interaction: AutocompleteInteraction) => Promise<void>;
} & BasePlugin;