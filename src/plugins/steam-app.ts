import {
  ApplicationCommandOptionType,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type InteractionReplyOptions,
  type Message,
  type MessageCreateOptions,
} from 'discord.js'
import fetch from 'node-fetch'
import type { Logger } from 'winston'
import type { AutoCompletePlugin, InteractionPlugin, MessagePlugin } from '../message/hooks'
import type { AppInfo } from './steam responses/appinfo'
import type { AppList } from './steam responses/applist'
import interactionError from './utils/interaction-error'
import { decimal } from './utils/number-fomatter'
import { waitFor } from './utils/wait-until'

let logger: Logger
let steamApiKey = ''
let appList: AppList = { applist: { apps: [] } }

type PlayerData = Array<[timestamp: number, players: number]>

const APP_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/?key={KEY}'
const APP_DETAILS_URL = 'https://store.steampowered.com/api/appdetails?appids={ID}&cc=it&l=english'
const APP_PLAYER_DATA = 'https://steamcharts.com/app/{ID}/chart-data.json'
const STEAM_URI = /http(?:s)?:\/\/(?:store.)?steampowered.com\/app\/(\d+)\/.*/

const truncateText = (text: string, length: number) => {
  if (text.length <= length) {
    return text
  }

  return `${text.substring(0, length)}\u2026`
}

const loadAppList = async () => {
  const response = await fetch(APP_LIST_URL.replace('{KEY}', steamApiKey))
  if (!response.ok) {
    logger.error(`Tried to fetch app list, but failed with status: ${response.status}: ${response.statusText}`)
    throw new Error(`Could not fetch app list: ${response}`)
  }

  const result = (await response.json()) as AppList
  logger.info(`Loaded ${result.applist.apps.length} steam apps`)
  appList = result
  // return result;
}

const loadAppDetails = async (id: number) => {
  const response = await fetch(APP_DETAILS_URL.replace('{ID}', `${id}`))
  if (!response.ok) {
    logger.error(`Tried to fetch app details for id [${id}], but failed with status: ${response.status}: ${response.statusText}`)
    throw new Error(`Could not fetch app with id [${id}]`)
  }

  const result = ((await response.json()) as AppInfo)[`${id}`]
  if (!result.success) {
    throw new Error(`App Details API call worked, but API replied with no success indicator (obj['${id}'].success == false)`)
  }

  return result.data
}

const loadAppPlayers = async (id: number) => {
  try {
    let resolved = false
    const responseOption = fetch(APP_PLAYER_DATA.replace('{ID}', `${id}`))
    responseOption.then(() => {
      resolved = true
    })
    await Promise.race([responseOption, new Promise((resolve, reject) => setTimeout(() => resolve(new Error('timeout')), 1500))])
    if (!resolved) {
      logger.warn("Steam Charts didn't return early enough")
      return null
    }

    const json = (await (await responseOption).json()) as PlayerData | null
    if (!json) {
      logger.warn(json)
      return null
    }

    const yesterday = new Date(Date.now() - 3600 * 1000 * 25)
    const data = json.map((x) => ({ date: new Date(x[0]), players: x[1] }))
    const totalPeak = Math.max(...data.map((x) => x.players))
    const data24h = data.filter((x) => x.date > yesterday)
    const max24Players = Math.max(...data24h.map((x) => x.players))
    const currentPlayers = data[data.length - 1].players

    return {
      totalPeak: totalPeak,
      max24Players: max24Players,
      currentPlayers: currentPlayers,
    }
  } catch (e) {
    logger.error(e)
    // ignored
  }
  return null
}

const findAppId = (input: string) => {
  const numeric = Number(input)
  if (Number.isNaN(numeric)) {
    return appList.applist.apps.find((x) => x.name === input)
  }

  return appList.applist.apps.find((x) => x.appid === numeric) ?? appList.applist.apps.find((x) => x.name === input)
}

