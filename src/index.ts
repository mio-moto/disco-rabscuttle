import loadConfig from './config';
import logger from './logging';
import {interactions} from './plugins';
import {buildRabscuttle} from './rabscuttle';

(async () => {
  const config = loadConfig();
  const rabs = await buildRabscuttle(config);
  rabs.presence.enableActivitySelector(config.status, config.usernames);
  rabs.interactions.registerPlugins(...interactions);
})();

// yea, blame discord.js throwing random errors at places that are not reachable from here
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
  if (error.stack) {
    logger.error(error.stack);
  }
});
