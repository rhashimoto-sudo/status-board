import { afterEach, describe, expect, it } from "vitest";
import { dateKeyInTimeZone, weekdayIndexInTimeZone } from "@/lib/datetime";

// Vercel の Node ランタイムは UTC、ローカル開発は JST。この関数群は `timeZone` を明示するため
// 本来 `process.env.TZ` に依存しないはずだが、それを固定するテストとして残す（レビュー指摘A）。
describe("weekdayIndexInTimeZone / dateKeyInTimeZone (TZ非依存)", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(["UTC", "Asia/Tokyo"])(
    "TZ=%s でも JST 2026-08-17（月曜）00:00 は月曜のインデックス(1)を返す",
    (tz) => {
      process.env.TZ = tz;
      const date = new Date("2026-08-17T00:00:00+09:00");
      expect(weekdayIndexInTimeZone(date)).toBe(1);
    },
  );

  it.each(["UTC", "Asia/Tokyo"])(
    "TZ=%s でも JST 2026-08-17 00:00 は日付文字列 2026-08-17 を返す",
    (tz) => {
      process.env.TZ = tz;
      const date = new Date("2026-08-17T00:00:00+09:00");
      expect(dateKeyInTimeZone(date)).toBe("2026-08-17");
    },
  );

  it.each(["UTC", "Asia/Tokyo"])(
    "TZ=%s: UTC日付とJST日付がまたぐ時刻でも Asia/Tokyo 基準で一致する",
    (tz) => {
      process.env.TZ = tz;
      // UTC 2026-08-16T15:00:00Z == JST 2026-08-17 00:00（日付がまたぐ境界）
      const date = new Date("2026-08-16T15:00:00.000Z");
      expect(dateKeyInTimeZone(date)).toBe("2026-08-17");
      expect(weekdayIndexInTimeZone(date)).toBe(1);
    },
  );
});
