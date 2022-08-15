const { SlashCommandBuilder } = require('@discordjs/builders')
const { EmbedBuilder } = require('discord.js')
const { InteractionType } = require('discord.js')
const { db } = require('../utils/db')
const log = console.log

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joinlist')
    .setDescription('Get info about a user or a server!')

    // we only listen to one subcommand here, but if we add another,
    // we'll need to handle it in the execute method. e.g if interaction.options.getSubcommand() === 'someSubcommand'
    // example: https://discordjs.guide/interactions/slash-commands.html#parsing-options
    .addSubcommand(subcommand =>
      subcommand
        .setName('verify')
        .setDescription('Info about a user')
        .addStringOption(option =>
          option
            .setName('project')
            .setDescription('Please select a project')
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('address').setDescription('Enter your address')
        )
    ),
  async execute(interaction) {
    // handle auto-complete
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      // Return a list of projects names given the guildId
      // the ApplicationCommand will receive the projectId from the user input
      const { guildId } = interaction

      log(
        `[JOINLIST][VERIFY][AUTOCOMPLETE] getting project ids for guildId: ${guildId}`
      )
      const projectIds = (
        await db
          .from('Discord')
          .select('projectId')
          .match({ serverId: guildId })
      )?.data?.map(({ projectId }) => projectId)
      log(
        `[JOINLIST][VERIFY][AUTOCOMPLETE] got ${projectIds.length} project ids for guildId: ${guildId}`
      )

      //given a liste of projectIds, get each project and add it to the list of projects
      log(
        `[JOINLIST][VERIFY][AUTOCOMPLETE] getting projects for projectIds: ${projectIds.join(
          ', '
        )}`
      )
      const promises = projectIds.map(projectId =>
        getProject({ projectId, select: 'id, name, slug' })
      )
      let projects = await Promise.all(promises)
      projects = projects.filter(Boolean)
      log(
        `[JOINLIST][VERIFY][AUTOCOMPLETE] got ${
          projects.length
        } projects for projectIds: ${projectIds.join(', ')}`
      )

      const focusedValue = interaction.options.getFocused()

      const filtered = projects.filter(choice =>
        choice.name.startsWith(focusedValue)
      )

      log(
        `[JOINLIST][VERIFY][AUTOCOMPLETE] filtered ${filtered.length} projects for guild: ${guildId}`
      )
      await interaction.respond(
        filtered.map((choice, i) => ({
          name: choice.name,
          value: String(choice.id)
        }))
      )
    } else if (interaction.type === InteractionType.ApplicationCommand) {
      const address = interaction.options.getString('address')
      const projectId = interaction.options.get('project')?.value

      const {
        user: { id: discordUserId }
      } = interaction

      if (!address) {
        log(
          `[JOINLIST][VERIFY][CMD] checking entry for discord user: ${discordUserId}`
        )

        // get the userId given the discordUserId
        log('[JOINLIST][VERIFY][CMD] getting userId')
        const userId = (
          await db
            .from('Account')
            .select('userId')
            .match({ providerAccountId: discordUserId })
            .single()
        )?.data?.userId
        log(`[JOINLIST][VERIFY][CMD] userId: ${userId}`)

        if (!userId) {
          throw Error('account not found')
        }

        // get the user accounts given the userId
        log('[JOINLIST][VERIFY][CMD] getting accounts')
        const accounts = (await getAccounts(userId))?.filter(Boolean)
        log('[JOINLIST][VERIFY][CMD] got accounts')

        // check if the user has an entry for this project
        log('[JOINLIST][VERIFY][CMD] checking if user has entry')
        const hasEntry =
          (
            await db
              .from('Entry')
              .select('id')
              .match({ userId, projectId })
              .single()
          )?.data?.id != null
        log('[JOINLIST][VERIFY][CMD] user has entry', hasEntry)

        // get the project from the projectId to disiplay some info like the name and the url.
        log('[JOINLIST][VERIFY][CMD] getting project')
        const project = await getProject({ projectId })
        log('[JOINLIST][VERIFY][CMD] got project')

        if (!project) {
          throw Error('project not found')
        }

        log('[JOINLIST][VERIFY][CMD] sending reply')

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(hasEntry ? '0x00E599' : '0xe50046')
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
        log(
          `[JOINLIST][VERIFY][CMD] checking entry given the address: ${address}`
        )

        // get userId from account where providerAccountId = address
        // get the userId given the discordUserId
        log('[JOINLIST][VERIFY][CMD] getting userId')
        const userId = (
          await db
            .from('Account')
            .select('userId')
            .match({ providerAccountId: address })
            .single()
        )?.data?.userId

        log(`[JOINLIST][VERIFY][CMD] userId: ${userId}`)

        // if (!userId) {
        //   throw Error('account not found')
        // }

        // get the user accounts given the userId
        log('[JOINLIST][VERIFY][CMD] getting accounts')
        const accounts = (await getAccounts(userId))?.filter(Boolean)
        log('[JOINLIST][VERIFY][CMD] got accounts')

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

        log('[JOINLIST][VERIFY][CMD] sending reply')

        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(hasEntry ? '0x00E599' : '0xe50046')
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
      }
    } else {
      // interaction not handled
      return interaction.respond('Not handled')
    }
  }
}

/* Helpers */

// get project from projectId
const getProject = async ({ projectId, select = 'id, name, slug' }) => {
  return (
    await db.from('Project').select(select).match({ id: projectId }).single()
  )?.data
}

// convert hex to short one. e.g 0x00555555555555555e599 -> 0x...599
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
