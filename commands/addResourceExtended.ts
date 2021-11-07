import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import { ResourceBuilder, isContributor, isValidUrl } from '../utils';
import { setCategorySelection, setBlockchainSelection, setLevelSelection, setMediaTypeSelection, setTagSelection } from './menuSelections';
import { addContributor } from './interactions'

export const data = new SlashCommandBuilder()
    .setName('add-resource-extended')
    .setDescription('Adds a resource to the Developer DAO knowledge base')
    .addStringOption(
        option => option.setRequired(true)
        .setName('url')
        .setDescription('Enter a link to a resource'))
    .addStringOption(
      option => option.setRequired(true)
      .setName('title')
      .setDescription('Enter the resource title'))
    .addStringOption(
      option => option.setRequired(true)
      .setName('summary')
      .setDescription('Enter the resource summary'))
    .addStringOption(option =>
      option.setName('level')
        .setDescription('The resource level')
        .setRequired(true)
        .addChoice('Beginner', 'Beginner')
        .addChoice('Intermediate', 'Intermediate')
        .addChoice('Advanced', 'Advanced'))
    .addStringOption(option =>
      option.setName('media')
        .setDescription('Media type')
        .setRequired(true)
        .addChoice('Article', 'Article')
        .addChoice('Video', 'Video')
        .addChoice('Paid Course', 'Paid Course')
        .addChoice('Free Course', 'Free Course'));

function ConfigureEmbed(embed: MessageEmbed, resource: ResourceBuilder): MessageEmbed {
  embed.setAuthor(resource.author ?? 'Author');
  embed.setTitle(resource.title ?? 'Title');
  embed.setURL(resource.source ?? 'Source');
  embed.setDescription(resource.summary ?? 'Summary');
  embed.setFields([
    { name: 'level', value: resource.level ?? 'Level', inline: true },
    { name: 'mediatype', value: resource.mediaType ?? 'Media Type', inline: true },
    { name: 'blockchain', value: resource.blockchain ? resource.blockchain.map(b => b.name).join(', ') : 'Blockchain', inline: false },
    { name: 'category', value: resource.category ? resource.category.map(c => c.name).join(', ') : 'Category', inline: true },
    { name: 'tags', value: resource.tags ? resource.tags.map(t => t.name).join(', ') : 'Tags', inline: true },
  ]);

  return embed;
}

function UpdateEmbed(embed: MessageEmbed, embedMessage: Message, resource: ResourceBuilder): void {
  const updatedEmbed = ConfigureEmbed(new MessageEmbed(embed), resource);
  embedMessage.edit({ embeds: [updatedEmbed] })
}

export async function execute(interaction: CommandInteraction) {

  interaction.options.get

  const userInput = interaction.options.getString('url')
  if (userInput === undefined || userInput == null) {
      return;
    }

    if (isValidUrl(userInput)) {
        const newResource = new ResourceBuilder();
        newResource.source = userInput;
        const filter = (m: Message) => interaction.user.id === m.author.id;
        await interaction.reply({ content: 'Please complete the addition process in the DM you just received', ephemeral: true });
        const dmChannel = await interaction.user.createDM();

        if (!await isContributor(interaction.user)) {
          newResource.contributor = await addContributor(dmChannel);
        }
        else {
          // TODO: Get the contributorID from AirTable
          // newResource.contributor = await getContributorId(dmChannel.recipient.discriminator);
        }

        await dmChannel.send('Please enter more information about the article');

        // TODO: Work out how to add an Author
        newResource.author = 'Testing'

        const resourceEmbed = ConfigureEmbed(new MessageEmbed(), newResource);
        const embedMessage = await dmChannel.send({ embeds: [resourceEmbed] });
        const originalMessage = await dmChannel.send('Article title');
        const receivedMessages = await originalMessage.channel.awaitMessages({ filter, max: 1 })
        const titleMessage = receivedMessages.first();
        if (titleMessage) {
          newResource.title = titleMessage.content ?? ''
          originalMessage.delete();
          UpdateEmbed(resourceEmbed, embedMessage, newResource);
        }

        const summaryRequest = await dmChannel.send('Article summary');
        const summaryMessages = await summaryRequest.channel.awaitMessages({ filter, max: 1 })
        const summaryMessage = summaryMessages.first();
        if (summaryMessage) {
          newResource.summary = summaryMessage.content ?? ''
          summaryRequest.delete();
          UpdateEmbed(resourceEmbed, embedMessage, newResource);
        }

        const levelMessage = await setLevelSelection(dmChannel);
        const levelResponse = await dmChannel.awaitMessageComponent<'SELECT_MENU'>();
        newResource.level = levelResponse.values[0];
        levelMessage.delete();
        newResource.level = levelResponse.values[0];
        UpdateEmbed(resourceEmbed, embedMessage, newResource);

        const mediaMessage = await setMediaTypeSelection(dmChannel);
        const mediaTypeResponse = await dmChannel.awaitMessageComponent<'SELECT_MENU'>();
        newResource.mediaType = mediaTypeResponse.values[0];
        mediaMessage.delete();
        UpdateEmbed(resourceEmbed, embedMessage, newResource);

        const blockchainResponses = await setBlockchainSelection(dmChannel);
        newResource.blockchain = blockchainResponses;
        UpdateEmbed(resourceEmbed, embedMessage, newResource);

        const tagsResponses = await setTagSelection(dmChannel);
        newResource.tags = tagsResponses;
        UpdateEmbed(resourceEmbed, embedMessage, newResource);

        const categoryResponses = await setCategorySelection(dmChannel);
        newResource.category = categoryResponses;
        UpdateEmbed(resourceEmbed, embedMessage, newResource);

        console.log(newResource.build());
        // TODO: Send this to AirTable
    }
    else {
      await interaction.reply({ content: 'Invalid URL! Please try again.', ephemeral: true })
      return
    }
}
