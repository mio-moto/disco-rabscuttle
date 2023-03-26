import { Client } from 'discord.js';
import { Config } from '../config';
import { register } from './../message';
import { loggerFactory } from '../logging';
import { PromisedDatabase } from 'promised-sqlite3';
import { ContextMenuPlugin, InteractionPlugin } from '../message/hooks';

export default async function bindInteractions(client: Client, config: Config, database: PromisedDatabase, interactions: (InteractionPlugin | ContextMenuPlugin)[]) {
  const interactionLogger = loggerFactory("Interactions");
  interactions.forEach(x => {
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
