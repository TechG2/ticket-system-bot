const { Schema } = require("mongoose");

const TicketSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  user: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Number,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  messageId: {
    type: String,
    required: true,
  },
  questions: {
    type: Array,
    required: true,
  },
  canView: {
    type: Array,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  claimed: {
    type: Schema.Types.Mixed,
    required: false,
  },
  closed: {
    type: Schema.Types.Mixed,
    required: false,
  },
  staffMessageId: {
    type: Schema.Types.Mixed,
    required: false,
  },
});

module.exports = TicketSchema;
