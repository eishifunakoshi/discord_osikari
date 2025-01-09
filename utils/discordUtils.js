export async function sendDiscordNotification(client, expenses) {
  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  if (!channel) {
    console.error("Discordチャンネルが見つかりません");
    return;
  }

  for (const expense of expenses) {
    const message = `📢 **高額交際費の通知**\n- 金額: ¥${expense.amount}\n- 日付: ${expense.date}`;
    await channel.send(message);
  }
}
