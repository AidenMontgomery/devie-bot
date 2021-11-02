import { DMChannel, MessageActionRow, MessageSelectMenu } from 'discord.js';

// TODO: Load these values from the appropriate table in AirTable
export const setLevelSelection = async (dmChannel: DMChannel) => {
  const row = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId('level')
      .setPlaceholder('Select level')
      .addOptions([
        {
          label: 'Beginner',
          value: 'beginner',
        },
        {
          label: 'Intermediate',
          value: 'intermediate',
        },
        {
          label: 'Advanced',
          value: 'advanced',
        },
      ]),
  );
  return await dmChannel.send({
    content: 'Select resource level',
    components: [row],
  });
};
