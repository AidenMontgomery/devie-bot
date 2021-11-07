import { SlashCommandBuilder, inlineCode } from '@discordjs/builders';
import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Resource } from '../types';
import { isContributor, isValidUrl, readBlockchain, readCategory, readTags } from '../utils/index';

export const data = new SlashCommandBuilder()
    .setName('add-resource')
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

function getSanitizedResourceInfo(interaction: CommandInteraction): Resource {
   const source = interaction.options.getString('url') ?? '';
   const title = interaction.options.getString('title') ?? '';
   const summary = interaction.options.getString('summary') ?? '';
   const level = interaction.options.getString('level') ?? '';
   const mediaType = interaction.options.getString('media') ?? '';

   return {
     author: 'Author',
     title,
     source,
     summary,
     level,
     mediaType,
     contributor: '',
     category: [],
     blockchain: [],
     tags: [],
   }
 }

 function buildEmbed(resource: Resource) {
    const resourceEmbed = new MessageEmbed().setColor('#0099ff');
    resourceEmbed.setAuthor(resource.author ?? 'Author');
    resourceEmbed.setTitle(resource.title ?? 'Title');
    resourceEmbed.setURL(resource.source ?? 'Source');
    resourceEmbed.setDescription(resource.summary ?? 'Summary');
    resourceEmbed.setFields([
      { name: 'level', value: resource.level ?? 'Level', inline: true },
      { name: 'mediatype', value: resource.mediaType ?? 'Media Type', inline: true },
      { name: 'blockchain', value: resource.blockchain ? resource.blockchain.map(b => b.name).join(', ') : 'Blockchain', inline: false },
      { name: 'category', value: resource.category ? resource.category.map(c => c.name).join(', ') : 'Category', inline: true },
      { name: 'tags', value: resource.tags ? resource.tags.map(t => t.name).join(', ') : 'Tags', inline: true },
    ]);
     return resourceEmbed;
 }

export async function execute(interaction: CommandInteraction) {
    // if (!await isContributor(interaction.user)) {
    //     await interaction.reply(`it looks like you are not a contributor yet!\nPlease add yourself using: ${inlineCode('/add-contributor')}`)
    //     return
    // }

    const url = interaction.options.getString('url');
  if (url && !isValidUrl(url)) {
    interaction.reply('Invalid URL provided, please check it before submitting again.');
    return;
  }

   const REPLY = {
     YES: 'yes',
     NO: 'no',
   };
   const resource = getSanitizedResourceInfo(interaction);
   console.log(resource);

   const resourceEmbed = buildEmbed(resource);

    const tags = await readTags();
    const tagsOptions = tags.map(tag => ({ label: tag.name, value: tag.id }));
    const tagsRow = new MessageActionRow().addComponents(
      new MessageSelectMenu()
      .setCustomId('tags')
      .setPlaceholder('Select tags')
      .setMaxValues(Math.min(tagsOptions.length, 25))
      .addOptions(tagsOptions),
    );

    const blockchain = await readBlockchain();
    const bcOptions = blockchain.map(bc => ({ label: bc.name, value: bc.id }));
    const bcRow = new MessageActionRow().addComponents(
      new MessageSelectMenu()
      .setCustomId('blockchain')
      .setPlaceholder('Select blockchain')
      .setMaxValues(Math.min(bcOptions.length, 25))
      .addOptions(bcOptions),
    );

    const categories = await readCategory();
    const categoryOptions = categories.map(category => ({ label: category.name, value: category.id }));
    const categoryRow = new MessageActionRow().addComponents(
      new MessageSelectMenu()
      .setCustomId('category')
      .setPlaceholder('Select categories')
      .setMaxValues(Math.min(categoryOptions.length, 25))
      .addOptions(categoryOptions),
    );

    const selectionRows = [bcRow, categoryRow, tagsRow];

    await interaction.reply({
      embeds: [resourceEmbed],
      content: 'Tell me about the resource',
      components: selectionRows,
      ephemeral: true,
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      maxComponents: 3,
      time: 60_000,
      componentType: 'SELECT_MENU',
    });

    collector?.on('collect', (menuInteraction) => {
      switch (menuInteraction.customId) {
        case 'category': {
          resource.category = menuInteraction.values.map(v => {
            const lookupItem = categories.find((value) => value.id === v);
            return lookupItem ?? { name: 'Unknown', id: v };
          });
          break;
        }
        case 'tags': {
          resource.tags = menuInteraction.values.map(v => {
            const lookupItem = tags.find((value) => value.id === v);
            return lookupItem ?? { name: 'Unknown', id: v };
          });
          break;
        }
        case 'blockchain': {
          resource.blockchain = menuInteraction.values.map(v => {
            const lookupItem = blockchain.find((value) => value.id === v);
            return lookupItem ?? { name: 'Unknown', id: v };
          });
          break;
        }
      }

      const menuRows = [];

      if (resource.blockchain === undefined || resource.blockchain.length === 0) {
        menuRows.push(bcRow);
      }
      if (resource.category === undefined || resource.category.length === 0) {
        menuRows.push(categoryRow);
      }
      if (resource.tags === undefined || resource.tags.length === 0) {
        menuRows.push(tagsRow);
      }

      const updatedEmbed = buildEmbed(resource);
      menuInteraction.update({ components: menuRows })
      interaction.editReply({ embeds: [updatedEmbed] });
    });

    collector?.on('end', async () => {
      const noButton = new MessageButton()
        .setCustomId(REPLY.NO)
        .setLabel('Cancel')
        .setStyle('DANGER');
      const yesButton = new MessageButton()
        .setCustomId(REPLY.YES)
        .setLabel('Add resource')
        .setStyle('PRIMARY');
      const buttonRow = new MessageActionRow()
        .addComponents(
          noButton,
          yesButton,
        );

      await interaction.editReply({
        components: [buttonRow],
      });

     const buttonReply = await interaction.channel?.awaitMessageComponent({ componentType: 'BUTTON' });
     if (!buttonReply) {
       return;
     }

     const buttonSelected = buttonReply.customId;
     buttonReply.update({ embeds: [resourceEmbed], components: [] });
     if (buttonSelected === REPLY.NO) {
       buttonReply.followUp({
         content: `"${resource.title}" was not added`,
         ephemeral: true,
       })
       return;
     }
    })
}
