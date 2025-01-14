export const notification = async (message) => {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

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
