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
              .setTitle(
                hasEntry
                  ? `Visit ${project.name} on Joinlist`
                  : `Visit ${project.name} on Joinlist to register`
              )
              .setURL(`https://joinlist.me/${project.slug}`) // could be the url which would show the address in the Verify input. e.g joinlist.me/{project}?address={address}
              .addFields(
                { name: '\u200B', value: '\u200B' },
                ...accounts.map(({ provider, username }) => ({
                  name: provider,
                  value: username,
                  inline: true
                })),
                { name: '\u200B', value: '\u200B' }
              )
              .setDescription(
                hasEntry
                  ? '✅ Wallet successfully registered'
                  : '❌ Wallet not registered'
              )
              .setThumbnail(
                hasEntry
                  ? 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/tick.png'
                  : 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/cross.png'
              )
              .setTimestamp()
          ]
        })
      } else {
        console.log('discordUserId', discordUserId, 'guildId', guildId)

        // get userId from account where providerAccountId = address
        const userId = (
          await db
            .from('Account')
            .select('userId')
            .match({ providerAccountId: address })
            ?.single()
        )?.data?.userId
        if (!userId) {
          throw Error(`No user found for address ${address}`)
        }

        // get all accounts for userId
        // get the user accounts given the userId
        const profiles = (
          await db
            .from('Account')
            .select('provider, providerAccountId, profile')
            .match({ userId })
        )?.data
        const accounts = profiles.map(
          ({ provider, providerAccountId, profile }) => {
            if (provider === 'siwe') {
              return {
                provider: 'ethereum',
                username: profile?.preferred_username ?? providerAccountId
              }
            } else if (provider === 'twitter') {
              return {
                provider,
                username: profile?.screen_name
              }
            } else if (provider === 'discord') {
              return {
                provider,
                username: profile?.username
              }
            }
          }
        )

        // get the projectId  from Discord where serverId = guildId
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

        if (!hasEntry) {
          throw Error('User does not have an entry for this project')
        }

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
              .setTitle(
                hasEntry
                  ? `Visit ${project.name} on Joinlist`
                  : `Visit ${project.name} on Joinlist to register`
              )
              .setURL(`https://joinlist.me/${project.slug}`) // could be the url which would show the address in the Verify input. e.g joinlist.me/{project}?address={address}
              .addFields(
                { name: '\u200B', value: '\u200B' },
                ...accounts.map(({ provider, username }) => ({
                  name: provider,
                  value: username,
                  inline: true
                })),
                { name: '\u200B', value: '\u200B' }
              )
              .setDescription(
                hasEntry
                  ? '✅ Wallet successfully registered'
                  : '❌ Wallet not registered'
              )
              .setThumbnail(
                hasEntry
                  ? 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/tick.png'
                  : 'https://dpspszizureppmrxkcri.supabase.co/storage/v1/object/public/files/cross.png'
              )
              .setTimestamp()
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
