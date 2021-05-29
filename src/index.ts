import {Client, Intents} from 'discord.js';
import Robot from './message';
import loadConfig from './config';
import bindInteractions from './interactions';
import {enableActivitySelector} from './activity';
import logger from './logging';

(async () => {
  const client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_WEBHOOKS,
    ],
  });
  const config = loadConfig();

  client.on('ready', () => {
    logger.info(`Logged in as ${client?.user?.tag} - ID: ${client?.user?.id}`);
    config.userId = client?.user?.id ?? '';
    Robot.setup(config);
    bindInteractions(client, config);
    client.on('message', Robot.onNewMessage);
    client.on('interaction', Robot.onNewInteraction);
  });

  logger.info('Loggin in...');
  await client.login(config.token);
  if (client.user) {
    enableActivitySelector(client.user, config.status, config.usernames);
  }
})();
