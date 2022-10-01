import {ChatInputCommandInteraction} from 'discord.js';

export default async (
  interaction: ChatInputCommandInteraction,
  message: string,
  durationInMs = 10000
) => {
  try {
    await interaction.followUp({content: message});
    setTimeout(async () => {
      await interaction.deleteReply();
    }, durationInMs);
  } catch { }
};
