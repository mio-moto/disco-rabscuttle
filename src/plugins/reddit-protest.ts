import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ApplicationCommandOptionType,
    EmbedBuilder,
  } from 'discord.js';
  import {readFile, writeFile} from 'fs';
  import {AutoCompletePlugin, InteractionPlugin} from '../message/hooks';
  import {Logger} from 'winston';
  import {shuffle} from './pepe-storage/randomizer';
  
  let logger: Logger;
//         const message = `r/${sub} will go down to protest ${reason} and will return ${duration}`

  const Effects: string[] = [
    "dark",
    "down",
    "offline",
    "bye bye",
    "for a shit",
    "up",
    "left",
    "right",
    "nowhere",
    "go"
  ]

  const Reasons: string[] = [
    "the protest",
    "the api pricing",
    "some change you would never have noticed otherwise",
    "that videogames are not for **me** anymore",
    "just because",
    "the gay frogs",
    "the lack of good memes",
    "ice being too expensive",
    "the economy",
    "",
    "the protest of the protest",
    "to dunk on 'dem mods",
    ""
  ];
  const Durations: string[] = [
    "never",
    "maybe some day",
    "when this channel is less homo erotic",
    "the day the perfect programming language exists",
    "or not. Who cares.",
    "on April 20th",
    "eventually",
    "tomorrow",
    "when my pizza arrived",
    "ON SATURDAY NIGHT LIVE ON CNN",
    "when you stop spamming these damn pepes",
    "when capitalism has been overthrown",
    "someone fixes Rabs API pricing"
  ]


  
  const plugin: InteractionPlugin = {
    name: "Protest",
    descriptor: {
      name: 'protest',
      description: 'Share why your subreddit goes down with everyone else',
      options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "subreddit",
            description: "The subredditg name, insert is r/{subreddit}",
            required: true,

        }, 
        {
            type: ApplicationCommandOptionType.String,
            name: "reason",
            description: "The reason why it goes down: 'r/sub will go down to protest'",
            required: false
        }
      ]
    },
  
    onInit: async (_, __, ___, log) => {
      logger = log;
    },
    onNewInteraction: async (interaction: ChatInputCommandInteraction) => {
        const sub = interaction.options.getString("subreddit", true);
        const reason = interaction.options.getString("reason", false) ?? shuffle(Reasons).pop()!;
        const duration = shuffle(Durations).pop()!;
        const direction = shuffle(Effects).pop()!;
        const message = `r/${sub} will go ${direction} to protest ${reason} and will return ${duration}`;
        interaction.reply({ embeds: [new EmbedBuilder().setTitle(message).setColor("Red").setTimestamp(new Date())]});
    }
  };
  
  export default plugin;
  