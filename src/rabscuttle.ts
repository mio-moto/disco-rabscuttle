import { Client, IntentsBitField } from "discord.js";
import { Config } from "./config";
import { loggerFactory } from "./logging";
import { CallbackPlugin, isCallbackPlugin, isUserInteractionPlugin, Plugin, UserInteractionPlugin } from "./message/hooks"
import { buildEventBus } from './message';
import { initializeDatabase } from "./database";
import bindInteractions from "./interactions";
import { buildActivitySystem } from "./activity";

export const buildRabscuttle = async (config: Config) => {
    const logger = loggerFactory("Robot");
    const database = await initializeDatabase(config.databaseLocation);

    const client = new Client({
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.GuildWebhooks
        ]
    });

    const eventBus = buildEventBus(config);

    client.on("warn", x => {logger.warn(x)});
    client.on('messageCreate', eventBus.onNewMessage);
    client.on('interactionCreate', eventBus.onNewInteraction);    
    
    const system = {
        client: client,
        config: config,
        database: database,

        interactions: {
            registerPlugins: (...plugins: Plugin[]) => {
                const interactivePlugins: UserInteractionPlugin[] = plugins.filter(isUserInteractionPlugin);
                const callbackPlugins: CallbackPlugin[] = plugins.filter(isCallbackPlugin);
                bindInteractions(client, config, database, interactivePlugins);
                callbackPlugins.forEach(eventBus.register);
            },

            disalePlugins: (...plugins: UserInteractionPlugin[]) => { },
        },

        presence: {
            setStatus: () => { },
            setUsername: () => { },
            ...buildActivitySystem(client)
        }
    };

    const promise = new Promise<typeof system>((resolve, reject) => {
        client.on('ready', () => {
            logger.info(`Logged in as ${client?.user?.tag} - ID: ${client?.user?.id}`);
            config.userId = client?.user?.id ?? '';
            resolve(system);
        });
    });

    logger.info('Logging in...');
    await client.login(config.token);

    return promise;
}