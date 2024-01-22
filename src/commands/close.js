const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { model } = require("mongoose");
const TicketSchema = require("../Schemas/TicketSchema");
const SettingSchema = require("../Schemas/SettingSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("This command closes a ticket.")
    .setDMPermission(false),
  async execute(interaction) {
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

    // Send confirm message
    const confirmEmbed = new EmbedBuilder()
      .setColor(Colors.DarkRed)
      .setTitle("Close")
      .setDescription(
        "Are you sure you want to close the ticket?\n\n*Use one off the button below, this request will be exipred in 10 seconds.*"
      )
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    const closeBtn = new ButtonBuilder()
      .setLabel("Close")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Success)
      .setCustomId("confirmCloseBtn");
    const cancelBtn = new ButtonBuilder()
      .setLabel("Cancel")
      .setEmoji("🔨")
      .setStyle(ButtonStyle.Danger)
      .setCustomId("confirmCancelBtn");
    const confirmRow = new ActionRowBuilder().setComponents(
      closeBtn,
      cancelBtn
    );

    await interaction.reply({
      ephemeral: true,
      embeds: [confirmEmbed],
      components: [confirmRow],
    });
  },
};
