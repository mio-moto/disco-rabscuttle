import {CommandInteraction} from 'discord.js';

export default (
  interaction: CommandInteraction,
  message: string,
  durationInMs = 10000
) => {
  interaction.followUp(message, {ephemeral: true});
  setTimeout(() => {
    interaction.deleteReply();
  }, durationInMs);
};
