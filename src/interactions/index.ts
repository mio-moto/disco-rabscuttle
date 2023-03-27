import {Client} from 'discord.js';
import {Config} from '../config';
import {register} from './../message';
import {loggerFactory} from '../logging';
import {PromisedDatabase} from 'promised-sqlite3';
import {InteractionPlugin, isInteractionPlugin, Plugin} from '../message/hooks';

export default async function registerInteractions(
  client: Client,
  config: Config,
  database: PromisedDatabase,
  interactions: Plugin[]
) {
  const interactionLogger = loggerFactory('Interactions');
  const interactivePlugins = interactions.filter(x =>
    isInteractionPlugin(x)
  ) as InteractionPlugin[];
  interactivePlugins.forEach(x => {
    client.guilds.cache.forEach(async y => {
      y.commands.create(x.descriptor);
    });
    register(x);
    if (x.onInit) {
      const logger = loggerFactory(x.descriptor.name);
      x.onInit(client, database, config, logger);
    }
    interactionLogger.info(`${x.descriptor.name} initialized`);
  });
}
