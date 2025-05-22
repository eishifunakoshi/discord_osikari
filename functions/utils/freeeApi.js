import fetch from "node-fetch";
import {
  getStoredRefreshToken,
  saveRefreshToken,
  initializeRefreshToken,
} from "./firebase.js";

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

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    await refreshAccessToken();
    return fetchWithAuth(path, options);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Error response body:", errorBody);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseData = await response.json();
  console.log("Response JSON Data:", responseData);

  return responseData;
}

async function refreshAccessToken() {
  try {
    await initializeRefreshToken();
    const client_Id = process.env.FREEE_CLIENT_ID;
    const client_Secret = process.env.FREEE_CLIENT_SECRET;
    const refresh_Token = await getStoredRefreshToken();

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

    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    await saveRefreshToken(refreshToken);

    return accessToken;
  } catch (error) {
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}

async function getExpenses() {
  try {
    const companyId = process.env.FREEE_COMPANY_ID;
    const data = await fetchWithAuth("deals", {
      params: {
        company_id: companyId,
        type: "expense",
        limit: 100,
      },
    });
    return data.deals || [];
  } catch (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }
}

function filterHighExpenses(deals, startDate, endDate) {
  return deals.flatMap((deal) => {
    const issueDate = new Date(deal.issue_date);
    if (issueDate < new Date(startDate) || issueDate > new Date(endDate)) {
      return [];
    }

    const filteredDetails = deal.details.filter((detail) => {
      const isValidAccount = FREEE_API.KOSAIHI_ACCOUNT_IDS.includes(
        detail.account_item_id
      );
      const isAboveThreshold = detail.amount >= FREEE_API.EXPENSE_THRESHOLD;

      return isValidAccount && isAboveThreshold;
    });

    return filteredDetails.map((detail) => ({
      amount: detail.amount,
      date: deal.issue_date,
      description: detail.description || "説明なし",
    }));
  });
}

export async function getHighExpenses(lastCheckedDate) {
  try {
    const year = lastCheckedDate.getFullYear();
    const month = lastCheckedDate.getMonth();

    const startDateObj = new Date(year, month - 1, 1); // 前月1日
    const endDateObj = new Date(year, month, 0); // 前月末日

    const startDate = startDateObj.toISOString().split("T")[0];
    const endDate = endDateObj.toISOString().split("T")[0];

    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    const deals = await getExpenses();

    console.log("Deals:", deals);

    const highExpenses = filterHighExpenses(deals, startDate, endDate);

    console.log("High Expenses:", highExpenses);

    return {
      expenses: highExpenses,
      endDate: endDate,
      startDate: startDate,
    };
  } catch (error) {
    console.error("Failed to fetch high expenses:", error);
    throw error;
  }
}
