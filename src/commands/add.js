const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../Schemas/SettingSchema");
const TicketSchema = require("../Schemas/TicketSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("This command adds a user in a specific ticket.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to add.")
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction) {
    // Get options
    const user = interaction.options.getUser("user");

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

    // Add user
    await interaction.channel.permissionOverwrites.create(user.id, {
      ViewChannel: true,
    });
    await ticketsCollection.updateOne(
      { _id: ticket._id },
      { $push: { canView: user.id } }
    );

    // output
    const addEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Added a User")
      .setDescription(`Added ${user} to the ticket.`)
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    await interaction.reply({ embeds: [addEmbed] });
  },
};
