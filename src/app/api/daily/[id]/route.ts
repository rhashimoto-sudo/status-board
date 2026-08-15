import { NextResponse } from "next/server";
import { setDailyStatus } from "@/lib/notion";

export const dynamic = "force-dynamic";

/** Notion の page id は UUID。想定外の文字列をそのまま API に流さない。 */
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/**
 * デイリーの達成状態を切り替える（10_notion_schema.md §5）。
 *
 * > **ここでストリーク・HP・EXP を動かさない。** 未達判定と HP 更新は日次ジョブ
 * > （03:00 JST）の責務で、`penalty.ts` が唯一の計算元という契約を守る（§4.1）。
 * > このエンドポイントは「チェックが付いた」という**事実の記録**だけを行う。
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "id の形式が不正です" }, { status: 400 });
  }

  let done: unknown;
  try {
    ({ done } = (await request.json()) as { done?: unknown });
  } catch {
    return NextResponse.json({ error: "JSON を解釈できません" }, { status: 400 });
  }
  if (typeof done !== "boolean") {
    return NextResponse.json({ error: "done は boolean です" }, { status: 400 });
  }

  try {
    await setDailyStatus(id, done);
    return NextResponse.json({ id, done });
  } catch (error) {
    console.error("[api/daily/:id] PATCH failed:", error);
    // クライアントは失敗を受け取ったら楽観的更新を巻き戻す。
    return NextResponse.json({ error: "更新できませんでした" }, { status: 502 });
  }
}
