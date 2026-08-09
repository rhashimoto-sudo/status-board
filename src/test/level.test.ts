import { describe, expect, it } from "vitest";
import {
  computeTotalLevel,
  expToNextLevel,
  levelFloorExp,
  levelFromExp,
  levelProgress,
  levelsOf,
  totalLevelProgress,
} from "@/lib/level";
import { STATUS_ORDER } from "@/lib/constants";
import type { Status, StatusKey, StatusMap } from "@/lib/types";

function makeStatusMap(expByKey: Partial<Record<StatusKey, number>>): StatusMap {
  const map = {} as Record<StatusKey, Status>;
  for (const key of STATUS_ORDER) {
    map[key] = {
      key,
      exp: expByKey[key] ?? 0,
      measured: true,
      expThreeMonthsAgo: 0,
    };
  }
  return map;
}

describe("levelFromExp", () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [925, 4],
    [926, 5],
    [1580, 5],
    [1581, 6],
    [11286, 9],
    [11287, 10],
    [999999, 10],
  ])("exp=%i -> Lv%i", (exp, expected) => {
    expect(levelFromExp(exp)).toBe(expected);
  });
});

describe("expToNextLevel", () => {
  it("Lv10 の入力（下限EXP）で null を返す", () => {
    expect(expToNextLevel(11287)).toBeNull();
  });

  it("Lv10 を超える累積EXPでも null を返す", () => {
    expect(expToNextLevel(999999)).toBeNull();
  });

  it("Lv10未満では次Lvまでの残EXPを返す", () => {
    expect(expToNextLevel(0)).toBe(100);
    expect(expToNextLevel(925)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("常に 0..1 の範囲に収まる", () => {
    for (const exp of [0, 50, 99, 100, 500, 925, 926, 11286, 11287, 999999]) {
      const progress = levelProgress(exp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it("Lv内の下限では 0 に近い", () => {
    expect(levelProgress(100)).toBe(0);
  });

  it("Lv10 では 1 を返す", () => {
    expect(levelProgress(11287)).toBe(1);
    expect(levelProgress(999999)).toBe(1);
  });
});

describe("levelFloorExp", () => {
  it.each([
    [1, 0],
    [2, 100],
    [5, 926],
    [10, 11287],
  ])("Lv%i の下限累積EXPは %i", (level, expected) => {
    expect(levelFloorExp(level)).toBe(expected);
  });

  it("範囲外の Lv はクランプする", () => {
    expect(levelFloorExp(0)).toBe(0);
    expect(levelFloorExp(11)).toBe(11287);
  });
});

describe("levelsOf", () => {
  it("9ステータス全てのLvを算出する", () => {
    const statuses = makeStatusMap({ INT: 100, TECH: 926 });
    const levels = levelsOf(statuses);
    expect(levels.INT).toBe(2);
    expect(levels.TECH).toBe(5);
    expect(levels.DATA).toBe(1);
  });
});

describe("computeTotalLevel", () => {
  it("全ステータスLv1のとき TOTAL Lv 1.0", () => {
    const statuses = makeStatusMap({});
    expect(computeTotalLevel(statuses)).toBe(1.0);
  });

  it("上位5平均×0.6 + 全9平均×0.4 の式どおりに計算する", () => {
    // Lv構成（STATUS_ORDER順）: INT10 TECH9 DATA8 MARKETING7 PM6 BRIDGE5 ENGLISH4 LEARNING3 EXECUTION2
    const statuses = makeStatusMap({
      INT: levelFloorExp(10),
      TECH: levelFloorExp(9),
      DATA: levelFloorExp(8),
      MARKETING: levelFloorExp(7),
      PM: levelFloorExp(6),
      BRIDGE: levelFloorExp(5),
      ENGLISH: levelFloorExp(4),
      LEARNING: levelFloorExp(3),
      EXECUTION: levelFloorExp(2),
    });
    // 上位5: 10,9,8,7,6 -> 平均8 / 全9: (10+9+8+7+6+5+4+3+2)/9 = 54/9 = 6
    const expected = Math.round((8 * 0.6 + 6 * 0.4) * 10) / 10;
    expect(computeTotalLevel(statuses)).toBe(expected);
    expect(computeTotalLevel(statuses)).toBe(7.2);
  });

  it("小数第1位まで保持する", () => {
    const statuses = makeStatusMap({
      INT: levelFloorExp(3),
    });
    const total = computeTotalLevel(statuses);
    expect(Number.isInteger(total * 10)).toBe(true);
  });

  it("Lv同値が6件以上あっても選択が決定的（複数回呼んでも同じ結果）", () => {
    // 9ステータス中6件が同一Lv(5)で並ぶケース
    const statuses = makeStatusMap({
      INT: levelFloorExp(5),
      TECH: levelFloorExp(5),
      DATA: levelFloorExp(5),
      MARKETING: levelFloorExp(5),
      PM: levelFloorExp(5),
      BRIDGE: levelFloorExp(5),
      ENGLISH: levelFloorExp(3),
      LEARNING: levelFloorExp(2),
      EXECUTION: levelFloorExp(1),
    });
    const results = Array.from({ length: 10 }, () => computeTotalLevel(statuses));
    expect(new Set(results).size).toBe(1);
    // 上位5(全て同値5の中から5件): 平均5 / 全9平均: (5*6+3+2+1)/9 = 36/9 = 4
    expect(results[0]).toBe(Math.round((5 * 0.6 + 4 * 0.4) * 10) / 10);
  });
});

describe("totalLevelProgress", () => {
  it("小数部を 0..1 で返す", () => {
    expect(totalLevelProgress(4.2)).toBeCloseTo(0.2);
    expect(totalLevelProgress(5.0)).toBe(0);
    expect(totalLevelProgress(10.0)).toBe(0);
  });
});
