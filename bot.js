// const fs = require("fs");
// const { Client, GatewayIntentBits } = require("discord.js");
// const axios = require("axios");
// const dotenv = require("dotenv");
// const path = require("path");
// dotenv.config();

// const DATE_FILE = "last_execution_date.txt"; //実行日保存ファイル

// // Discordクライアントの作成
// const client = new Client({
//   intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
// });

// // 最後の実行日を取得
// function getLastExecutionDate() {
//   if (fs.existsSync(DATE_FILE)) {
//     const lastDate = fs.readFileSync(DATE_FILE, "utf8");
//     return new Date(lastDate);
//   }
//   // ファイルが存在しない場合は、1週間前の日付を返す
//   return new Date(new Date().setDate(new Date().getDate() - 7));
// }

// // 最後の実行日を保存
// function saveLastExecutionDate(date) {
//   fs.writeFileSync(DATE_FILE, date.toISOString());
// }

// //　リフレッシュトークンでアクセストークンを更新
// async function refreshAccessToken() {
//   const url = "https://accounts.secure.freee.co.jp/public_api/token";
//   const params = new URLSearchParams({
//     grant_type: "refresh_token",
//     client_id: process.env.FREEE_CLIENT_ID, // freeeのクライアントID
//     client_secret: process.env.FREEE_CLIENT_SECRET, // freeeのクライアントシークレット
//     refresh_token: process.env.FREEE_REFRESH_TOKEN, // 現在のリフレッシュトークン
//   });

//   try {
//     const response = await axios.post(url, params, {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });

//     const data = response.data;
//     console.log("アクセストークン更新レスポンス:", response.data);

//     // アクセストークンとリフレッシュトークンを更新
//     process.env.FREEE_ACCESS_TOKEN = data.access_token;
//     process.env.FREEE_REFRESH_TOKEN = data.refresh_token;

//     console.log("新しいアクセストークンを取得しました:", data.access_token);

//     // 更新されたトークンを.envファイルに保存
//     saveTokensToEnv(data.access_token, data.refresh_token);

//     return data.access_token;
//   } catch (error) {
//     console.error(
//       "アクセストークンの更新に失敗しました:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// }

// // .envファイルを更新する関数
// function saveTokensToEnv(accessToken, refreshToken) {
//   const envPath = path.resolve(__dirname, ".env"); // .envファイルのパス
//   let envContent = "";

//   // .envファイルが存在する場合は内容を読み込む
//   if (fs.existsSync(envPath)) {
//     envContent = fs.readFileSync(envPath, "utf8");
//   }

//   // FREEE_ACCESS_TOKENとFREEE_REFRESH_TOKENを更新または追加
//   const newEnvContent = envContent
//     .split("\n")
//     .filter(
//       (line) =>
//         !line.startsWith("FREEE_ACCESS_TOKEN=") &&
//         !line.startsWith("FREEE_REFRESH_TOKEN=")
//     )
//     .concat([
//       `FREEE_ACCESS_TOKEN=${accessToken}`,
//       `FREEE_REFRESH_TOKEN=${refreshToken}`,
//     ])
//     .join("\n");

//   // 新しい内容を.envファイルに書き込む
//   fs.writeFileSync(envPath, newEnvContent, "utf8");
//   console.log(".envファイルを更新しました");
// }

// // freee APIでデータを取得する関数
// async function getFreeeExpenses(startDate, endDate) {
//   const url = "https://api.freee.co.jp/api/1/deals";
//   const headers = {
//     Authorization: `Bearer ${process.env.FREEE_ACCESS_TOKEN}`,
//   };
//   const params = {
//     company_id: process.env.COMPANY_ID,
//     type: "expense",
//     limit: 100,
//     start_date: startDate,
//     end_date: endDate,
//   };

//   try {
//     const response = await axios.get(url, { headers, params });
//     return response.data.deals || [];
//   } catch (error) {
//     if (error.response?.status === 401) {
//       // トークン期限切れの場合、自動でリフレッシュトークンを使用して更新
//       console.log("アクセストークンが期限切れです。更新を試みます...");
//       await refreshAccessToken();

