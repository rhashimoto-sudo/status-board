import { describe, expect, it } from "vitest";
import { applyExpDelta, calcExp, distributeExp, floorExp } from "@/lib/exp";
import type { Status } from "@/lib/types";

function makeStatus(exp: number): Status {
  return { key: "TECH", exp, measured: true, expThreeMonthsAgo: 0 };
}

describe("floorExp", () => {
  it.each([
    [890, 5, 926], // Lv5(下限926)で -50: 940-50=890 -> 926（Lv5のまま）
    [990, 5, 990], // Lv5(下限926)で -10: 1000-10=990 -> 990（下限を下回らない）
    [-5, 1, 0], // Lv1(下限0)で -10: 5-10=-5 -> 0（負にならない）
  ])("newExp=%i, currentLevel=%i -> %i", (newExp, currentLevel, expected) => {
    expect(floorExp(newExp, currentLevel)).toBe(expected);
  });
});

describe("calcExp", () => {
  it("D3×初挑戦×完遂1.0×構造化1.30×デバフなし = 117", () => {
    expect(
      calcExp({
        difficulty: "D3",
        novelty: "first",
        completion: 1.0,
        structureMultiplier: 1.3,
        debuffMultiplier: 1.0,
        hasEvidence: true,
      }),
    ).toBe(117);
  });

  it("D2×習熟×完遂0.7×構造化なし×衰弱0.8 = 7", () => {
    expect(
      calcExp({
        difficulty: "D2",
        novelty: "mastered",
        completion: 0.7,
        structureMultiplier: 1.0,
        debuffMultiplier: 0.8,
        hasEvidence: true,
      }),
    ).toBe(7);
  });

  it("hasEvidence: false は常に 0", () => {
    expect(
      calcExp({
        difficulty: "D5",
        novelty: "first",
        completion: 1.0,
        structureMultiplier: 1.5,
        debuffMultiplier: 1.0,
        hasEvidence: false,
      }),
    ).toBe(0);
  });
});

describe("distributeExp", () => {
  it("副ステータスなしなら主ステータスに100%のみ加算する", () => {
    expect(distributeExp(117, "TECH")).toEqual([{ key: "TECH", amount: 117 }]);
  });

  it("副ステータスには50%換算（四捨五入）で加算する", () => {
    expect(distributeExp(117, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 117 },
      { key: "INT", amount: 59 }, // 117 * 0.5 = 58.5 -> 59
    ]);
  });

  it("50%換算が .5 未満なら切り下げになる", () => {
    expect(distributeExp(7, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 7 },
      { key: "INT", amount: 4 }, // 7 * 0.5 = 3.5 -> 4（四捨五入）
    ]);
  });
});

describe("applyExpDelta", () => {
  it("Lv5(940)から-50しても現Lvの下限926で止まる", () => {
    const result = applyExpDelta(makeStatus(940), -50);
    expect(result.exp).toBe(926);
  });

  it("Lv5(1000)から-10なら990（下限を下回らないのでそのまま）", () => {
    const result = applyExpDelta(makeStatus(1000), -10);
    expect(result.exp).toBe(990);
  });

  it("Lv1(5)から-10しても0未満にならない", () => {
    const result = applyExpDelta(makeStatus(5), -10);
    expect(result.exp).toBe(0);
  });

  it("加算時は元の値にそのまま反映される", () => {
    const result = applyExpDelta(makeStatus(100), 50);
    expect(result.exp).toBe(150);
  });

  it("status の他のフィールドは変更しない", () => {
    const original = makeStatus(100);
    const result = applyExpDelta(original, 10);
    expect(result.key).toBe(original.key);
    expect(result.measured).toBe(original.measured);
    expect(result.expThreeMonthsAgo).toBe(original.expThreeMonthsAgo);
  });
});
