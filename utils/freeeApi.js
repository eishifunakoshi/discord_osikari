import axios from "axios";
import { getLastExecutionDate, saveLastExecutionDate } from "./dateUtils.js";
import { saveTokensToEnv } from "./envUtils.js";
import { sendDiscordNotification } from "./discordUtils.js";
import { KOSAIHI_ACCOUNT_IDS } from "../config/constants.js";

// アクセストークンをリフレッシュ
async function refreshAccessToken() {
  const url = "https://accounts.secure.freee.co.jp/public_api/token";
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.FREEE_CLIENT_ID,
    client_secret: process.env.FREEE_CLIENT_SECRET,
    refresh_token: process.env.FREEE_REFRESH_TOKEN,
  });

  console.log("FREEE_CLIENT_ID:", process.env.FREEE_CLIENT_ID);
  console.log("FREEE_CLIENT_SECRET:", process.env.FREEE_CLIENT_SECRET);
  console.log("FREEE_REFRESH_TOKEN:", process.env.FREEE_REFRESH_TOKEN);

  try {
    const response = await axios.post(url, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = response.data;

    console.log("アクセストークン更新レスポンス:", data);

    // 新しいトークンを環境変数と.envファイルに保存
    process.env.FREEE_ACCESS_TOKEN = data.access_token;
    process.env.FREEE_REFRESH_TOKEN = data.refresh_token;

    saveTokensToEnv(data.access_token, data.refresh_token);

    console.log("新しいアクセストークンを保存しました:", data.access_token);

    return data.access_token;
  } catch (error) {
    console.error(
      "アクセストークンの更新に失敗しました:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// freee APIでデータを取得する
async function getFreeeExpenses(startDate, endDate) {
  const url = "https://api.freee.co.jp/api/1/deals";
  const headers = {
    Authorization: `Bearer ${process.env.FREEE_ACCESS_TOKEN}`,
  };
  const params = {
    company_id: process.env.COMPANY_ID,
    type: "expense",
    limit: 100,
    start_date: startDate,
    end_date: endDate,
  };

  try {
    const response = await axios.get(url, { headers, params });
    return response.data.deals || [];
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("アクセストークンが期限切れです。更新を試みます...");
      await refreshAccessToken();

      // 更新後、再試行
      headers.Authorization = `Bearer ${process.env.FREEE_ACCESS_TOKEN}`;
      const retryResponse = await axios.get(url, { headers, params });
      return retryResponse.data.deals || [];
    } else {
      console.error(
        "Error fetching expenses:",
        error.response?.data || error.message
      );
      return [];
    }
  }
}

// 高額交際費をフィルタリング
function filterHighExpenses(deals) {
  return deals.flatMap((deal) =>
    deal.details
      .filter(
        (detail) =>
          KOSAIHI_ACCOUNT_IDS.includes(detail.account_item_id) &&
          detail.amount >= 100000
      )
      .map((detail) => ({
        amount: detail.amount,
        date: deal.issue_date,
        description: detail.description || "説明なし",
      }))
  );
}

// 定期実行と通知処理
export async function checkAndNotify(client) {
  const now = new Date();
  const lastExecutionDate = getLastExecutionDate();

  const startDate = lastExecutionDate;
  const endDate = now;

  const formattedStartDate = startDate.toISOString().split("T")[0];
  const formattedEndDate = endDate.toISOString().split("T")[0];

  const deals = await getFreeeExpenses(formattedStartDate, formattedEndDate);
  const highExpenses = filterHighExpenses(deals);

  if (highExpenses.length > 0) {
    await sendDiscordNotification(client, highExpenses);
  }

  saveLastExecutionDate(now);
}

export { refreshAccessToken };
