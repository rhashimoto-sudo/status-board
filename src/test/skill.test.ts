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
import { DERIVATIONS, FINAL_CLASS_TOTAL_LEVEL, MAX_LEVEL, SKILL_MULTIPLIERS, STATUS_ORDER } from "@/lib/constants";
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

/** DERIVATIONS から特定派生・特定軸の requires.level を引く（テストへの直書きを避ける）。 */
function requirementLevel(derivationId: string, key: StatusKey): number {
  const derivation = DERIVATIONS.find((d) => d.id === derivationId);
  if (!derivation) throw new Error(`derivation not found: ${derivationId}`);
  const requirement = derivation.requires.find((r) => r.key === key);
  if (!requirement) throw new Error(`requirement not found: ${derivationId}/${key}`);
  return requirement.level;
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

const SYSTEM_DESIGN_TECH_REQ = requirementLevel("system-design", "TECH");
const SYSTEM_DESIGN_INT_REQ = requirementLevel("system-design", "INT");
const DATA_ANALYSIS_DATA_REQ = requirementLevel("data-analysis", "DATA");
const AI_DEVELOPMENT_TECH_REQ = requirementLevel("ai-development", "TECH");
const PM_PM_REQ = requirementLevel("pm", "PM");
const BRIDGE_BRIDGE_REQ = requirementLevel("bridge", "BRIDGE");

describe("derivationStates", () => {
  it("TECH条件は満たすがINT条件未満では《システム設計》未解放", () => {
    const statuses = makeStatusMap({ TECH: SYSTEM_DESIGN_TECH_REQ, INT: SYSTEM_DESIGN_INT_REQ - 1 });
    const states = derivationStates(statuses, MAX_LEVEL);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.unlocked).toBe(false);
  });

  it("TECH・INT条件をどちらも満たすと《システム設計》解放（AND条件）", () => {
    const statuses = makeStatusMap({ TECH: SYSTEM_DESIGN_TECH_REQ, INT: SYSTEM_DESIGN_INT_REQ });
    const states = derivationStates(statuses, MAX_LEVEL);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.unlocked).toBe(true);
  });

  it("DATA条件を満たすと《データ分析》のみ単純条件で解放される", () => {
    const statuses = makeStatusMap({ DATA: DATA_ANALYSIS_DATA_REQ });
    const states = derivationStates(statuses, MAX_LEVEL);
    const dataAnalysis = states.find((s) => s.id === "data-analysis");
    expect(dataAnalysis?.unlocked).toBe(true);
  });

  it("requirements に required/current が正しく入る", () => {
    const statuses = makeStatusMap({ TECH: SYSTEM_DESIGN_TECH_REQ, INT: SYSTEM_DESIGN_INT_REQ });
    const states = derivationStates(statuses, MAX_LEVEL);
    const systemDesign = states.find((s) => s.id === "system-design");
    expect(systemDesign?.requirements).toEqual([
      { key: "TECH", required: SYSTEM_DESIGN_TECH_REQ, current: SYSTEM_DESIGN_TECH_REQ },
      { key: "INT", required: SYSTEM_DESIGN_INT_REQ, current: SYSTEM_DESIGN_INT_REQ },
    ]);
  });

  it("levelCap=50 では TECH の実Lvが70超でも current は50で頭打ちになり《システム設計》は解放されない（貯蓄分の先行解放なし）", () => {
    // 実Lvは system-design の TECH 要件を大きく超える値にし、levelCap=50 でも
    // 別の要件（ai-development の TECH:50）には抵触しない値であることを明示する。
    expect(SYSTEM_DESIGN_TECH_REQ).toBeGreaterThan(50);
    const realTechLevel = SYSTEM_DESIGN_TECH_REQ + 20;
    const statuses = makeStatusMap({ TECH: realTechLevel, INT: SYSTEM_DESIGN_INT_REQ });
    const states = derivationStates(statuses, 50);
    const systemDesign = states.find((s) => s.id === "system-design");
    const techRequirement = systemDesign?.requirements.find((r) => r.key === "TECH");
    expect(techRequirement?.current).toBe(50);
    expect(systemDesign?.unlocked).toBe(false);

    // 比較対象: levelCap なし（MAX_LEVEL）なら同じ実Lvで解放されることを確認する。
    const uncappedStates = derivationStates(statuses, MAX_LEVEL);
    const uncappedSystemDesign = uncappedStates.find((s) => s.id === "system-design");
    expect(uncappedSystemDesign?.unlocked).toBe(true);
  });
});

