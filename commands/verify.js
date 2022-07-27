const { SlashCommandBuilder } = require('@discordjs/builders')
const axios = require('axios')
const { MessageEmbed } = require('discord.js')

const get = async url => {
  return await axios
    .get(url)
    .then(r => ({ data: r.data.data }))
    .catch(e => ({ error: e.response.data.error }))
}

const log = (...args) => console.log(...args)

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

    log('[COMMAND][VERIFY] verifying address', address)

    try {
      const { guildId } = interaction

      log('[COMMAND][VERIFY] api/v1/discord getting...', guildId)
      // https://www.joinlist.me/api/v1/discord?serverId=902229215993282581
      const { data: discordData } = await get(
        `https://www.joinlist.me/api/v1/discord?serverId=${guildId}`
      )
      log('[COMMAND][VERIFY] api/v1/discord response', discordData)


      if (discordData?.length === 0) {
        // TODO: better error message
        return interaction.reply({
          content: 'No project found for this guild.',
          ephemeral: true
        })
      }

      const projectId = discordData[0].projectId

     
      // now get the project details givent the projectId
      log('[COMMAND][VERIFY] api/v4/projects getting...', projectId)
      const { data: projectData } = await get(
        `https://www.joinlist.me/api/v4/projects/${projectId}`
      )
      log('[COMMAND][VERIFY] api/v4/projects response', projectData)

      if (!projectData) {
        return interaction.reply({
          content: 'No project found for this guild.',
          ephemeral: true
        })
      }

      const { slug, name, id } = projectData

      // now get the project details givent the projectId
      log('[COMMAND][VERIFY] api/v1/entries getting...', projectId)
      const { data } = await get(
        `https://www.joinlist.me/api/v1/entries?address=${address}&projectId=${id}`
      )
      log('[COMMAND][VERIFY] api/v1/entries response', data)

      const isVerified = data?.length > 0

      log('[COMMAND][VERIFY] isVerified', isVerified)

      interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor(isVerified ? 'GREEN' : 'RED')
            .setTitle(name)
            .setURL(`https://joinlist.me/${slug}`) // could be the url which would show the address in the Verify input. e.g joinlist.me/{project}?address={address}
            .setDescription(
              isVerified
                ? 'Wallet successfully registered'
                : 'Wallet not registered'
            )
            .setThumbnail(
              isVerified
                ? 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/tick.png'
                : 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/cross.png'
            )
            .setTimestamp()
            .setFooter(`Address: ${address}`)
        ]
      })
    } catch (e) {
      log('[COMMAND][VERIFY] Something went wrong handling the verify command', e)

      interaction.reply({
        content: `Something went wrong getting the entry for ${address}. Reason: ${e.message}`
      })
    }
  }
}
