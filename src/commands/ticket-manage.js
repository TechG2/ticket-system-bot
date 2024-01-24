const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  Colors,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../Schemas/SettingSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-manage")
    .setDescription("This command modify the ticket system.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("This command sets the ticket role.")
        .addRoleOption((option) =>
          option
            .setName("ticket-role")
            .setDescription("The role to be setted.")
            .setRequired(false)
        )
        .addChannelOption((option) =>
          option
            .setName("general-category")
            .setDescription("The category where the tickets will be opened.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send")
        .setDescription("This command sends a message to open a ticket.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel where the embed will be sent.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      // Get options
      const role = interaction.options.getRole("ticket-role");
      const generalCategory =
        interaction.options.getChannel("general-category");

      // Save in db
      const settingsCollection = new model("settings", SettingSchema);
      if (role)
        await settingsCollection.updateOne(
          { guildId: interaction.guild.id },
          { guildId: interaction.guild.id, "data.ticketRole": role.id },
          { upsert: true }
        );
      if (generalCategory)
        await settingsCollection.updateOne(
          { guildId: interaction.guild.id },
          {
            guildId: interaction.guild.id,
            "data.generalCategory": generalCategory.id,
          },
          { upsert: true }
        );

      // Output
      await interaction.reply({
        ephemeral: true,
        content: `**Options setted/modified:**\n${
          role ? `> Ticket Role: \`${role.name}\`` : ""
        }`,
      });
    } else if (subcommand === "send") {
      // Get options
      const channel =
        interaction.options.getChannel("channel") || interaction.channel;

      // Errors
      const settingsCollection = new model("settings", SettingSchema);
      const checkCategory = await settingsCollection.findOne({
        guildId: interaction.guild.id,
      });
      if (
        !checkCategory ||
        (checkCategory && !checkCategory.data.ticketCategories) ||
        (checkCategory &&
          checkCategory.data.ticketCategories &&
          !checkCategory.data.ticketCategories[0])
      )
        return interaction.reply({
          ephemeral: true,
          content: "Before sending this embed create at least one category.",
        });

      if (!checkCategory.data.ticketRole)
        return interaction.reply({
          ephemeral: true,
          content: "You must define a ticket role for the staff.",
        });

      // Create a general category
      if (!checkCategory.data.generalTicketCategory) {
        const generalCategory = await interaction.guild.channels.create({
          name: "General Tickets",
          type: ChannelType.GuildCategory,
        });

        await settingsCollection.updateOne(
          { guildId: interaction.guild.id },
          { "data.generalTicketCategory": generalCategory.id }
        );
      }

      // Output
      const ticketEmbed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle("Open a Ticket")
        .setDescription("Click the button below to open a ticket.")
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });
      const openButton = new ButtonBuilder()
        .setLabel("Open a Ticket")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("ticketOpen-btn");
      const ticketRow = new ActionRowBuilder().setComponents(openButton);

      await channel.send({ embeds: [ticketEmbed], components: [ticketRow] });
      await interaction.reply({
        ephemeral: true,
        content: `Sent an embed in this channel: ${channel}.`,
      });
    }
  },
};
