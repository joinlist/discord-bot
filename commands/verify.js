const { SlashCommandBuilder } = require('@discordjs/builders')
const { MessageEmbed } = require('discord.js')
const { db } = require('../utils/db')

const log = (...args) => console.log(...args)

const prettyHex = (str, len = 4) =>
  str && `${str.substring(0, len)}...${str.substring(str.length - len)}`

const getAccounts = async userId => {
  const profiles = (
    await db
      .from('Account')
      .select('provider, providerAccountId, profile')
      .match({ userId })
  )?.data
  const accounts = profiles?.map(({ provider, providerAccountId, profile }) => {
    if (provider === 'siwe') {
      return {
        provider: 'ethereum',
        username: profile?.preferred_username
          ? prettyHex(profile.preferred_username)
          : providerAccountId
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
  })
  return accounts || []
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a wallet has registered on a project.')
    .addStringOption(option =>
      option.setName('project').setDescription('Enter your address')
    )
    .addStringOption(option =>
      option
        .setName('address')
        .setDescription('Enter your address')
    ),
  async execute(interaction) {
    const address = interaction.options.getString('address')

    try {
      const {
        guildId,
        user: { id: discordUserId }
      } = interaction

      // verify the discord has registered on the project
      if (!address) {
        log('[COMMAND][/VERIFY] START', guildId, discordUserId)
        //console.log('discordUserId', discordUserId, 'guildId', guildId)

        log('[COMMAND][/VERIFY] getting userId')

        // is it possible to get the other accounts that match userId here?
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

        log('[COMMAND][/VERIFY] got userId')

        // get the user accounts given the userId
        log('[COMMAND][/VERIFY] getting accounts')
        const accounts = (await getAccounts(userId))?.filter(Boolean)
        log('[COMMAND][/VERIFY] got accounts')

        // get the projectId from the guildId
        // TODO: creator can install bot on multiple projects.
        // how do we know which one to grab?
        log('[COMMAND][/VERIFY] getting projectId')
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

        log('[COMMAND][/VERIFY] got projectId')

        // check if the user has an entry for this project
        log('[COMMAND][/VERIFY] checking if user has entry')
        const hasEntry =
          (
            await db
              .from('Entry')
              .select('id')
              .match({ userId, projectId })
              .single()
          )?.data?.id != null
        log('[COMMAND][/VERIFY] user has entry', hasEntry)

        // get the project from the projectId to disiplay some info like the name and the url.
        log('[COMMAND][/VERIFY] getting project')
        const project = (
          await db
            .from('Project')
            .select('id, name, slug')
            .match({ id: projectId })
            .single()
        )?.data
        log('[COMMAND][/VERIFY] got project')

        log('[COMMAND][/VERIFY] sending reply')

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
                ...accounts?.map(account => {
                  return {
                    name: account?.provider,
                    value: account?.username,
                    inline: true
                  }
                }),
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
        log('[COMMAND][/VERIFY ADDRESS] START', guildId, discordUserId)

        // get userId from account where providerAccountId = address
        const userId = (
          await db
            .from('Account')
            .select('userId')
            .match({ providerAccountId: address })
            ?.single()
        )?.data?.userId
        // if (!userId) {
        //   throw Error(`No user found for address ${address}`)
        // }

        // get the user accounts given the userId
        const accounts = await getAccounts(userId)

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

        log('[COMMAND][/VERIFY ADDRESS] sending reply')

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
                ...accounts?.map(({ provider, username }) => ({
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
