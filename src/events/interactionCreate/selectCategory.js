const { model } = require("mongoose");
const SettingSchema = require("../../Schemas/SettingSchema");
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  PermissionsBitField,
} = require("discord.js");
const TicketSchema = require("../../Schemas/TicketSchema");

module.exports = {
  async execute(interaction) {
    if (
      !interaction.customId ||
      !interaction.customId.startsWith("selectCategoryMenu-")
    )
      return;
    if (
      interaction.user.id !==
      interaction.customId.replace("selectCategoryMenu-", "")
    )
      return interaction.reply({
        ephemeral: true,
        content: "This isn't interaction isn't mean to you.",
      });

    // Get ticket
    const ticketsCollection = new model("tickets", TicketSchema);
    const ticket = await ticketsCollection.findOne({
      guildId: interaction.guild.id,
      user: interaction.user.id,
      closed: false,
    });

    // Get category from db
    const categoryId = interaction.values[0];

    const settingsCollection = new model("settings", SettingSchema);
    const settings = await settingsCollection.findOne({
      guildId: interaction.guild.id,
    });
    if (!settings)
      return interaction.reply({
        ephemeral: true,
        content: "There's been an error.",
      });

    const categoryInfo = settings.data.ticketCategories.find(
      (ticketCategory) => ticketCategory.category === categoryId
    );
    if (!categoryInfo)
      return interaction.reply({
        ephemeral: true,
        content: "There's been an error.",
      });

    const category = await interaction.guild.channels
      .fetch(categoryInfo.category)
      .catch(() => {});
    if (!category)
      return interaction.reply({
        ephemeral: true,
        content: "There's been an error.",
      });

    // Ask questions
    if (categoryInfo.questions[0]) {
      const questionsModal = new ModalBuilder()
        .setTitle("Questions")
        .setCustomId(`categoryQuestions-Modal-${categoryInfo.name}`);

      categoryInfo.questions.forEach((question) => {
        const questionInput = new TextInputBuilder()
          .setLabel(question)
          .setPlaceholder("Answer...")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setCustomId(
            `question-${categoryInfo.questions.indexOf(question) + 1}`
          );
        const questionRow = new ActionRowBuilder().setComponents(questionInput);

        questionsModal.addComponents(questionRow);
      });

      interaction.showModal(questionsModal);
    } else {
      const ticketEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("Ticket Opened")
        .setDescription(
          `Wait for a staff response.\n\n__**Ticket Info:**__\n> Category: \`${
            categoryInfo.name
          }\`\n> Created At: <t:${parseInt(
            ticket.createdAt / 1000
          )}:d> <t:${parseInt(ticket.createdAt / 1000)}:t>\n> Claimed: ${
            ticket.claimed ? `<@${ticket.claimed.by}>` : "`No`"
          }\n\n__**Questions:**__\n\`\`\`No questions.\`\`\``
        )
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });
      await interaction.channel.setParent(category.id);

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

      // Modify db
      const ticketsCollection = new model("tickets", TicketSchema);
      await ticketsCollection.updateOne(
        {
          user: interaction.user.id,
          guildId: interaction.guild.id,
          closed: false,
        },
        { $set: { type: categoryInfo.name } }
      );

      await interaction.update({ embeds: [ticketEmbed], components: [] });
    }
  },
};