//       // 更新後、再試行
//       headers.Authorization = `Bearer ${process.env.FREEE_ACCESS_TOKEN}`;
//       const retryResponse = await axios.get(url, { headers, params });
//       return retryResponse.data.deals || [];
//     } else {
//       console.error(
//         "Error fetching expenses:",
//         error.response?.data || error.message
//       );
//       return [];
//     }
//   }
// }

// // 10万円以上の交際費をフィルタリング
// function filterHighExpenses(deals) {
//   const KOSAIHI_ACCOUNT_IDS = [866747733]; // 交際費のID
//   return deals.flatMap((deal) =>
//     deal.details
//       .filter(
//         (detail) =>
//           KOSAIHI_ACCOUNT_IDS.includes(detail.account_item_id) &&
//           detail.amount >= 100000
//       )
//       .map((detail) => ({
//         amount: detail.amount,
//         date: deal.issue_date,
//         description: detail.description || "説明なし",
//       }))
//   );
// }

// // Discordに通知を送信
// async function sendDiscordNotification(expenses) {
//   const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
//   if (!channel) {
//     console.error("Discordチャンネルが見つかりません");
//     return;
//   }

//   for (const expense of expenses) {
//     const message = `📢 **高額交際費の通知**\n- 金額: ¥${expense.amount}\n- 日付: ${expense.date}\n- 内容: ${expense.description}`;
//     await channel.send(message);
//   }
// }

// // Botの定期実行
// async function checkAndNotify() {
//   const now = new Date(); // 現在の日付と時刻
//   let lastExecutionDate = getLastExecutionDate();

//   let startDate, endDate;

//   if (!lastExecutionDate) {
//     endDate = now;
//     startDate = new Date(now);
//     startDate.setDate(now.getDate() - 7);
//     console.log(
//       `初回実行: デフォルト期間を設定 (${startDate.toISOString()} から ${endDate.toISOString()})`
//     );
//   } else {
//     startDate = lastExecutionDate;
//     endDate = now;
//     console.log(
//       `通常実行: 最後の実行日 (${startDate.toISOString()}) から 現在 (${endDate.toISOString()})`
//     );
//   }

//   const formattedStartDate = startDate.toISOString().split("T")[0];
//   const formattedEndDate = endDate.toISOString().split("T")[0];

//   const deals = await getFreeeExpenses(formattedStartDate, formattedEndDate);
//   const highExpenses = filterHighExpenses(deals);

//   if (highExpenses.length > 0) {
//     // データが新規の場合のみ通知を送信
//     const alreadyNotified = fs.existsSync("notified.json")
//       ? JSON.parse(fs.readFileSync("notified.json", "utf8"))
//       : [];

//     const newExpenses = highExpenses.filter(
//       (expense) => !alreadyNotified.includes(expense.date + expense.amount)
//     );

//     if (newExpenses.length > 0) {
//       await sendDiscordNotification(newExpenses);

//       // 通知済みリストを更新
//       const updatedNotified = [
//         ...alreadyNotified,
//         ...newExpenses.map((expense) => expense.date + expense.amount),
//       ];
//       fs.writeFileSync("notified.json", JSON.stringify(updatedNotified));
//     }
//   } else {
//     console.log("該当するデータはありません");
//   }

//   // 実行日を記録
//   saveLastExecutionDate(now);
// }

// // Bot起動時の処理
// client.once("ready", () => {
//   console.log(`Logged in as ${client.user.tag}`);
//   checkAndNotify();

//   // 1週間ごとに実行
//   setInterval(checkAndNotify, 7 * 24 * 60 * 60 * 1000); // 1週間
// });

// // Botをログイン
// client.login(process.env.DISCORD_TOKEN);

import { Client, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
import { checkAndNotify } from "./utils/freeeApi.js";
config();

// Discordクライアントの作成
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Bot起動時の処理
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  checkAndNotify(client);

  // 1週間ごとに実行
  setInterval(() => checkAndNotify(client), 7 * 24 * 60 * 60 * 1000); // 1週間
});

// Botをログイン
client.login(process.env.DISCORD_TOKEN);
