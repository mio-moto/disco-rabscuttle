import { loggerFactory } from '../logging'
import type { ReactionPlugin } from '../message/hooks'

let administrators: string[] = []
let botId = ''
const logger = loggerFactory('P: Admin')

const deleteMessageCommand: ReactionPlugin = {
  name: 'Admin Delete',
  onInit: async (_, __, config) => {
    administrators = config.administrators
    botId = config.userId ?? ''
  },
  onNewReaction: async (reaction, user) => {
    const emojis = ['🚮', '🗑️']

    if (reaction.partial) {
      await reaction.fetch()
    }
    if (user.partial) {
      await reaction.fetch()
    }
    if (reaction.message.author == null) {
      await reaction.message.fetch()
    }

    if (reaction.partial || user.partial || reaction.message.author == null) {
      logger.error('Reaction, user or message is still partial')
      return
    }

    if (!emojis.includes(reaction.emoji.name ?? '')) {
      return
    }
    if (!administrators.includes(user.tag)) {
      logger.error(`Rejecting, is now an authorized user: ${user.tag}`)
      return
    }

    if (reaction.message.author.id !== botId) {
      logger.error('Rejecting, is not my own message.')
      return
    }

    await reaction.message.delete()
  },
}

export default deleteMessageCommand
