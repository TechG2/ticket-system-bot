const { EmbedBuilder, Colors, AttachmentBuilder } = require("discord.js");
const { model } = require("mongoose");
const TicketSchema = require("../../Schemas/TicketSchema");
const createTranscript = require("../../utils/createTranscript");

module.exports = {
  async execute(interaction, client) {
    if (!interaction.customId) return;

    if (
      interaction.customId !== "confirmCloseBtn" &&
      interaction.customId !== "confirmCancelBtn"
    )
      return;

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

    // Buttons
    if (interaction.customId === "confirmCloseBtn") {
      await ticketsCollection.updateOne(
        { _id: ticket._id },
        { closed: { at: Date.now(), by: interaction.user.id } }
      );

      // Send user
      const closeEmbed = new EmbedBuilder()
        .setColor(Colors.DarkRed)
        .setTitle("Ticket Closed")
        .setDescription("Your ticket has been closed.")
        .addFields(
          {
            name: "Closed At:",
            value: `<t:${parseInt(Date.now() / 1000)}:d> <t:${parseInt(
              Date.now() / 1000
            )}:t>`,
            inline: true,
          },
          {
            name: "Closed By:",
            value: `${interaction.member}`,
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      // Get transcript
      const transcript = await createTranscript(interaction.channel);
      const transcriptAttach = new AttachmentBuilder()
        .setName("transcript.txt")
        .setFile(transcript.buffer);

      // Send user
      const user = await client.users.fetch(ticket.user).catch(() => {});
      if (user) {
        await user.send({ embeds: [closeEmbed] }).catch(() => {});
        await user.send({ files: [transcriptAttach] }).catch(() => {});
      }

      // Delete channel
      await interaction.channel.delete();
    } else if (interaction.customId === "confirmCancelBtn") {
      // Delete message
      const cancelEmbed = new EmbedBuilder()
        .setColor(Colors.DarkRed)
        .setTitle("Request Cancelled")
        .setDescription("This close request has been cancelled.")
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.update({ embeds: [cancelEmbed], components: [] });
    }
  },
};
