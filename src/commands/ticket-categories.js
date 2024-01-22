const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { model } = require("mongoose");
const SettingSchema = require("../Schemas/SettingSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-categories")
    .setDescription("All commands concerning ticket categories.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("This commands creates a new category")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name will be displayed to the player.")
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category in which the ticket will be stored.")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setMaxLength(25)
            .setDescription("A small description of the category.")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("first_question")
            .setMaxLength(25)
            .setDescription("The first question.")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("second_question")
            .setMaxLength(25)
            .setDescription("The second question.")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("third_question")
            .setMaxLength(25)
            .setDescription("The third question.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("This commands deletes a category")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the category to be delete.")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      // Get options
      const name = interaction.options.getString("name");
      const category = interaction.options.getChannel("category");
      const description =
        interaction.options.getString("description") || "A category...";

      // Get questions
      const questions = [];

      if (interaction.options.getString("first_question"))
        questions.push(interaction.options.getString("first_question"));
      if (interaction.options.getString("second_question"))
        questions.push(interaction.options.getString("second_question"));
      if (interaction.options.getString("third_question"))
        questions.push(interaction.options.getString("third_question"));

      // Check category
      const settingsCollection = new model("settings", SettingSchema);
      const checkCategory = await settingsCollection.findOne({
        guildId: interaction.guild.id,
        "data.ticketCategories": {
          $elemMatch: { $or: [{ name }, { category: category.id }] },
        },
      });
      if (checkCategory)
        return interaction.reply({
          ephemeral: true,
          content:
            "There's already a category with that name/you've already used this category, please choose another.",
        });

      // Create category
      await settingsCollection.updateOne(
        { guildId: interaction.guild.id },
        {
          $push: {
            "data.ticketCategories": {
              name,
              category: category.id,
              description,
              questions,
            },
          },
        },
        { upsert: true }
      );

      // Output
      await interaction.reply({
        ephemeral: true,
        content: "Sucessufully created a new ticket category.",
      });
    } else if (subcommand === "delete") {
      // Get options
      const name = interaction.options.getString("name");

      // Check category
      const settingsCollection = new model("settings", SettingSchema);
      const checkCategory = await settingsCollection.findOne({
        guildId: interaction.guild.id,
        "data.ticketCategories": { $elemMatch: { name } },
      });
      if (!checkCategory)
        return interaction.reply({
          ephemeral: true,
          content: "There's no category with that name.",
        });

      if (
        checkCategory.data.ticketCategories &&
        checkCategory.data.ticketCategories.length === 1
      )
        return interaction.reply({
          ephemeral: true,
          content: "There must be at least one category.",
        });

      // Delete category
      await settingsCollection.updateOne(
        { guildId: interaction.guild.id },
        { $pull: { "data.ticketCategories": { name } } },
        { upsert: true }
      );

      // Output
      await interaction.reply({
        ephemeral: true,
        content: "Sucessufully deleted a ticket category.",
      });
    }
  },
};
