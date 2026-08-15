import { DISPLAY_TIME_ZONE } from "./constants";

// en-US の "Sun".."Sat" のインデックス（0=日曜〜6=土曜）に一致させる。
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * 指定タイムゾーンでの曜日インデックス（0=日曜〜6=土曜）を返す。
 * `Date.getDay()` はランタイムのローカルタイムゾーンに依存し、ローカル（JST）開発環境と
 * Vercel の Node ランタイム（UTC）で結果が変わってしまうため、必ずこちらを使う。
 *
 * ## `date` 引数はどのタイムゾーンで解釈される瞬間か
 * `Date` は内部的には UTC 時刻の1点であり、それ自体にタイムゾーン情報は無い。
 * この関数は「その1点の瞬間」を第2引数 `timeZone` で解釈し直して曜日を返すだけなので、
 * **`date` を組み立てる側が、どのタイムゾーンの「その日の0時」を指したいのかを
 * 正しく UTC 時刻に変換しておく責任を持つ**。
 *
 * ## `YYYY-MM-DD` 文字列から `Date` を作って渡す場合（最重要の誤用ポイント）
 * `DISPLAY_TIME_ZONE`（Asia/Tokyo）基準で**既に確定済み**の `"YYYY-MM-DD"` 文字列
 * （snapshot.date や活動ログの date など）から `Date` を作る場合、その文字列にはもう
 * 解決すべきタイムゾーン情報が残っていない。**`` `${dateStr}T00:00:00Z` `` として UTC の
 * 深夜0時を表す `Date` を作り、第2引数には `"UTC"` を渡すこと**（`DISPLAY_TIME_ZONE` を
 * 渡すと、UTC からのオフセットぶん再解釈されて日付がずれる。たまたま Asia/Tokyo は
 * UTC+9 の正のオフセットなので同じ日になっていることが多いが、負のオフセットの
 * タイムゾーンに変えると全セルが1行ずれるなど、静かにグリッドが崩れる）。
 *
 * ## 「表示用の現在時刻」の曜日・日付が欲しい場合
 * `new Date()`（＝実行時点の現在時刻）を渡し、第2引数は省略してデフォルトの
 * `DISPLAY_TIME_ZONE` を使うこと（このプロジェクトの表示タイムゾーンは常に
 * `DISPLAY_TIME_ZONE` に固定するため）。
 */
export function weekdayIndexInTimeZone(date: Date, timeZone: string = DISPLAY_TIME_ZONE): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const index = EN_WEEKDAYS.indexOf(label as (typeof EN_WEEKDAYS)[number]);
  if (index === -1) {
    throw new Error(`weekdayIndexInTimeZone: unexpected weekday label "${label}"`);
  }
  return index;
}

/**
 * 指定タイムゾーンでの `YYYY-MM-DD` を返す。`toISOString`/`getFullYear` 系はいずれも
 * ランタイムのタイムゾーンに依存する（前者はUTC固定、後者はローカル依存）ため使わない。
 * `en-CA` ロケールは `YYYY-MM-DD` 形式を返す仕様を利用している。
 *
 * ## `date` 引数はどのタイムゾーンで解釈される瞬間か
 * `weekdayIndexInTimeZone` と同じく、`date` は UTC 時刻の1点であり、この関数は
 * それを第2引数 `timeZone` で解釈し直して日付文字列にするだけ。**「表示用の現在時刻」の
 * 日付が欲しい場合**は `new Date()` を渡し、第2引数は省略してデフォルトの
 * `DISPLAY_TIME_ZONE` を使うこと。
 *
 * ## 既に `YYYY-MM-DD` の日付文字列を持っている場合は、この関数を経由しない
 * `DISPLAY_TIME_ZONE` 基準で確定済みの `"YYYY-MM-DD"` 文字列をこの関数の
 * 入出力に往復させる必要はない（その文字列自体がすでに答え）。もし
 * その文字列から改めて `Date` を作って渡す必要がある場合は、
 * `` `${dateStr}T00:00:00Z` `` として UTC の深夜0時を表す `Date` を作り、
 * 第2引数には必ず `"UTC"` を渡すこと（`weekdayIndexInTimeZone` のドキュメント参照）。
 */
export function dateKeyInTimeZone(date: Date, timeZone: string = DISPLAY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
