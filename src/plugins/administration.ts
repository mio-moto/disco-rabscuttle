import {
  ApplicationCommandType,
  Client,
  ContextMenuCommandInteraction,
} from 'discord.js';
import {ContextMenuPlugin} from '../message/hooks';

let administrators: string[] = [];

const deleteMessage = async (interaction: ContextMenuCommandInteraction) => {
  if (!administrators.includes(interaction.user.tag)) {
    return;
  }

  if (!interaction.isMessageContextMenuCommand()) {
    return;
  }

  if (interaction.targetMessage.author.id !== interaction.client.user.id) {
    return;
  }

  await interaction.targetMessage.delete();
  await interaction.reply({ephemeral: true, content: 'Message deleted.'});
};

const fetchDelete = async (client: Client, server: string, channel: string, message: string) => {
  var targetChannel = (await (await client.guilds.fetch(server)).channels.fetch(channel))
    if(targetChannel?.isTextBased()) {
      (await targetChannel.messages.fetch(message)).delete();
    }
}


const deleteMessageCommand: ContextMenuPlugin = {
  name: "Admin Delete",
  descriptor: {
    name: 'Delete',
    type: ApplicationCommandType.Message,
  },
  onInit: async (_, __, config) => {
    administrators = config.administrators;
  },
  onNewContextAction: deleteMessage,
};

export default deleteMessageCommand;
