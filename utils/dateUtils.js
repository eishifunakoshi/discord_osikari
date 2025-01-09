import fs from "fs";

const DATE_FILE = "last_execution_date.txt";

// 最後の実行日を取得
export function getLastExecutionDate() {
  if (fs.existsSync(DATE_FILE)) {
    const lastDate = fs.readFileSync(DATE_FILE, "utf8");
    return new Date(lastDate);
  }
  // ファイルが存在しない場合は、1週間前の日付を返す
  return new Date(new Date().setDate(new Date().getDate() - 7));
}

// 最後の実行日を保存
export function saveLastExecutionDate(date) {
  fs.writeFileSync(DATE_FILE, date.toISOString());
}
