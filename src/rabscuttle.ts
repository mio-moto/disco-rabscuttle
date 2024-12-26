import { Client, IntentsBitField, Partials } from 'discord.js'
import { type ClientStatus, buildActivitySystem, setStatus, setUsername } from './activity'
import type { Config } from './config'
import { initializeDatabase } from './database'
import registerPlugins from './interactions'
import { loggerFactory } from './logging'
import { buildEventBus } from './message'
import type { Plugin, UserInteractionPlugin } from './message/hooks'
import rest from './rest'
// import rest from './rest';

export const buildRabscuttle = async (config: Config) => {
  const logger = loggerFactory('S:Core')
  const database = await initializeDatabase(config.databaseLocation)

  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildWebhooks,
      IntentsBitField.Flags.GuildMessageReactions,
      IntentsBitField.Flags.DirectMessageReactions,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.GuildScheduledEvent,
      Partials.Message,
      Partials.Reaction,
      Partials.ThreadMember,
      Partials.User,
    ],
  })

  const eventBus = buildEventBus(config)

  client.on('warn', (x) => {
    logger.warn(x)
  })
  client.on('messageCreate', eventBus.onNewMessage)
  client.on('interactionCreate', eventBus.onNewInteraction)
  client.on('messageReactionAdd', eventBus.onNewReaction)

  const system = {
    client: client,
    config: config,
    database: database,

    interactions: {
      registerPlugins: (...plugins: Plugin[]) => registerPlugins(client, config, database, plugins),
      disalePlugins: (...plugins: UserInteractionPlugin[]) => {},
    },

    presence: {
      setStatus: (status: ClientStatus) => {
        if (client.user) setStatus(client.user, status)
      },
      setUsername: (username: string) => {
        if (client.user) setUsername(client.user, username)
      },
      ...buildActivitySystem(client),
    },
  }

  const promise = new Promise<typeof system>((resolve, reject) => {
    client.on('ready', () => {
      logger.info(`Logged in as ${client?.user?.tag} - ID: ${client?.user?.id}`)

      /*
      (async () => {
        
        await client.guilds.fetch();
        rest({ token: config.token, clientId: config.userId! }).unregisterAllCommands(client.guilds.cache.map(x => x.id));
      })()
      */
      config.userId = client?.user?.id ?? ''
      resolve(system)
    })
  })

  logger.info('Logging in...')
  await client.login(config.token)

  return promise
}
