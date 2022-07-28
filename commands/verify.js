const { SlashCommandBuilder } = require('@discordjs/builders')
const axios = require('axios')
const { MessageEmbed } = require('discord.js')
const { db } = require('../utils/db')

const get = async url => {
  return await axios
    .get(url)
    .then(r => ({ data: r.data.data }))
    .catch(e => ({ error: e.response.data.error }))
}

const log = (...args) => console.log(...args)

const prettyHex = (str, len = 4) =>
  str && `${str.substring(0, len)}...${str.substring(str.length - len)}`

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a wallet has registered on a project.')
    .addStringOption(
      option => option.setName('address').setDescription('Enter your address')
      //.setRequired(true)
    ),
  async execute(interaction) {
    const address = interaction.options.getString('address')

    log('[COMMAND][VERIFY] verifying address', address)

    try {
      const {
        guildId,
        user: { id: discordUserId }
      } = interaction

      // verify the discord has registered on the project
      if (!address) {
        console.log('discordUserId', discordUserId, 'guildId', guildId)

        const userId = (
          await db
            .from('Account')
            .select('userId')
            .match({ providerAccountId: discordUserId })
            .single()
        )?.data?.userId

        if (!userId) {
          throw Error('account not found')
        }

        // get the user accounts given the userId
        const profiles = (
          await db.from('Account').select('provider, profile').match({ userId })
        )?.data
        const accounts = profiles.map(({ provider, profile }) => {
          if (provider === 'siwe') {
            return {
              provider: 'ethereum',
              username: prettyHex(profile.preferred_username)
            }
          } else if (provider === 'twitter') {
            return {
              provider,
              username: profile.screen_name
            }
          } else if (provider === 'discord') {
            return {
              provider,
              username: profile.username
            }
          }
        })

        // get the projectId from the guildId
        const projectId = (
          await db
            .from('Discord')
            .select('projectId')
            .match({ serverId: guildId })
            .single()
        )?.data?.projectId

        if (!projectId) {
          throw Error('Project not found')
        }

        // check if the user has an entry for this project
        const hasEntry =
          (
            await db
              .from('Entry')
              .select('id')
              .match({ userId, projectId })
              .single()
          )?.data?.id != null

        // if (!hasEntry) {
        //   throw Error('User does not have an entry for this project')
        // }

        // get the project from the projectId
        const project = (
          await db
            .from('Project')
            .select('id, name, slug')
            .match({ id: projectId })
            .single()
        )?.data

        interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor(hasEntry ? 'GREEN' : 'RED')
              .setTitle(project.name)
              .setURL(`https://joinlist.me/${project.slug}`) // could be the url which would show the address in the Verify input. e.g joinlist.me/{project}?address={address}
              .addFields(
                { name: '\u200B', value: '\u200B' },
                ...accounts.map(({ provider, username }) => ({ name: provider, value: username, inline: true })),
                // { name: 'Discord', value: 'ekko', inline: true },
                // { name: 'Twitter', value: 'sambarrowclough', inline: true },
                // { name: 'Ethereum', value: '0x..abc', inline: true },
                { name: '\u200B', value: '\u200B' }
              )
              .setDescription(
                hasEntry
                  ? 'Wallet successfully registered'
                  : 'Wallet not registered'
              )
              .setThumbnail(
                hasEntry
                  ? 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/tick.png'
                  : 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/cross.png'
              )
              .setTimestamp()
            //.setFooter(`Address: ${address}`)
          ]
        })
      } else {
        // verify the given address is registered on the project
        log('[COMMAND][VERIFY] api/v1/discord getting...', guildId)
        // https://www.joinlist.me/api/v1/discord?serverId=902229215993282581
        const { data: discordData } = await get(
          `https://www.joinlist.me/api/v1/discord?serverId=${guildId}`
        )
        log('[COMMAND][VERIFY] api/v1/discord response', discordData)

        if (discordData?.length === 0) {
          // TODO: better error message
          return interaction.reply({
            content: 'No Joinlist project found for this guild.',
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
      }
    } catch (e) {
      log(
        '[COMMAND][VERIFY] Something went wrong handling the verify command',
        e
      )

      interaction.reply({
        content: `Failed: ${e.message}`
      })
    }
  }
}
