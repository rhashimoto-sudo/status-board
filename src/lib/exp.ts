import { DIFFICULTY_BASE_EXP, NOVELTY_MULTIPLIERS, SUB_STATUS_RATIO } from "./constants";
import { levelFloorExp, levelFromExp } from "./level";
import type { Difficulty, MainStatusKey, Novelty, Status, SubStatusKey } from "./types";

export type ExpInput = {
  difficulty: Difficulty;
  novelty: Novelty;
  completion: number; // 0..1
  structureMultiplier: number; // skill.ts の structureBonus() の結果を渡す
  debuffMultiplier: number; // penalty.ts の debuffMultiplier() の結果を渡す
  hasEvidence: boolean; // false なら常に 0
};

/** 04_exp_rules.md §1: EXP = 基礎値 × 新規性 × 完遂度 × 構造化 × デバフ。Math.round で整数化。 */
export function calcExp(input: ExpInput): number {
  if (!input.hasEvidence) return 0;
  const base = DIFFICULTY_BASE_EXP[input.difficulty];
  const novelty = NOVELTY_MULTIPLIERS[input.novelty];
  const completion = clampCompletion(input.completion);
  const raw = base * novelty * completion * input.structureMultiplier * input.debuffMultiplier;
  return Math.round(raw);
}

/** `completion` は 0..1 の想定。範囲外の入力でEXPが増幅・負転しないよう入口でクランプする。 */
function clampCompletion(completion: number): number {
  if (Number.isNaN(completion)) return 0;
  return Math.min(1, Math.max(0, completion));
}

/** 04_exp_rules.md §2: 主ステータスに100%、副ステータス（あれば）に50%換算（四捨五入）で加算する。 */
export function distributeExp(
  exp: number,
  main: MainStatusKey,
  sub?: SubStatusKey,
): readonly { key: MainStatusKey; amount: number }[] {
  const result: { key: MainStatusKey; amount: number }[] = [{ key: main, amount: exp }];
  if (sub) {
    result.push({ key: sub, amount: Math.round(exp * SUB_STATUS_RATIO) });
  }
  return result;
}

/**
 * 04_exp_rules.md §6: 減点後の累積EXPが現Lvの下限累積EXPを下回らないようにする。
 * = max(newExp, LEVEL_THRESHOLDS[currentLevel - 1])
 */
export function floorExp(newExp: number, currentLevel: number): number {
  return Math.max(newExp, levelFloorExp(currentLevel));
}

/** EXP の加算・減点を反映する。減点時（delta < 0）は必ず floorExp を通し、Lv・称号を下げない（C-7）。 */
export function applyExpDelta(status: Status, delta: number): Status {
  const currentLevel = levelFromExp(status.exp);
  const nextExp = floorExp(status.exp + delta, currentLevel);
  return { ...status, exp: nextExp };
}
