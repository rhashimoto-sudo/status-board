import { describe, expect, it } from "vitest";
import { HEATMAP_INTENSITY_STEPS } from "@/lib/constants";
import { buildHeatmapDays, intensityOf, intensityThresholds } from "@/lib/heatmap";
import type { Snapshot } from "@/lib/types";

const snapshot = (date: string, gainedExp: number): Snapshot => ({
  date,
  gainedExp,
  totalLevel: 1,
  levels: {
    INT: 1, TECH: 1, DATA: 1, MARKETING: 1, PM: 1,
    BRIDGE: 1, ENGLISH: 1, LEARNING: 1, EXECUTION: 1,
  },
});

describe("intensityOf", () => {
  it("活動なし(0)は必ず段階0になる", () => {
    const th = intensityThresholds([10, 20, 30, 40]);
    expect(intensityOf(0, th)).toBe(0);
    expect(intensityOf(-5, th)).toBe(0);
  });

  it("活動があれば必ず段階1以上になる（薄すぎて消えない）", () => {
    const th = intensityThresholds([100, 200, 300, 400]);
    expect(intensityOf(1, th)).toBeGreaterThanOrEqual(1);
  });

  it("段階は 0..STEPS-1 の範囲に収まる", () => {
    const gains = [0, 5, 10, 50, 100, 999];
    const th = intensityThresholds(gains);
    for (const g of gains) {
      const level = intensityOf(g, th);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(HEATMAP_INTENSITY_STEPS - 1);
    }
  });
});

describe("濃淡が潰れないこと（最大値正規化の回帰）", () => {
  it("外れ値が1日だけあっても残りが最下段に潰れない", () => {
    // 最大値正規化だと 10/1000 → すべて段階1に潰れる分布。
    const gains = [10, 12, 14, 16, 18, 20, 22, 24, 1000];
    const th = intensityThresholds(gains);
    const levels = gains.map((g) => intensityOf(g, th));
    expect(new Set(levels).size).toBeGreaterThanOrEqual(3);
  });

  it("値が近接していても複数段階に分かれる", () => {
    const gains = [40, 41, 42, 43, 44, 45, 46, 47];
    const th = intensityThresholds(gains);
    const levels = gains.map((g) => intensityOf(g, th));
    expect(new Set(levels).size).toBeGreaterThanOrEqual(3);
  });

  it("全日が同じ値なら全セルが同じ段階になる（分割不能なので潰れて正しい）", () => {
    const gains = [30, 30, 30, 30];
    const th = intensityThresholds(gains);
    expect(new Set(gains.map((g) => intensityOf(g, th))).size).toBe(1);
  });

  it("0が多数でも活動日は段階1以上に分布する", () => {
    const gains = [0, 0, 0, 0, 0, 0, 0, 0, 5, 50, 500];
    const th = intensityThresholds(gains);
    const active = [5, 50, 500].map((g) => intensityOf(g, th));
    expect(active.every((l) => l >= 1)).toBe(true);
    expect(new Set(active).size).toBeGreaterThanOrEqual(2);
  });

  it("全日0なら閾値は空で全セル段階0", () => {
    const th = intensityThresholds([0, 0, 0]);
    expect(th).toEqual([]);
    expect(intensityOf(0, th)).toBe(0);
  });
});

describe("buildHeatmapDays", () => {
  it("date と gainedExp を保持したまま intensity を付与する", () => {
    const history = [snapshot("2026-08-01", 0), snapshot("2026-08-02", 120)];
    const days = buildHeatmapDays(history);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ date: "2026-08-01", gainedExp: 0, intensity: 0 });
    expect(days[1]!.date).toBe("2026-08-02");
    expect(days[1]!.intensity).toBeGreaterThanOrEqual(1);
  });

  it("空配列でも例外を投げない", () => {
    expect(buildHeatmapDays([])).toEqual([]);
  });
});
