const { EmbedBuilder, Colors } = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../../Schemas/SettingSchema");
const TicketSchema = require("../../Schemas/TicketSchema");

module.exports = {
  async execute(interaction) {
    if (
      !interaction.customId ||
      !interaction.customId.startsWith("categoryQuestions-Modal-")
    )
      return;

    // Get category info
    const categoryName = interaction.customId.replace(
      "categoryQuestions-Modal-",
      ""
    );

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
      (ticketCategory) => ticketCategory.name === categoryName
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

    // Get fields
    let firstAnswer;
    let secondAnswer;
    let thirdAnswer;
    for (let i = 0; i < categoryInfo.questions.length; i++) {
      if (i === 0)
        firstAnswer = {
          question: categoryInfo.questions[i],
          answer: interaction.fields.getTextInputValue("question-1"),
        };
      if (i === 1)
        secondAnswer = {
          question: categoryInfo.questions[i],
          answer: interaction.fields.getTextInputValue("question-2"),
        };
      if (i === 2)
        thirdAnswer = {
          question: categoryInfo.questions[i],
          answer: interaction.fields.getTextInputValue("question-3"),
        };
    }

    // Get ticket
    const ticketsCollection = new model("tickets", TicketSchema);
    const ticket = await ticketsCollection.findOne({
      guildId: interaction.guild.id,
      user: interaction.user.id,
      closed: false,
    });

    // Update DB
    if (firstAnswer)
      await ticketsCollection.updateOne(
        { _id: ticket._id },
        { $push: { questions: firstAnswer } }
      );
    if (secondAnswer)
      await ticketsCollection.updateOne(
        { _id: ticket._id },
        { $push: { questions: secondAnswer } }
      );
    if (thirdAnswer)
      await ticketsCollection.updateOne(
        { _id: ticket._id },
        { $push: { questions: thirdAnswer } }
      );

    // Output
    const ticketEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("Ticket Opened")
      .setDescription(
        `  Wait for a staff response.\n\n__**Ticket Info:**__\n> Category: \`${
          categoryInfo.name
        }\`\n> Created At: <t:${parseInt(
          ticket.createdAt / 1000
        )}:d> <t:${parseInt(ticket.createdAt / 1000)}:t>\n> Claimed: ${
          ticket.claimed ? `<@${ticket.claimed.by}>` : "`No`"
        }\n\n__**Questions:**__\n${
          firstAnswer
            ? `> ${firstAnswer.question}\n\`\`\`${firstAnswer.answer}\`\`\`\n`
            : ""
        }${
          secondAnswer
            ? `> ${secondAnswer.question}\n\`\`\`${secondAnswer.answer}\`\`\`\n`
            : ""
        }${
          thirdAnswer
            ? `> ${thirdAnswer.question}\n\`\`\`${thirdAnswer.answer}\`\`\`\n`
            : ""
        }`
      )
      .setTimestamp()
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      });

    await interaction.update({ embeds: [ticketEmbed], components: [] });
    await interaction.channel.setParent(category.id);
  },
};
