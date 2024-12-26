import type { Client } from 'discord.js'
import type { Kysely } from 'kysely'
import type { Config } from '../config'
import { loggerFactory } from '../logging'
import { type InteractionPlugin, type Plugin, isContextMenuAction, isInteractionPlugin } from '../message/hooks'
import { register } from './../message'

export default async function registerInteractions(client: Client, config: Config, database: Kysely<unknown>, interactions: Plugin[]) {
  const interactionLogger = loggerFactory('S:Interactions')
  const interactivePlugins = interactions.filter((x) => isInteractionPlugin(x) || isContextMenuAction(x)) as InteractionPlugin[]
  for (const interactivePlugin of interactivePlugins) {
    for (const [_name, guild] of client.guilds.cache) {
      await guild.commands.create(interactivePlugin.descriptor)
    }
  }

  const interactiveNames = interactivePlugins.map((x) => x.descriptor.name).join(', ')
  interactionLogger.info(`Registered these interactive commands against guilds: [${interactiveNames}]`)
  for (const interaction of interactions) {
    register(interaction)
    if (interaction.onInit) {
      const logger = loggerFactory(`P:${interaction.name}`)
      interaction.onInit(client, database, config, logger)
    }
  }

  const pluginNames = interactions.map((x) => x.name).join(', ')
  interactionLogger.info(`Registered and inited these plugins: [${pluginNames}]`)
}
