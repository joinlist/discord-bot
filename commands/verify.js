const { SlashCommandBuilder } = require('@discordjs/builders')
const axios = require('axios')
const { MessageEmbed } = require('discord.js')

function isHex(num) {
  return Boolean(num.match(/^0x[0-9a-f]+$/i))
}

const isEns = (str) => {
  console.log(str)
  const parts = str?.split('.')
  if (!parts) return false
  if (parts[1] === 'eth') return true
  else return false
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a wallet has registered on a project.')
    .addStringOption(option =>
      option
        .setName('address')
        .setDescription('Enter your address')
        .setRequired(true)
    ),
  async execute(interaction) {
    const address = interaction.options.getString('address')
    // https://www.joinlist.me/api/v1/entries?address=sam.eth&projectId=273

    // get projectId from guildId
    console.log(interaction.guildId)


    // get projectId from guildId
    const slug = 'foo'
    const projectId = '273'
    const projectName = 'Joinlist X Doodles'

    try {
      const { data, error } = await axios
        .get(
          `https://www.joinlist.me/api/v1/entries?address=${address}&projectId=${projectId}`
        )
        .then(r => ({ data: r.data.data }))
        .catch(e => ({ error: e.response.data.error }))

      // if (error) { 
      //   throw Error(`Failed to get entry from joinlist.me: ${error.message}`)
      // }

      // if address is an invalid hex or invalid ens, throw error
      // if (!isHex(address) || !isEns(address)) { 
      //   throw Error(`Address must be a valid hex or ens`)
      // }

      const isVerified = data?.length > 0

      interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor(isVerified ? 'GREEN' : 'RED')
            .setTitle(projectName)
            // .setDescription(`Verified: ${isVerified}`)
           
            //.setColor(0x0099FF)
            //.setTitle('Some title')
            .setURL(`https://joinlist.me/${slug}`) // could be the url which would show the address in the Verify input. e.g joinlist.me/{project}?address={address}
            //.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
            .setDescription(isVerified ? 'Wallet successfully registered' : 'Wallet not registered')
            .setThumbnail(
              isVerified
                ? 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/tick.png'
                : 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/cross.png'
            )
            // .addFields(
            //   { name: 'Regular field title', value: 'Some value here' },
            //   { name: '\u200B', value: '\u200B' },
            //   { name: 'Inline field title', value: 'Some value here', inline: true },
            //   { name: 'Inline field title', value: 'Some value here', inline: true },
            // )
            // .addFields({
            //   name: 'Inline field title',
            //   value: 'Some value here',
            //   inline: true
            // })
            //.setImage('https://i.imgur.com/AfFp7pu.png')
            .setTimestamp()
            .setFooter(`Address: ${address}`)
        ]
      })

      //interaction.reply({ content: data?.length === 1 ? 'Yes' : 'No' })
    } catch (e) {
      interaction.reply({
        content: `Something went wrong getting the entry for ${address}. Reason: ${e.message}`
      })
    }
  }
}