const generateEmbed = async (nameOrId: string): Promise<EmbedBuilder | null> => {
  const appEntry = findAppId(nameOrId)
  if (appEntry == null) {
    return null
  }
  const details = await loadAppDetails(appEntry.appid)
  const playerData = await loadAppPlayers(appEntry.appid)
  const appUrl = `https://store.steampowered.com/app/${appEntry.appid}/`
  const embed = new EmbedBuilder()
    .setTitle(details.name)
    .setImage(details.header_image)
    .setURL(appUrl)
    .setDescription(truncateText(details.short_description, 550))
    .setAuthor({ name: 'Steam', url: appUrl })

  if (details.price_overview) {
    embed.addFields({
      name: 'Price',
      value: details.price_overview.final_formatted,
      inline: true,
    })
  }
  if (details.metacritic) {
    embed.addFields({
      name: 'Metacritic',
      value: `${details.metacritic.score}`,
      inline: true,
    })
  }
  if (details.recommendations) {
    embed.addFields({
      name: 'Recommendations',
      value: `${decimal(details.recommendations.total, 2, false, true)}`,
      inline: true,
    })
  }
  if (details.release_date) {
    embed.addFields({
      name: details.release_date.coming_soon ? 'Coming soon' : 'Release Date',
      value: details.release_date.date,
      inline: true,
    })
  }
  if (playerData) {
    embed.addFields({
      name: 'Players',
      value: decimal(playerData.currentPlayers, 2, false, true),
      inline: true,
    })
    embed.addFields({
      name: '24h peak',
      value: decimal(playerData.max24Players, 2, false, true),
      inline: true,
    })
    // doesn't need more than 6, the widget is large enough already
    if (embed.data.fields && embed.data.fields.length < 6) {
      embed.addFields({
        name: 'Total peak',
        value: decimal(playerData.totalPeak, 2, false, true),
        inline: true,
      })
    }
  }
  return embed
}

const onNewInteraction = async (interaction: ChatInputCommandInteraction) => {
  const command = interaction.options.getString('app', true)
  const message = interaction.options.getString('comment', false)
  const hasMessage = message !== null && message.length > 0
  // ephemeral being set, if there's no message.
  // discord has a bug, where mentions don't trigger notifications when it's being done as followup
  await interaction.deferReply({ ephemeral: hasMessage })

  try {
    const embed = await generateEmbed(command)
    if (!embed) {
      return await interactionError(interaction, "Sorry, couldn't find or translate the app", 10_000)
    }
    const options: InteractionReplyOptions = { embeds: [embed] }
    if (hasMessage) {
      const userPreamble = interaction.member ? `${interaction.member.user} said:\n` : ''
      options.content = `${userPreamble}> ${message}`
      // first show the error
      const errorPromise = interactionError(interaction, 'Replying again as text message, otherwise mentions will not work, sorry.')
      // then reply in public
      if (!interaction.channel?.isSendable()) {
        return
      }
      await interaction.channel.send(options as MessageCreateOptions)
      // then wait until the error is gone
      return await errorPromise
    }

    return await interaction.followUp(options)
  } catch (e) {
    return await interactionError(interaction, `Excpetional: ${e}`)
  }
}

const plugin: InteractionPlugin & AutoCompletePlugin & MessagePlugin = {
  name: 'Steam',
  descriptor: {
    name: 'steam',
    description: 'Searches the steam store and and displays relevant info',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'app',
        description: "Name of the app you're looking for",
        required: true,
        autocomplete: true,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'comment',
        description: "Optional comment to give some context why you've linking this",
        required: false,
        autocomplete: false,
      },
    ],
  },
  onInit: async (_, __, config, log) => {
    logger = log
    steamApiKey = config.steamApiKey
    loadAppList()
    setInterval(loadAppList, 86400000)
  },
  async onNewMessage(message: Message) {
    const text = message.cleanContent
    const match = text.match(STEAM_URI)
    if (!match || match.length <= 0) {
      return
    }
    await waitFor(2000)
    if (message.embeds.length > 0) {
      return
    }
    try {
      const embed = await generateEmbed(match[1])

      if (embed && message.channel.isSendable()) {
        message.channel.send({ embeds: [embed] })
      }
    } catch {
      // ignored
    }
  },
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    await onNewInteraction(interaction)
  },
  async onAutoComplete(interaction: AutocompleteInteraction) {
    const searchString = interaction.options.getString('app', true)
    if (searchString.length <= 0) {
      await interaction.respond([])
      return
    }

    const titles = appList.applist.apps
      .filter((x) => x.name.toLowerCase().includes(searchString.toLowerCase()) || `${x.appid}`.startsWith(searchString))
      .sort((a, b) => a.appid - b.appid)
      .splice(0, 25)
    return await interaction.respond(titles.map((x) => ({ name: `[${x.appid}] ${x.name}`, value: `${x.appid}` })))
  },
}

export default plugin
