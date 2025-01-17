import fetch from "node-fetch";

export const notification = async (message) => {
  const webhookUrl = process.env.WEBHOOK_URL;

  await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
    }),
  });
};
