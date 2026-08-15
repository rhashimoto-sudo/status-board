import { DISPLAY_TIME_ZONE } from "./constants";

// en-US の "Sun".."Sat" のインデックス（0=日曜〜6=土曜）に一致させる。
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * 指定タイムゾーンでの曜日インデックス（0=日曜〜6=土曜）を返す。
 * `Date.getDay()` はランタイムのローカルタイムゾーンに依存し、ローカル（JST）開発環境と
 * Vercel の Node ランタイム（UTC）で結果が変わってしまうため、必ずこちらを使う。
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
 */
export function dateKeyInTimeZone(date: Date, timeZone: string = DISPLAY_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
