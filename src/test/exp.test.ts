import { describe, expect, it } from "vitest";
import { applyExpDelta, calcExp, distributeExp, floorExp } from "@/lib/exp";
import { levelFloorExp, levelFromExp } from "@/lib/level";
import { LEVEL_CAP_GATES } from "@/lib/constants";
import type { Status } from "@/lib/types";

function makeStatus(exp: number): Status {
  return { key: "TECH", exp, measured: true, expThreeMonthsAgo: 0 };
}

describe("floorExp", () => {
  it.each([
    // Lv5の下限を下回るときは下限でフロアする
    [levelFloorExp(5) - 4, 5, levelFloorExp(5)],
    // Lv5の下限を上回っているときはそのまま
    [levelFloorExp(5) + 6, 5, levelFloorExp(5) + 6],
    // Lv1（下限0）では負にならない
    [-5, 1, levelFloorExp(1)],
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

  it("50%換算が .5 ちょうどなら切り上げる（四捨五入）", () => {
    expect(distributeExp(7, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 7 },
      { key: "INT", amount: 4 }, // 7 * 0.5 = 3.5 -> 4
    ]);
  });

  // SUB_STATUS_RATIO = 0.5 かつ exp が整数である限り、積の端数は .0 か .5 にしかならない。
  // よって「端数 .5 未満で切り下がる」ケースは原理的に発生せず、常に .5 の切り上げか端数なし。
  // Math.floor に変えると下の .5 ケースが全て 1 ずれるため、この2件が丸め方向の retaining test になる。
  it("偶数EXPは端数が出ず 50% がそのまま加算される", () => {
    expect(distributeExp(8, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 8 },
      { key: "INT", amount: 4 }, // 8 * 0.5 = 4.0
    ]);
  });

  it("奇数EXPは端数 .5 が必ず切り上がる", () => {
    expect(distributeExp(5, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 5 },
      { key: "INT", amount: 3 }, // 5 * 0.5 = 2.5 -> 3
    ]);
    expect(distributeExp(9, "TECH", "INT")).toEqual([
      { key: "TECH", amount: 9 },
      { key: "INT", amount: 5 }, // 9 * 0.5 = 4.5 -> 5
    ]);
  });
});

describe("calcExp の completion クランプ", () => {
  const base = {
    difficulty: "D3",
    novelty: "first",
    structureMultiplier: 1.0,
    debuffMultiplier: 1.0,
    hasEvidence: true,
  } as const;

  it("completion が 1 を超えてもEXPが増幅されない", () => {
    expect(calcExp({ ...base, completion: 1.5 })).toBe(calcExp({ ...base, completion: 1 }));
  });

  it("completion が負でもEXPが負にならない", () => {
    expect(calcExp({ ...base, completion: -1 })).toBe(0);
  });

  it("completion が NaN なら 0 を返す", () => {
    expect(calcExp({ ...base, completion: Number.NaN })).toBe(0);
  });
});

describe("applyExpDelta", () => {
  it("Lv41(940)から-50しても現Lvの下限926で止まる", () => {
    const result = applyExpDelta(makeStatus(940), -50);
    expect(result.exp).toBe(levelFloorExp(41));
  });

  it("Lv41(1000)から-10なら990（下限を下回らないのでそのまま）", () => {
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

/**
 * S-2 の不変条件を守るための回帰テスト。
 *
 * `applyExpDelta` は EXP フロアの基準に **levelCap を適用しない生Lv** を使わなければならない。
 * `levelFromExp` の第2引数（levelCap）は既定値 `MAX_LEVEL` の任意引数で、`exp.ts` は
 * これを渡さないことで生Lvを得ている。ここに実際の cap を渡すよう「厳密化」すると、
 * **キャップ到達中に貯めた EXP が減点のたびに現在の実効Lvの下限まで削られ**、
 * 「キャップ中も貯まり続け、解放時に貯蓄分で一気に追いつく」という S-2 の核が壊れる。
 *
 * 以下のテストは、その一手を入れた瞬間に落ちる。
 */
describe("applyExpDelta と levelCap（S-2 の不変条件）", () => {
  const CAP = LEVEL_CAP_GATES[0];               // 初期キャップ 50

  it("キャップを大きく超えて貯まった EXP は、減点しても実効Lvの下限まで落ちない", () => {
    // 旧カンスト相当（Lv91）まで貯めた状態。実効Lvは cap で 50 に抑えられている。
    const saved = levelFloorExp(91);
    expect(levelFromExp(saved, CAP)).toBe(CAP);  // 実効Lvは 50 に張り付いている

    const result = applyExpDelta(makeStatus(saved), -1000);

    // 生Lv91の下限で止まる。実効Lv50の下限まで削られてはならない。
    expect(result.exp).toBe(levelFloorExp(91));
    expect(result.exp).not.toBe(levelFloorExp(CAP));
  });

  it("減点を受けた後にキャップが解放されても、貯蓄分がそのまま実効Lvに反映される", () => {
    const saved = levelFloorExp(91);
    const afterPenalty = applyExpDelta(makeStatus(saved), -1000).exp;

    // ボス討伐で cap 50 → 70 に上がった瞬間、貯蓄分で一気に追いつく。
    expect(levelFromExp(afterPenalty, LEVEL_CAP_GATES[1])).toBe(LEVEL_CAP_GATES[1]);
  });
});
