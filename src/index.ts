import { Client, IntentsBitField } from 'discord.js';
import Robot from './message';
import loadConfig from './config';
import bindInteractions from './interactions';
import { enableActivitySelector } from './activity';
import logger from './logging';

const config = loadConfig();
Robot.setup(config);


(async () => {
  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildWebhooks,
    ],
  });

  client.on('ready', () => {
    logger.info(`Logged in as ${client?.user?.tag} - ID: ${client?.user?.id}`);
    config.userId = client?.user?.id ?? '';
    bindInteractions(client, config);
    client.on('messageCreate', Robot.onNewMessage);
    client.on('interactionCreate', Robot.onNewInteraction);
  });

  client.on("warn", console.log)

  logger.info('Loggin in...');
  await client.login(config.token);
  if (client.user) {
    enableActivitySelector(client.user, config.status, config.usernames);
  }
})()

// yea, blame discord.js throwing random errors at places that are not reachable from here
process.on('unhandledRejection', error => {
	logger.error('Unhandled promise rejection:', error);
});