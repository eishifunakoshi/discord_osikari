import fetch from "node-fetch";

const FREEE_API = {
  BASE_URL: "https://api.freee.co.jp/api/1/",
  TOKEN_URL: "https://accounts.secure.freee.co.jp/public_api/token",
  KOSAIHI_ACCOUNT_IDS: [866747733],
  EXPENSE_THRESHOLD: 100000,
};

let accessToken = null;
let refreshToken = null;

async function fetchWithAuth(path, options = {}) {
  if (!accessToken) {
    await refreshAccessToken();
  }

  const url = new URL(path, FREEE_API.BASE_URL);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const requestUrl = url.toString();
  console.log("Request URL:", requestUrl); // ここでURLを確認
  console.log("Request Headers:", {
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  });

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // await refreshAccessToken();
    accessToken = await refreshAccessToken();
    return fetchWithAuth(path, options);
  }

  if (!response.ok) {
    const errorBody = await response.text(); // エラー時のレスポンスを確認
    console.error("Error response body:", errorBody);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // レスポンスのJSONをログに表示
  const responseData = await response.json();
  console.log("Response JSON Data:", responseData);

  return responseData;
  // return response.json();
}

async function refreshAccessToken() {
  try {
    const client_Id = process.env.FREEE_CLIENT_ID;
    const client_Secret = process.env.FREEE_CLIENT_SECRET;
    const refresh_Token = process.env.FREEE_REFRESH_TOKEN;

    const formData = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: client_Id,
      client_secret: client_Secret,
      refresh_token: refresh_Token,
    });

    const response = await fetch(FREEE_API.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Access token response:", data);

    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    return accessToken;
  } catch (error) {
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}

async function getExpenses(startDate, endDate) {
  try {
    const companyId = process.env.FREEE_COMPANY_ID;
    const data = await fetchWithAuth("deals", {
      params: {
        company_id: companyId,
        type: "expense",
        limit: 100,
        start_date: startDate,
        end_date: endDate,
      },
    });

    return data.deals || [];
  } catch (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }
}

function filterHighExpenses(deals) {
  return deals.flatMap((deal) =>
    deal.details
      .filter(
        (detail) =>
          FREEE_API.KOSAIHI_ACCOUNT_IDS.includes(detail.account_item_id) &&
          detail.amount >= FREEE_API.EXPENSE_THRESHOLD
      )
      .map((detail) => ({
        amount: detail.amount,
        date: deal.issue_date,
        description: detail.description || "説明なし",
      }))
  );
}

export async function getHighExpenses(lastCheckedDate) {
  try {
    const endDate = lastCheckedDate.toISOString().split("T")[0];

    const startDateObj = new Date(lastCheckedDate);
    startDateObj.setDate(startDateObj.getDate() - 7); // 1週間前
    const startDate = startDateObj.toISOString().split("T")[0];

    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    const deals = await getExpenses(startDate, endDate);
    const highExpenses = filterHighExpenses(deals);

    return {
      expenses: highExpenses,
      lastCheckedDate: now,
    };
  } catch (error) {
    console.error("Failed to fetch high expenses:", error);
    throw error;
  }
}
