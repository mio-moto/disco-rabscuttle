import Robot from './message';
import loadConfig from './config';
import bindInteractions from './interactions';
import { enableActivitySelector } from './activity';
import logger from './logging';
import createClient from './robot';
import { GatewayIntentBits } from 'discord-api-types/v10';

const config = loadConfig();
Robot.setup(config);



(async () => {
  const [ connection, client ] = createClient({
    authorization: { token: config.token },
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildWebhooks,
    ],
    identifier: 'rabscuttle-the-great'
  });
  
  const [ gateway, interactions ] = [ client.clientHandler.eventBus, client.clientHandler.interactionBus ] as const;

  gateway.onReady.on((message) => {
    logger.info(`Logged in as '${message.user.username}'`);
    config.userId = message.user.id;
    
    bindInteractions(client, config);
    interactions.onInteraction.on(Robot.onNewInteraction);

    enableActivitySelector(client, config.status, config.usernames);
  })

  logger.info('Logging in...');
  await connection;
})();


// yea, blame discord.js throwing random errors at places that are not reachable from here
process.on('unhandledRejection', error => {
	logger.error('Unhandled promise rejection:', error);
});