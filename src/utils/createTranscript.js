const getMessages = async (channel, limit = 10) => {
  let messages = await channel.messages.fetch({ limit });
  messages = messages.filter((m) => m.content !== "");

  return messages;
};

module.exports = async (channel) => {
  const messages = await getMessages(channel, 100);

  const transcript = `<Start Transcript>\n\n${messages
    .map(
      (m) =>
        `[${new Date(m.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })}] ${m.author.username}: ${m.content}${
          m.attachments.map((attach) => attach)[0]
            ? `\n    Files:\n${m.attachments
                .map((attach) => `      ${attach.name}: ${attach.url}`)
                .join("\n")}\n`
            : ""
        }`
    )
    .reverse()
    .join("\n")}\n\n<End Transcript>`;

  return { buffer: Buffer.from(transcript, "utf-8"), text: transcript };
};
