import { getHighExpenses } from "./utils/freeeApi.js";
import { notification } from "./utils/notification.js";

export const weeklyMessage = functions.pubsub
  .schedule("every 7 days")
  .onRun(async (context) => {
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
