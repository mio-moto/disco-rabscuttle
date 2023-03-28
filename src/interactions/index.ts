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
  });

  const interactiveNames = interactivePlugins.map(x => x.descriptor.name).join(", ")
  interactionLogger.info(`Registered these interactive commands against guilds: [${interactiveNames}]`);

  interactions.forEach(x => {
    register(x);
    if(x.onInit) {
      const logger = loggerFactory(x.name);
      x.onInit(client,database, config, logger);
    }
  })

  const pluginNames = interactions.map(x => x.name).join(", ");
  interactionLogger.info(`Registered and inited these plugins: [${pluginNames}]`);
}
