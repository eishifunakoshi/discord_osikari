const { getHighExpenses } = require('./utils/freeeApi')
const { notification } = require('./utils/notification')

exports.weeklyMessage = functions.pubsub
  .schedule('every 7 days')
  .onRun(async (context) => {
    const expenses = await getHighExpenses(new Date())

    if (expenses.length === 0) {
      await notification('叱りません。褒めます')
      return null
    } else {
      for (const expense of expenses) {
        const message = `📢 **高額交際費の通知**\n- 金額: ¥${expense.amount}\n- 日付: ${expense.date}`
        await notification(message)
      }
    }

    return null
  })
