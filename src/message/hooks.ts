import {ApplicationCommandData, Client, CommandInteraction} from 'discord.js';
import {Config} from '../config';
import {MessageCallback} from './message';

export type BasePlugin = {
  onInit?: (client: Client, config: Config) => void;
};

export type MessagePlugin = {
  onNewMessage: MessageCallback;
} & BasePlugin;

export type InteractionPlugin = {
  descriptor: ApplicationCommandData;
  onNewInteraction: (interaction: CommandInteraction) => void;
} & BasePlugin;
