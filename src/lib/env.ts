import "server-only";

/**
 * 環境変数の唯一の入口（`.env.example` がひな形）。
 *
 * **import 時ではなく getter 呼び出し時に throw する。** import 時に検証すると、
 * その変数を使わないページのビルドまで巻き添えで落ちる（3タブのうち Notion を使うのは
 * ミッションタブだけなので、これは実害になる）。
 *
 * `NEXT_PUBLIC_` を付けないこと。付けるとクライアントバンドルに焼き込まれ、
 * トークンが公開される。`server-only` を import しているのはその事故を型で防ぐため。
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `環境変数 ${name} が未設定です。.env.example を .env.local にコピーして値を入れてください。`,
    );
  }
  return value.trim();
}

/** Notion Integration Token。Quests DB への読み書きに使う。 */
export const notionApiKey = () => required("NOTION_API_KEY");

/** status-board Quests DB（デイリー / ボス / 測定期間）。 */
export const questsDbId = () => required("NOTION_QUESTS_DB_ID");

/**
 * work-dashboard タスクDB。**読み取り専用**（10_notion_schema.md §6）。
 * 日次ジョブ側でのみ使う。Vercel には置かない。
 */
export const tasksDbId = () => required("NOTION_TASKS_DB_ID");

/** 書き込み API を守る Basic 認証。status-board 自身の鍵（work-dashboard とは別物）。 */
export const basicAuthUser = () => required("BASIC_AUTH_USER");
export const basicAuthPassword = () => required("BASIC_AUTH_PASSWORD");
