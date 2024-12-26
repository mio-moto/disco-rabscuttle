import { readFile, writeFile } from 'node:fs'
import { type ApplicationCommandData, ApplicationCommandOptionType, type ChatInputCommandInteraction } from 'discord.js'
import { loggerFactory } from '../logging'
import type { InteractionPlugin } from '../message/hooks'

const logger = loggerFactory('P:Karma')
export const TRIGGER_WORDS = ['karma', 'commend', 'report'] as const
export const [KARMA_COMMAND, COMMEND_COMMAND, REPORT_COMMAND] = TRIGGER_WORDS

export interface VoteRecords {
  [k: string]: number
}

export interface UserStatistic {
  name: string
  commend: number
  report: number
  score: number
}

type DataNames = 'report' | 'commend'

const getScore = (dataSet: VoteRecords, username: string) => dataSet[username.toLowerCase()] || 0
const addScore = (dataSet: VoteRecords, username: string) => {
  dataSet[username.toLowerCase()] = getScore(dataSet, username) + 1
}

const commit = (dataset: VoteRecords, name: string) => {
  writeFile(`./data/${name}.json`, JSON.stringify(dataset), (err) => {
    if (err) {
      logger.error(err)
    }
  })
}

const commends: VoteRecords = {}
const reports: VoteRecords = {}
const load = (command: DataNames, targetObject: VoteRecords) => {
  readFile(`./data/${command}.json`, (err, data) => {
    if (err) {
      logger.error(`Could not load ${command}.json`)
      return
    }

    const records = JSON.parse(data.toString()) as VoteRecords
    for (const [key, value] of Object.entries(records)) {
      targetObject[key] = value
    }
    logger.info(`Populated ${command} dataset.`)
  })
}

const userStatistics = (username: string): UserStatistic => {
  const reportScore = getScore(reports, username)
  const commendScore = getScore(commends, username)

  return {
    name: username,
    commend: commendScore,
    report: reportScore,
    score: commendScore - reportScore,
  }
}

const buildCommand = (dataset: VoteRecords, datasetName: DataNames) => {
  return (username: string) => {
    addScore(dataset, username)
    commit(dataset, datasetName)
    return userStatistics(username)
  }
}

const commend = buildCommand(commends, 'commend')
const report = buildCommand(reports, 'report')
type ActionNames = (typeof TRIGGER_WORDS)[number]
const actions = {
  report: report,
  commend: commend,
} as const

const generateCommandRepsonse = (command: DataNames, username: string) => {
  const stats = actions[command](username)
  return `Thank you for helping to improve the Dota 2 Community.\n**${username}** (${stats.score} Karma) is currently at **\`${stats[command]}\`** ${command}s.`
}

const generateKarmaResponse = (username: string) => {
  const stats = userStatistics(username)
  if (stats.report === 0 && stats.commend === 0) {
    return `**${username}** has not been reported or commended yet. 🤏`
  }
  return `**${username}** currently has **\`${stats.score}\` karma**. (\`💖\`**\`${stats.commend}\`** | \`💩\`**\`${stats.report}\`**)`
}

const generateResponse = (command: ActionNames, username: string) => {
  if (command === 'karma') {
    return generateKarmaResponse(username)
  }
  return generateCommandRepsonse(command, username)
}

const buildPlugin = (descriptor: ApplicationCommandData): InteractionPlugin => ({
  name: descriptor.name,
  descriptor: descriptor,
  onNewInteraction: async (interaction: ChatInputCommandInteraction) => {
    const username = interaction.options.getString('username')
    if (!username) {
      return
    }
    await interaction.reply(generateResponse(interaction.commandName as ActionNames, username))
  },
})

// load the records
load('commend', commends)
load('report', reports)
// export the commands

const descriptors: ApplicationCommandData[] = [
  {
    name: KARMA_COMMAND,
    description: 'Show current karma of a user.',
    options: [
      {
        name: 'username',
        description: 'Name of the user you want to display their karma for',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: COMMEND_COMMAND,
    description: 'Commend a user for their heroic deeds.',
    options: [
      {
        name: 'username',
        description: 'Name of the user you want to commend',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: REPORT_COMMAND,
    description: 'Report a user for their heinous crimes.',
    options: [
      {
        name: 'username',
        description: 'Name of the user you want to report',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
]

export const [ReportInteraction, CommendInteraction, KarmaInteraction] = descriptors.map((x) => buildPlugin(x))
