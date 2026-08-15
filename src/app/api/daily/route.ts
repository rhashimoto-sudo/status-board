import { NextResponse } from "next/server";
import { fetchDailies } from "@/lib/notion";

// Notion を毎回読む（チェック状態はキャッシュしてはいけない）。
export const dynamic = "force-dynamic";

/**
 * 今週のデイリー5個を返す（10_notion_schema.md §5）。
 *
 * ページ本体は静的生成のまま維持し、**変わるのはこの5件だけ**をクライアントから取りに来る。
 * レーダーや90日履歴（重い部分）をビルド時に固めたままにできる。
 */
export async function GET() {
  try {
    return NextResponse.json({ dailies: await fetchDailies() });
  } catch (error) {
    // Notion 側の事情（未設定・障害）で画面全体を落とさない。
    // クライアントは失敗時、静的 JSON の初期値のまま表示を続ける。
    console.error("[api/daily] GET failed:", error);
    return NextResponse.json({ error: "デイリーを取得できませんでした" }, { status: 502 });
  }
}
