import { ApplicationCommandOptionType, type AutocompleteInteraction, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import wiki, { type Page } from 'wikipedia'
import type { AutoCompletePlugin, InteractionPlugin } from '../message/hooks'
import interactionError from './utils/interaction-error'

const buildEmbed = async (page: Page): Promise<EmbedBuilder> => {
  const embed = new EmbedBuilder()
  embed.setURL(await page.canonicalurl)

  const summary = await page.summary()
  embed.setAuthor({
    name: page.title,
    iconURL: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Wikipedia_W_favicon_on_white_background.png',
  })

  if (summary.description) {
    embed.setTitle(summary.description)
  }
  embed.setDescription(summary.extract)
  if (summary.originalimage) {
    embed.setThumbnail(summary.thumbnail.source)
  }
  embed.setTimestamp(new Date(summary.timestamp))
  return embed
}

const plugin: InteractionPlugin & AutoCompletePlugin = {
  name: 'Wikipedia',
  descriptor: {
    name: 'wiki',
    description: 'Search and find wikipedia pages.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'query',
        description: 'The query of the wikipedia page that interests you.',
        required: true,
        autocomplete: true,
      },
    ],
  },
  onInit: async () => {},
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    const query = interaction.options.getString('query', true)
    const pageNumber = Number.parseInt(query, 10)
    if (pageNumber > 0) {
      await interaction.followUp({
        embeds: [await buildEmbed(await wiki.page(query))],
      })
      return
    }

    const pages = await wiki.search(query)
    if (pages.results.length > 0) {
      const pageId = pages.results.find((x) => x.pageid).pageid as number
      if (pageId) {
        await interaction.followUp({
          embeds: [await buildEmbed(await wiki.page(`${pageId}`))],
        })
        return
      }
    }
    console.log(pages.results)
    console.log(pages.suggestion)
    interactionError(interaction, "Sorry, can't find that right now.")
  },
  async onAutoComplete(interaction: AutocompleteInteraction) {
    const query = interaction.options.getString('query', true)
    if (query?.length <= 0) {
      return
    }
    const searchResult = await wiki.search(query)
    const autocomplete = searchResult.results.slice(0, 20).map((x) => ({ name: x.title, value: `${x.pageid}` }))
    await interaction.respond(autocomplete)
  },
}

export default plugin