describe("allDerivationsUnlocked", () => {
  it("5派生すべてを満たすレベル構成で true", () => {
    const statuses = makeStatusMap({
      DATA: DATA_ANALYSIS_DATA_REQ,
      TECH: Math.max(AI_DEVELOPMENT_TECH_REQ, SYSTEM_DESIGN_TECH_REQ),
      INT: SYSTEM_DESIGN_INT_REQ,
      PM: PM_PM_REQ,
      BRIDGE: BRIDGE_BRIDGE_REQ,
    });
    expect(allDerivationsUnlocked(statuses, MAX_LEVEL)).toBe(true);
  });

  it("1つでも未解放なら false", () => {
    const statuses = makeStatusMap({
      DATA: DATA_ANALYSIS_DATA_REQ,
      TECH: Math.max(AI_DEVELOPMENT_TECH_REQ, SYSTEM_DESIGN_TECH_REQ),
      INT: SYSTEM_DESIGN_INT_REQ,
      PM: PM_PM_REQ,
      BRIDGE: BRIDGE_BRIDGE_REQ - 1,
    });
    expect(allDerivationsUnlocked(statuses, MAX_LEVEL)).toBe(false);
  });
});

describe("isFinalClassReached", () => {
  const allUnlockedStatuses = makeStatusMap({
    DATA: DATA_ANALYSIS_DATA_REQ,
    TECH: Math.max(AI_DEVELOPMENT_TECH_REQ, SYSTEM_DESIGN_TECH_REQ),
    INT: SYSTEM_DESIGN_INT_REQ,
    PM: PM_PM_REQ,
    BRIDGE: BRIDGE_BRIDGE_REQ,
  });

  it(`TOTAL Lv${FINAL_CLASS_TOTAL_LEVEL}でも派生5種未解放なら false`, () => {
    const statuses = makeStatusMap({});
    expect(isFinalClassReached(FINAL_CLASS_TOTAL_LEVEL, statuses, MAX_LEVEL)).toBe(false);
  });

  it(`TOTAL Lv${FINAL_CLASS_TOTAL_LEVEL} かつ 派生5種すべて解放で true`, () => {
    expect(isFinalClassReached(FINAL_CLASS_TOTAL_LEVEL, allUnlockedStatuses, MAX_LEVEL)).toBe(true);
  });

  it(`派生5種解放済みでも TOTAL Lv が${FINAL_CLASS_TOTAL_LEVEL}未満なら false`, () => {
    expect(isFinalClassReached(FINAL_CLASS_TOTAL_LEVEL - 0.1, allUnlockedStatuses, MAX_LEVEL)).toBe(false);
  });
});

describe("buildUniqueSkill", () => {
  it("発動52回 -> Lv4・×1.30・derivations を含む UniqueSkill を構築する", () => {
    const statuses = makeStatusMap({});
    const skill = buildUniqueSkill(52, statuses, MAX_LEVEL);
    expect(skill.activations).toBe(52);
    expect(skill.level).toBe(4);
    expect(skill.multiplier).toBe(1.30);
    expect(skill.toNext).toBe(48);
    expect(skill.derivations).toHaveLength(5);
  });

  it("Lv10（500回）では toNext が null", () => {
    const statuses = makeStatusMap({});
    const skill = buildUniqueSkill(500, statuses, MAX_LEVEL);
    expect(skill.toNext).toBeNull();
  });
});
