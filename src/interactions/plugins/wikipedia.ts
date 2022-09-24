import { AutocompleteInteraction, Client, CommandInteraction, MessageEmbed } from 'discord.js';
import { Config } from '../../config';
import { AutoCompletePlugin, InteractionPlugin } from '../../message/hooks';
import interactionError from './utils/interaction-error';
import wiki, { Page } from 'wikipedia';


const buildEmbed = async (page: Page): Promise<MessageEmbed> => {
    const embed = new MessageEmbed();
    embed.setURL(await page.canonicalurl);

    const summary = await page.summary();
    embed.setAuthor({
        name: page.title,
        iconURL: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Wikipedia_W_favicon_on_white_background.png"
    });

    if(summary.description) {
        embed.setTitle(summary.description);
    }
    embed.setDescription(summary.extract);
    if(summary.originalimage) {
        embed.setThumbnail(summary.thumbnail.source);
    }
    embed.setTimestamp(new Date(summary.timestamp))
    return embed;
}

const plugin: InteractionPlugin & AutoCompletePlugin = {
    descriptor: {
      name: 'wiki',
      description: 'Search and find wikipedia pages.',
      options: [
        {
          type: 'STRING',
          name: 'query',
          description: 'The query of the wikipedia page that interests you.',
          required: true,
          autocomplete: true
        },
      ],
    },
    onInit: async (_: Client, __: Config) => { },
    async onNewInteraction(interaction: CommandInteraction) {
      await interaction.deferReply();
      var query = interaction.options.getString("query", true);
      var pageNumber = Number.parseInt(query, 10);
      if(pageNumber > 0) {
          await interaction.followUp({embeds: [await buildEmbed(await wiki.page(query))]});
          return;
      }

      var pages = (await wiki.search(query));
      if(pages.results.length > 0) {
          var pageId = pages.results.find(x => x.pageid).pageid as Number;
          if(pageId) {
            await interaction.followUp({embeds: [await buildEmbed(await wiki.page(`${pageId}`))]});
            return;
        }
      }
      console.log(pages.results);
      console.log(pages.suggestion);
      interactionError(interaction, "Sorry, can't find that right now.");
    },
    async onAutoComplete(interaction: AutocompleteInteraction) {
        var query = interaction.options.getString("query", true);
        if(query?.length <= 0) {
            return;
        }
        var searchResult = await wiki.search(query);
        var autocomplete = searchResult.results.slice(0, 20).map(x => ({name: x.title, value: `${x.pageid}`}));
        await interaction.respond(autocomplete);
    }
  };
  
  export default plugin;
  