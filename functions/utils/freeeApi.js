const FREEE_API = {
  BASE_URL: "https://api.freee.co.jp/api/1",
  TOKEN_URL: "https://accounts.secure.freee.co.jp/public_api/token",
  KOSAIHI_ACCOUNT_IDS: [866747733],
  EXPENSE_THRESHOLD: 100000,
};

let accessToken = null;
let refreshToken = null;

async function fetchWithAuth(path, options = {}, credentials) {
  if (!accessToken) {
    await refreshAccessToken(credentials);
  }

  const url = new URL(path, FREEE_API.BASE_URL);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    await refreshAccessToken(credentials);
    return fetchWithAuth(path, options, credentials);
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function refreshAccessToken(credentials) {
  try {
    const formData = new URLSearchParams({
      grant_type: refreshToken ? "refresh_token" : "authorization_code", //追加
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      // refresh_token: credentials.refreshToken || refreshToken,
    });

    if (refreshToken) {
      //追加
      formData.append("refresh_token", refreshToken);
    } else {
      formData.append("code", credentials.authCode); // 初回認証用
      formData.append("redirect_uri", credentials.redirectUri);
    } //追加

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

    return accessToken;
  } catch (error) {
    throw new Error(`Failed to refresh access token: ${error.message}`);
  }
}

async function getExpenses(startDate, endDate, credentials) {
  try {
    const data = await fetchWithAuth(
      "/deals",
      {
        params: {
          company_id: credentials.companyId,
          type: "expense",
          limit: 100,
          start_date: startDate,
          end_date: endDate,
        },
      },
      credentials
    );

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
    const now = new Date();
    const startDate = lastCheckedDate.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const credentials = {
      clientId: process.env.FREEE_CLIENT_ID,
      clientSecret: process.env.FREEE_CLIENT_SECRET,
      refreshToken: process.env.FREEE_REFRESH_TOKEN,
      authCode: process.env.FREEE_AUTH_CODE, // 初回認証用 追加
      redirectUri: process.env.FREEE_REDIRECT_URI, // 初回認証用 追加
      companyId: process.env.COMPANY_ID,
    };

    const deals = await getExpenses(startDate, endDate, credentials);
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
