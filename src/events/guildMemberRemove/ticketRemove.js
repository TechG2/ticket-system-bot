const {
  EmbedBuilder,
  Colors,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { model } = require("mongoose");
const TicketSchema = require("../../Schemas/TicketSchema");

module.exports = {
  async execute(member, client) {
    // Get ticket
    const ticketsCollection = new model("tickets", TicketSchema);
    const ticket = await ticketsCollection.findOne({
      guildId: member.guild.id,
      user: member.user.id,
      closed: false,
    });
    if (!ticket) return;

    // Get channel
    const channel = await member.guild.channels.fetch(ticket.channelId);
    const user = await client.users.fetch(ticket.user);

    // Output
    const quitEmbed = new EmbedBuilder()
      .setColor(Colors.DarkRed)
      .setTitle(`${user.username} Quitted`)
      .setDescription(`${user} quitted the server, you can close the ticket.`)
      .setTimestamp()
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

    const closeBtn = new ButtonBuilder()
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
      .setCustomId("confirmCloseBtn");
    const quitRow = new ActionRowBuilder().setComponents(closeBtn);

    await channel.send({ embeds: [quitEmbed], components: [quitRow] });
  },
};
