import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function saveTokensToEnv(accessToken, refreshToken) {
  const envPath = path.resolve(__dirname, "../.env");
  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const newEnvContent = envContent
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("FREEE_ACCESS_TOKEN=") &&
        !line.startsWith("FREEE_REFRESH_TOKEN=")
    )
    .concat([
      `FREEE_ACCESS_TOKEN=${accessToken}`,
      `FREEE_REFRESH_TOKEN=${refreshToken}`,
    ])
    .join("\n");

  fs.writeFileSync(envPath, newEnvContent, "utf8");
  console.log(".envファイルを更新しました");
}
