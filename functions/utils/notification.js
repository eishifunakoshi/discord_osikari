import * as functions from "firebase-functions";

export const notification = async (message) => {
  const config = functions.config();
  const WEBHOOK_URL = config.webhook.url;

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
    }),
  });
};
