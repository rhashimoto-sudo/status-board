import { describe, expect, it } from "vitest";
import {
  activationsToNext,
  allDerivationsUnlocked,
  buildUniqueSkill,
  derivationStates,
  isFinalClassReached,
  shouldActivate,
  skillLevelFromActivations,
  skillMultiplier,
  skillProgress,
  structureBonus,
} from "@/lib/skill";
import { levelFloorExp } from "@/lib/level";
import { SKILL_MULTIPLIERS, STATUS_ORDER } from "@/lib/constants";
import type { Status, StatusKey, StatusMap } from "@/lib/types";

function makeStatusMap(levelByKey: Partial<Record<StatusKey, number>>): StatusMap {
  const map = {} as Record<StatusKey, Status>;
  for (const key of STATUS_ORDER) {
    map[key] = {
      key,
      exp: levelFloorExp(levelByKey[key] ?? 1),
      measured: true,
      expThreeMonthsAgo: 0,
    };
  }
  return map;
}

describe("skillLevelFromActivations", () => {
  it.each([
    [0, 1],
    [9, 1],
    [10, 2],
    [24, 2],
    [25, 3],
    [49, 3],
    [50, 4],
    [99, 4],
    [100, 5],
    [500, 10],
    [9999, 10],
  ])("activations=%i -> Lv%i", (activations, expected) => {
    expect(skillLevelFromActivations(activations)).toBe(expected);
  });
});

describe("skillMultiplier", () => {
  it("Skill Lv に対応する倍率を返す", () => {
    expect(skillMultiplier(1)).toBe(1.15);
    expect(skillMultiplier(4)).toBe(1.30);
    expect(skillMultiplier(10)).toBe(1.50);
  });

  it("SKILL_MULTIPLIERS の全要素と一致する", () => {
    for (let level = 1; level <= SKILL_MULTIPLIERS.length; level++) {
      expect(skillMultiplier(level)).toBe(SKILL_MULTIPLIERS[level - 1]);
    }
  });
});

describe("activationsToNext", () => {
  it("Lv10（500回）で null を返す", () => {
    expect(activationsToNext(500)).toBeNull();
  });

  it("Lv10 を超える発動回数でも null を返す", () => {
    expect(activationsToNext(9999)).toBeNull();
  });

  it("Lv10未満では次Lvまでの残発動回数を返す", () => {
    expect(activationsToNext(0)).toBe(10);
    expect(activationsToNext(9)).toBe(1);
  });
});

describe("skillProgress", () => {
  it("常に 0..1 の範囲に収まる", () => {
    for (const activations of [0, 9, 10, 24, 25, 500, 9999]) {
      const progress = skillProgress(activations);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it("Lv10 では 1 を返す", () => {
    expect(skillProgress(500)).toBe(1);
    expect(skillProgress(9999)).toBe(1);
  });
});

describe("shouldActivate", () => {
  it.each([
    [0, false],
    [1, false],
    [2, false],
    [3, true],
    [4, true],
  ])("関与%i -> %s", (involvedCount, expected) => {
    expect(shouldActivate(involvedCount)).toBe(expected);
  });
});

describe("structureBonus", () => {
  it("関与2以下では 1.0（ボーナスなし）", () => {
    expect(structureBonus(2, 4)).toBe(1.0);
    expect(structureBonus(1, 10)).toBe(1.0);
  });

  it("関与3以上では該当Skill Lvの倍率", () => {
    expect(structureBonus(3, 4)).toBe(1.30);
    expect(structureBonus(4, 10)).toBe(1.50);
  });
});

describe("derivationStates", () => {
  it("TECH7・INT4 では《システム設計》未解放", () => {
    const statuses = makeStatusMap({ TECH: 7, INT: 4 });
    const states = derivationStates(statuses);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.unlocked).toBe(false);
  });

  it("TECH7・INT5 では《システム設計》解放（AND条件）", () => {
    const statuses = makeStatusMap({ TECH: 7, INT: 5 });
    const states = derivationStates(statuses);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.unlocked).toBe(true);
  });

  it("DATA5 では《データ分析》のみ単純条件で解放される", () => {
    const statuses = makeStatusMap({ DATA: 5 });
    const states = derivationStates(statuses);
    const dataAnalysis = states.find((s) => s.id === "data-analysis");
    expect(dataAnalysis?.unlocked).toBe(true);
  });

  it("requirements に required/current が正しく入る", () => {
    const statuses = makeStatusMap({ TECH: 7, INT: 5 });
    const states = derivationStates(statuses);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.requirements).toEqual([
      { key: "TECH", required: 7, current: 7 },
      { key: "INT", required: 5, current: 5 },
    ]);
  });
});

describe("allDerivationsUnlocked", () => {
  it("5派生すべてを満たすレベル構成で true", () => {
    const statuses = makeStatusMap({ DATA: 5, TECH: 7, INT: 5, PM: 5, BRIDGE: 5 });
    expect(allDerivationsUnlocked(statuses)).toBe(true);
  });

  it("1つでも未解放なら false", () => {
    const statuses = makeStatusMap({ DATA: 5, TECH: 7, INT: 5, PM: 5, BRIDGE: 4 });
    expect(allDerivationsUnlocked(statuses)).toBe(false);
  });
});

describe("isFinalClassReached", () => {
  it("TOTAL Lv9でも派生5種未解放なら false", () => {
    const statuses = makeStatusMap({});
    expect(isFinalClassReached(9, statuses)).toBe(false);
  });

  it("TOTAL Lv9 かつ 派生5種すべて解放で true", () => {
    const statuses = makeStatusMap({ DATA: 5, TECH: 7, INT: 5, PM: 5, BRIDGE: 5 });
    expect(isFinalClassReached(9, statuses)).toBe(true);
  });

  it("派生5種解放済みでも TOTAL Lv が9未満なら false", () => {
    const statuses = makeStatusMap({ DATA: 5, TECH: 7, INT: 5, PM: 5, BRIDGE: 5 });
    expect(isFinalClassReached(8.9, statuses)).toBe(false);
  });
});

describe("buildUniqueSkill", () => {
  it("発動52回 -> Lv4・×1.30・derivations を含む UniqueSkill を構築する", () => {
    const statuses = makeStatusMap({});
    const skill = buildUniqueSkill(52, statuses);
    expect(skill.activations).toBe(52);
    expect(skill.level).toBe(4);
    expect(skill.multiplier).toBe(1.30);
    expect(skill.toNext).toBe(48);
    expect(skill.derivations).toHaveLength(5);
  });

  it("Lv10（500回）では toNext が null", () => {
    const statuses = makeStatusMap({});
    const skill = buildUniqueSkill(500, statuses);
    expect(skill.toNext).toBeNull();
  });
});
