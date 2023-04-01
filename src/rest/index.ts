import {REST, Routes} from 'discord.js';
import {loggerFactory} from '../logging';

const logger = loggerFactory('S:Rest API');

interface Config {
  clientId: string;
  token: string;
}

export default (config: Config) => {
  const rest = new REST({version: '10'}).setToken(config.token);

  return {
    unregisterAllCommands: async (guilds: string[]) => {
      let globalSuccess = false;
      let guildUnregisters = 0;
      let guildFailures = 0;
      try {
        await rest.put(Routes.applicationCommands(config.clientId), {body: []});
        globalSuccess = true;
      } catch (error) {
        logger.error(error);
      }

      for (let i = 0; i < guilds.length; i++) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(config.clientId, guilds[i]),
            {body: []}
          );
          guildUnregisters += 1;
        } catch (error) {
          logger.error(error);
          guildFailures += 1;
        }
      }
      const success = globalSuccess ? 'Successful' : 'Unsuccessful';
      logger.info(
        `${success} global command deletion, ${guildUnregisters} guild unregister(s) successful, ${guildFailures} guild failures`
      );
    },
  };
};
