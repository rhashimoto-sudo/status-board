import { describe, expect, it } from "vitest";
import {
  computeTotalLevel,
  expToNextLevel,
  levelFloorExp,
  levelFromExp,
  levelProgress,
  levelsOf,
  totalLevelProgress,
  weakestStatuses,
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

describe("levelProgress と expToNextLevel の分母一致（status-list.tsx のバー/テキスト表示の根拠）", () => {
  // status-list.tsx はバー(levelProgress)とテキスト(expToNextLevel)を同じLv帯から算出する。
  // 恒等式 floor + progress * (ceil - floor) + remaining === ceil が常に成り立つことを固定する。
  it.each([
    [0, 1], // Lv1 の下限
    [99, 1], // Lv1 帯の直前
    [100, 2], // Lv2 の下限
    [925, 4], // Lv4 帯の直前（帯境界の直前）
    [926, 5], // Lv5 の下限（帯境界の直後）
    [1580, 5], // Lv5 帯の直前
    [1581, 6], // Lv6 の下限
  ])("exp=%i (Lv%i) でバーとテキストの分母が一致する", (exp, expectedLevel) => {
    expect(levelFromExp(exp)).toBe(expectedLevel);

    const progress = levelProgress(exp);
    const remaining = expToNextLevel(exp);
    expect(remaining).not.toBeNull();

    const floor = levelFloorExp(expectedLevel);
    const ceil = exp + remaining!; // = 次Lvの累積閾値（テキスト側が使う値）
    // 恒等式: floor + progress*(ceil-floor) + remaining === ceil（バーとテキストが同じLv帯を参照する証明）
    expect(floor + progress * (ceil - floor) + remaining!).toBeCloseTo(ceil, 10);
  });

  it("Lv10（MAX）では expToNextLevel が null、levelProgress が 1 を返す", () => {
    expect(levelFromExp(11287)).toBe(10);
    expect(expToNextLevel(11287)).toBeNull();
    expect(levelProgress(11287)).toBe(1);
  });
});

describe("totalLevelProgress", () => {
  it("小数部を 0..1 で返す", () => {
    expect(totalLevelProgress(4.2)).toBeCloseTo(0.2);
    expect(totalLevelProgress(5.0)).toBe(0);
    expect(totalLevelProgress(10.0)).toBe(0);
  });
});

describe("weakestStatuses", () => {
  const mk = (levels: Partial<Record<StatusKey, number>>, measured = true): StatusMap => {
    const out = {} as Record<StatusKey, { key: StatusKey; exp: number; measured: boolean; expThreeMonthsAgo: number }>;
    for (const key of STATUS_ORDER) {
      const lv = levels[key] ?? 1;
      out[key] = { key, exp: levelFloorExp(lv), measured, expThreeMonthsAgo: 0 };
    }
    return out as StatusMap;
  };

  it("最も Lv の低い2軸を返す", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    expect(weakestStatuses(s).map((w) => w.key)).toEqual(["BRIDGE", "ENGLISH"]);
  });

  it("同値のときは STATUS_ORDER 順で決定的に選ぶ", () => {
    const s = mk({}); // 全て Lv1
    expect(weakestStatuses(s).map((w) => w.key)).toEqual([STATUS_ORDER[0], STATUS_ORDER[1]]);
  });

  it("未測定の軸は対象から外す", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    const partial = { ...s, BRIDGE: { ...s.BRIDGE, measured: false } } as StatusMap;
    expect(weakestStatuses(partial).map((w) => w.key)).not.toContain("BRIDGE");
  });

  it("count で本数を変えられる", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    expect(weakestStatuses(s, 3)).toHaveLength(3);
  });
});
