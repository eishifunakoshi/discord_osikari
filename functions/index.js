import { getHighExpenses } from "./utils/freeeApi.js";
import { notification } from "./utils/notification.js";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const weeklyMessage = onSchedule("every 7 days", async () => {
  const expenses = await getHighExpenses(new Date());

  if (expenses.length === 0) {
    await notification("やるやん、その調子で励むが良い");
    return null;
  } else {
    for (const expense of expenses) {
      const message = `📢 **高額交際費の通知**\n- 金額: ¥${expense.amount}\n- 日付: ${expense.date}`;
      await notification(message);
    }
  }

  return null;
});
