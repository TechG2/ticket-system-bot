const {
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  Colors,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const { model } = require("mongoose");
const TicketSchema = require("../../Schemas/TicketSchema");
const SettingSchema = require("../../Schemas/SettingSchema");

module.exports = {
  async execute(interaction, client) {
    if (
      interaction.customId !== "claimTicketBtn" &&
      interaction.customId !== "moveTicketBtn" &&
      interaction.customId !== "closeTicketBtn"
    )
      return;

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

    // Buttons
    if (interaction.customId === "claimTicketBtn") {
      // Get ticket
      const ticketsCollection = new model("tickets", TicketSchema);
      const ticket = await ticketsCollection.findOne({
        channelId: interaction.channel.id,
      });
      if (!ticket)
        return interaction.reply({
          ephemeral: true,
          content: "There's been an error.",
        });

      // Check claim + update db
      const claimButton = new ButtonBuilder()
        .setLabel("Claim")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
        .setCustomId("claimTicketBtn");
      const moveButton = new ButtonBuilder()
        .setLabel("Move")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("moveTicketBtn");
      const closeButton = new ButtonBuilder()
        .setLabel("Close")
        .setStyle(ButtonStyle.Danger)
        .setCustomId("closeTicketBtn")
        .setEmoji("🔒");
      const staffRow = new ActionRowBuilder().setComponents(
        claimButton,
        moveButton,
        closeButton
      );
      await interaction.message.edit({ components: [staffRow] });

      if (ticket.claimed)
        return interaction.reply({
          ephemeral: true,
          content: "Ticket already claimed.",
        });

      // Finish interaction
      await interaction.deferUpdate();

      // Update first message
      const ticketEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("Ticket Opened")
        .setDescription(
          `  Wait for a staff response.\n\n__**Ticket Info:**__\n> Category: \`${
            ticket.type
          }\`\n> Created At: <t:${parseInt(
            ticket.createdAt / 1000
          )}:d> <t:${parseInt(ticket.createdAt / 1000)}:t>\n> Claimed: ${
            interaction.member
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

      const ticketMessage = await interaction.channel.messages.fetch(
        ticket.messageId
      );
      await ticketMessage.edit({ embeds: [ticketEmbed] });

      // Send claimed message
      const claimEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("Claimed")
        .setDescription(`Ticket successfully claimed by ${interaction.member}`)
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      const user = await client.users.fetch(ticket.user);
      await user.send({ embeds: [claimEmbed] }).catch(() => {});
      await interaction.channel
        .send({ embeds: [claimEmbed] })
        .then(async (message) => {
          await ticketsCollection.updateOne(
            { _id: ticket._id },
            {
              $set: {
                claimed: {
                  by: interaction.user.id,
                  at: Date.now(),
                },
              },
            }
          );
          message.pin();
        });
    } else if (interaction.customId === "closeTicketBtn") {
      // Get ticket
      const ticketsCollection = new model("tickets", TicketSchema);
      const ticket = await ticketsCollection.findOne({
        channelId: interaction.channel.id,
      });
      if (!ticket)
        return interaction.reply({
          ephemeral: true,
          content: "There's been an error.",
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
    }
  },
};
