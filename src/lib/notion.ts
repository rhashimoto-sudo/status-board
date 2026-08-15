import "server-only";

import { notionApiKey, questsDbId } from "./env";
import { DISPLAY_TIME_ZONE } from "./constants";
import { dateKeyInTimeZone, weekdayIndexInTimeZone } from "./datetime";
import type { DailyQuest, MainStatusKey } from "./types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/**
 * Notion API の最小クライアント（10_notion_schema.md §4）。
 *
 * `@notionhq/client` は入れない。使うのは2エンドポイントだけで、
 * SDK を足すと Vercel の関数サイズと依存が増えるわりに得るものが無いため。
 */
async function notionFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${notionApiKey()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...init.headers,
    },
    // Notion の応答は常に最新を取る（デイリーのチェック状態はキャッシュしてはいけない）。
    cache: "no-store",
  });

  const body = (await response.json()) as { code?: string; message?: string };
  if (!response.ok) {
    // トークンやDB ID をエラーに混ぜない（ログに残ると漏れる）。
    throw new Error(`Notion API ${response.status} ${body.code ?? ""}: ${body.message ?? ""}`);
  }
  return body;
}

// ── Notion のプロパティ値を素の値に落とす小さなヘルパ ───────────────
type NotionPage = { id: string; properties: Record<string, NotionProp> };
type NotionProp = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  select?: { name: string } | null;
  checkbox?: boolean;
  date?: { start: string } | null;
  number?: number | null;
};

const plainText = (prop: NotionProp | undefined): string =>
  (prop?.title ?? prop?.rich_text ?? []).map((t) => t.plain_text).join("");
const selectName = (prop: NotionProp | undefined): string | null => prop?.select?.name ?? null;

/**
 * その週の月曜（`YYYY-MM-DD`、Asia/Tokyo 基準）を返す。
 * デイリーは週単位で確定し週中はロックされる（05_quest_design.md §2.2）ため、
 * 「今週ぶんの5個」を引く鍵になる。
 */
export function currentWeekOf(now: Date = new Date()): string {
  // 0=日曜〜6=土曜。月曜を週初とするため、日曜は6日戻す。
  const weekday = weekdayIndexInTimeZone(now, DISPLAY_TIME_ZONE);
  const daysSinceMonday = (weekday + 6) % 7;
  const monday = new Date(now.getTime() - daysSinceMonday * 86400000);
  return dateKeyInTimeZone(monday, DISPLAY_TIME_ZONE);
}

/** Notion の1行を `DailyQuest` に写す。EXP は Notion に持たせず、この層で確定させる。 */
function toDailyQuest(page: NotionPage, weekOf: string): DailyQuest {
  const main = (selectName(page.properties.MainStatus) ?? "TECH") as MainStatusKey;
  return {
    id: page.id,
    kind: "daily",
    title: plainText(page.properties["名前"]),
    main,
    involvedStatuses: [main],
    expectedExp: page.properties.ExpectedExp?.number ?? 0,
    done: selectName(page.properties.Status) === "done",
    // 週中はロック。次に選び直せるのは翌週の月曜。
    lockedUntil: weekOf,
    exploration: page.properties.Exploration?.checkbox === true,
  };
}

/**
 * 今週のデイリー5個を取得する（`Tier = daily` かつ `WeekOf` が今週の月曜）。
 * 件数は保証しない。`DAILY_QUEST_COUNT` との不一致は呼び出し側が扱う
 * （`updateStreak` がデータ不整合として throw する契約に合わせる）。
 */
export async function fetchDailies(weekOf: string = currentWeekOf()): Promise<DailyQuest[]> {
  const body = (await notionFetch(`/databases/${questsDbId()}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        and: [
          { property: "Tier", select: { equals: "daily" } },
          { property: "WeekOf", date: { equals: weekOf } },
        ],
      },
      sorts: [{ property: "名前", direction: "ascending" }],
    }),
  })) as { results: NotionPage[] };

  return body.results.map((page) => toDailyQuest(page, weekOf));
}

/**
 * デイリーの達成状態を書き換える（`Status` を `done` / `todo` に切り替えるだけ）。
 *
 * > **ここでストリークや HP を動かさない。** 未達判定と HP 更新は日次ジョブ
 * > （03:00 JST）の責務であり、`penalty.ts` が唯一の計算元という契約を守る
 * > （10_notion_schema.md §4.1）。この関数は「事実の記録」だけを行う。
 */
export async function setDailyStatus(pageId: string, done: boolean): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: { Status: { select: { name: done ? "done" : "todo" } } },
    }),
  });
}
