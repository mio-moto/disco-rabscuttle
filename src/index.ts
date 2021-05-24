import {Client, Intents} from 'discord.js';
import Robot from './message';
import loadConfig from './config';
import bindInteractions from './interactions';

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
    console.log(`Logged in as ${client?.user?.tag} - ID: ${client?.user?.id}`);
    config.userId = client?.user?.id ?? '';
    Robot.setup(config);
    bindInteractions(client, config);
    client.on('message', Robot.onNewMessage);
    client.on('interaction', Robot.onNewInteraction);
  });

  console.log('Loggin in...');
  await client.login(config.token);
  client.user?.setUsername(config.username);
  client.user?.setActivity(config.statusText, {type: config.statusType});
})();
