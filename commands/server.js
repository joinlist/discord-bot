const { SlashCommandBuilder } = require('@discordjs/builders')
const { EmbedBuilder } = require('discord.js')
module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Display info about this server.'),
  async execute(interaction) {
    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle(`Server Name: ${interaction.guild.name}`)
          .setDescription(`Total members: ${interaction.guild.memberCount}`)
      ]
    })
  }
}
