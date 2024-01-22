const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  Colors,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../../Schemas/SettingSchema");
const TicketSchema = require("../../Schemas/TicketSchema");

module.exports = {
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "ticketOpen-btn") return;

    // Check if open
    const ticketsCollection = new model("tickets", TicketSchema);
    const searchTicket = await ticketsCollection.findOne({
      guildId: interaction.guild.id,
      user: interaction.user.id,
      closed: false,
    });
    if (searchTicket) {
      const channel = await interaction.guild.channels
        .fetch(searchTicket.channelId)
        .catch(() => {});
      if (!channel)
        return interaction.reply({
          ephemeral: true,
          content: "There's has been an error.",
        });

      return interaction.reply({
        ephemeral: true,
        content: `You already have a ticket opened. ${channel}`,
      });
    }

    // Get settings
    const settingsCollection = new model("settings", SettingSchema);
    const settings = await settingsCollection.findOne({
      guildId: interaction.guild.id,
    });
    if (
      !settings ||
      !settings.data.ticketRole ||
      !settings.data.generalTicketCategory ||
      !settings.data.ticketCategories ||
      !settings.data.ticketCategories[0]
    )
      return interaction.reply({
        ephemeral: true,
        content: "There's been an error.",
      });

    // Create channel
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: settings.data.generalTicketCategory,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: settings.data.ticketRole,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    await interaction.reply({
      ephemeral: true,
      content: `Successfully created a ticket, ${channel}.`,
    });

    // Send menu
    const ticketEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Ticket Opened")
      .setDescription(`Select the category of ticket.`)
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });
    const categoryMenu = new StringSelectMenuBuilder()
      .setPlaceholder("Select a category...")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        settings.data.ticketCategories.map((ticketCategory) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(ticketCategory.name)
            .setValue(ticketCategory.category)
            .setDescription(ticketCategory.description)
        )
      )
      .setCustomId(`selectCategoryMenu-${interaction.user.id}`);
    const ticketRow = new ActionRowBuilder().setComponents(categoryMenu);

    await channel
      .send({
        embeds: [ticketEmbed],
        components: [ticketRow],
      })
      .then((message) => {
        message.pin();

        // Seve in db
        const data = new ticketsCollection({
          guildId: interaction.guild.id,
          user: interaction.user.id,
          createdAt: Date.now(),
          channelId: channel.id,
          messageId: message.id,
          questions: [],
          canView: [interaction.user.id],
          type: "General",
          claimed: false,
          closed: false,
          staffMessageId: null,
        });
        data.save();
      });
    await channel
      .send(`${interaction.member}, <@&${settings.data.ticketRole}>`)
      .then((message) => message.delete());

    // Send staff buttons
    const staffEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Staff Buttons")
      .setDescription("These buttons can be pressed only by the staff.")
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    const claimButton = new ButtonBuilder()
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success)
      .setCustomId("claimTicketBtn");
    const closeButton = new ButtonBuilder()
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setCustomId("closeTicketBtn")
      .setEmoji("🔒");
    const staffRow = new ActionRowBuilder().setComponents(
      claimButton,
      closeButton
    );

    const staffMessage = await channel.send({
      embeds: [staffEmbed],
      components: [staffRow],
    });
    await ticketsCollection.updateOne(
      { channelId: channel.id },
      { staffMessageId: staffMessage.id }
    );

    // Send open message
    const userEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Ticket Opened")
      .setDescription(`You successfully opened a ticket, ${channel}.`)
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    await interaction.user.send({ embeds: [userEmbed] }).catch(() => {});
  },
};
