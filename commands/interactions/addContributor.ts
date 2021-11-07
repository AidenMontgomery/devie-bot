import { DMChannel, Message, MessageActionRow, MessageButton } from 'discord.js';
import { isContributor, createContributor } from '../../utils/index';

export async function addContributor(dmChannel: DMChannel) {
    if (await isContributor(dmChannel.recipient)) {
        dmChannel.send('Sorry! You can not add yourself because you are already a contributor!')
        return
    }
    const filter = (m: Message) => dmChannel.recipient.id === m.author.id;

    const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('nope')
					.setLabel('No idea')
					.setStyle('SECONDARY'),
			);

    const nftIDRequest = await dmChannel.send({ content: 'Please enter your NFT ID if you know it.', components: [ row ] });
    const response = await Promise.race([
      nftIDRequest.channel.awaitMessages({ filter, max: 1 }),
      nftIDRequest.channel.awaitMessageComponent({ componentType: 'BUTTON' }),
    ]);

    let nftID;
    nftIDRequest.delete();
    if ('componentType' in response) {
      console.log('FINE DO NOT GIVE IT TO ME');
    }
    else {
      const message = response.first();
      if (message && message.content) {
        nftID = message.content.startsWith('#') ? message.content.slice(1) : message.content;
        nftID = parseInt(nftID);
        console.log(nftID);
        if (!Number.isInteger(nftID)) {
          console.log('WHAT are you DOING?');
        }
        else {
          console.log('I GOT YOUR NFT');
        }
      }
    }

    // const contributorId = await createContributor(dmChannel.recipient.discriminator, nftID);

    return 'testingID' // TODO: This should be the ID of the contributor created
}
