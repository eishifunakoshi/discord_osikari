import { getHighExpenses } from "./utils/freeeApi.js";
import { notification } from "./utils/notification.js";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const weeklyMessage = onSchedule(
  {
    schedule: "0 9 15 * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async () => {
    const { expenses, startDate, endDate } = await getHighExpenses(new Date());
    const periodMessage = `🗓️取引取得期間: ${startDate} ～ ${endDate}`;

    if (expenses.length === 0) {
      await notification(
        `${periodMessage}\n 高額交際費使っていないとは... \n やるじゃん、その調子で励むが良い( ´∀｀)`
      );
      return null;
    } else {
      for (const expense of expenses) {
        const message = `${periodMessage}\n  **高額交際費の通知**\n- 金額: ¥${expense.amount}\n- 日付: ${expense.date}`;
        await notification(message);
      }
    }

    return null;
  }
);
