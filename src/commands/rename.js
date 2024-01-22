const { SlashCommandBuilder, Colors } = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../Schemas/SettingSchema");
const TicketSchema = require("../Schemas/TicketSchema");
const { EmbedBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("This command renames a specific ticket.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The new name of the ticket.")
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction) {
    // Get options
    const name = interaction.options.getString("name");

    // Get settings
    const settingsCollection = new model("settings", SettingSchema);
    const settings = await settingsCollection.findOne({
      guildId: interaction.guild.id,
    });
    if (!settings)
      return interaction.reply({
        ephemeral: true,
        content: "There's been an error.",
      });
    if (!settings.data.ticketRole)
      return interaction.reply({
        ephemeral: true,
        content: "Staff role not yet set.",
      });

    // Check perms
    if (!interaction.member.roles.cache.has(settings.data.ticketRole))
      return interaction.reply({
        ephemeral: true,
        content: "You don’t have sufficient permissions to use this button.",
      });

    // Get ticket
    const ticketsCollection = new model("tickets", TicketSchema);
    const ticket = await ticketsCollection.findOne({
      channelId: interaction.channel.id,
    });
    if (!ticket)
      return interaction.reply({
        ephemeral: true,
        content: "You must execute this command only in a ticket channel.",
      });

    // Rename
    const oldName = interaction.channel.name;
    await interaction.channel.setName(name);

    // Output
    const renameEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Ticket Renamed")
      .setDescription(
        `This ticket has been renamed from **${oldName}** to **${name}**.`
      )
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    await interaction.reply({ embeds: [renameEmbed] });
  },
};
