const {
  SlashCommandBuilder,
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const { model } = require("mongoose");
const TicketSchema = require("../Schemas/TicketSchema");
const SettingSchema = require("../Schemas/SettingSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("This command moves a specific ticket.")
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("The category where the ticket will be moved.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .setDMPermission(false),
  async execute(interaction, client) {
    // Get slash options
    const category = interaction.options.getChannel("category");

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

    // Check category
    if (
      !settings.data.ticketCategories.some(
        (ticketCategory) => ticketCategory.category === category.id
      ) &&
      settings.data.generalTicketCategory !== category.id
    )
      return interaction.reply({
        ephemeral: true,
        content: "This isn't a valid category.",
      });

    // Get Category info
    let categoryInfo = settings.data.ticketCategories.find(
      (ticketCategory) => ticketCategory.category === category.id
    ) || {
      name: "General",
      category: settings.data.generalTicketCategory,
    };

    // Update db + move
    await ticketsCollection.updateOne(
      { _id: ticket._id },
      { type: categoryInfo.name }
    );
    await interaction.channel.setParent(categoryInfo.category).catch(() => {});

    // Update message
    const ticketEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Ticket Opened")
      .setDescription(
        `  Wait for a staff response.\n\n__**Ticket Info:**__\n> Category: \`${
          categoryInfo.name
        }\`\n> Created At: <t:${parseInt(
          ticket.createdAt / 1000
        )}:d> <t:${parseInt(ticket.createdAt / 1000)}:t>\n> Claimed: ${
          ticket.claimed ? `<@${ticket.claimed}>` : "`No`"
        }\n\n__**Questions:**__\n${
          ticket.questions[0]
            ? ticket.questions
                .map(
                  (questionInfo) =>
                    `> ${questionInfo.question}\n\`\`\`${questionInfo.answer}\`\`\`\n`
                )
                .join("")
            : "`No questions set.`"
        }`
      )
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    const ticketMessage = await interaction.channel.messages
      .fetch(ticket.messageId)
      .catch(() => {});
    if (ticketMessage) ticketMessage.edit({ embeds: [ticketEmbed] });

    // Reply
    await interaction.reply({
      ephemeral: true,
      content: "Successfully moved this ticket.",
    });

    // Move message
    const movedEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Moved")
      .setDescription(
        `This ticket has been moved to **${categoryInfo.name}** category.`
      )
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });
    await interaction.channel.send({ embeds: [movedEmbed] });

    movedEmbed
      .setDescription(
        `Your ticket has been moved to **${categoryInfo.name}** category.`
      )
      .addFields({
        name: "Ticket:",
        value: `${interaction.channel}`,
        inline: false,
      });
    const user = await client.users.fetch(ticket.user).catch(() => {});
    if (user) await user.send({ embeds: [movedEmbed] }).catch(() => {});

    // Fix permissions
    const permissions = [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: settings.data.ticketRole,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
    ];
    ticket.canView.forEach(async (user) => {
      const userExist = interaction.guild.members.fetch(user).catch(() => {});
      if (userExist)
        permissions.push({
          id: user,
          allow: [PermissionsBitField.Flags.ViewChannel],
        });
    });

    await interaction.channel.permissionOverwrites.set(permissions);
  },
};
