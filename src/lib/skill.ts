import {
  SKILL_ACTIVATION_THRESHOLDS,
  SKILL_MULTIPLIERS,
  MAX_SKILL_LEVEL,
  STRUCTURE_MIN_INVOLVED,
  NO_STRUCTURE_BONUS,
  DERIVATIONS,
  FINAL_CLASS_TOTAL_LEVEL,
} from "./constants";
import { levelFromExp } from "./level";
import type { DerivationState, SpecialtyStatusKey, StatusMap, UniqueSkill } from "./types";

function clampSkillLevel(level: number): number {
  return Math.min(MAX_SKILL_LEVEL, Math.max(1, level));
}

/** activations >= SKILL_ACTIVATION_THRESHOLDS[i] を満たす最大の i+1 を返す（上限 MAX_SKILL_LEVEL）。 */
export function skillLevelFromActivations(activations: number): number {
  let level = 1;
  for (let i = 0; i < SKILL_ACTIVATION_THRESHOLDS.length; i++) {
    if (activations >= SKILL_ACTIVATION_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return clampSkillLevel(level);
}

/** Skill Lv に対応する構造化ボーナス倍率。 */
export function skillMultiplier(skillLevel: number): number {
  return SKILL_MULTIPLIERS[clampSkillLevel(skillLevel) - 1];
}

/** 次Skill Lvまでの残発動回数。MAX_SKILL_LEVEL では null。 */
export function activationsToNext(activations: number): number | null {
  const level = skillLevelFromActivations(activations);
  if (level >= MAX_SKILL_LEVEL) return null;
  return SKILL_ACTIVATION_THRESHOLDS[level] - activations;
}

/** 現Skill Lv内の進捗率 0..1。MAX_SKILL_LEVEL では 1。 */
export function skillProgress(activations: number): number {
  const level = skillLevelFromActivations(activations);
  if (level >= MAX_SKILL_LEVEL) return 1;
  const floor = SKILL_ACTIVATION_THRESHOLDS[level - 1];
  const ceil = SKILL_ACTIVATION_THRESHOLDS[level];
  const progress = (activations - floor) / (ceil - floor);
  return Math.min(1, Math.max(0, progress));
}

/** 関与ステータス数が STRUCTURE_MIN_INVOLVED 以上なら《構造化》発動。 */
export function shouldActivate(involvedCount: number): boolean {
  return involvedCount >= STRUCTURE_MIN_INVOLVED;
}

/** 関与数が3未満なら 1.0（ボーナスなし）、3以上なら現在のSkill Lvの倍率。 */
export function structureBonus(involvedCount: number, skillLevel: number): number {
  if (!shouldActivate(involvedCount)) return NO_STRUCTURE_BONUS;
  return skillMultiplier(skillLevel);
}

/** DERIVATIONS の requires（AND条件）をステータスLvから毎回導出する。解放フラグは永続化しない。 */
export function derivationStates(statuses: StatusMap): readonly DerivationState[] {
  return DERIVATIONS.map((derivation) => {
    const requirements = derivation.requires.map((req) => {
      const key = req.key as SpecialtyStatusKey;
      return {
        key,
        required: req.level,
        current: levelFromExp(statuses[key].exp),
      };
    });
    const unlocked = requirements.every((req) => req.current >= req.required);
    return { id: derivation.id, name: derivation.name, unlocked, requirements };
  });
}

/** 派生5種すべてが解放済みか。 */
export function allDerivationsUnlocked(statuses: StatusMap): boolean {
  return derivationStates(statuses).every((derivation) => derivation.unlocked);
}

/** 最終クラス《AIビジネスアーキテクト》到達判定。TOTAL Lv9到達 かつ 派生5種すべて解放。 */
export function isFinalClassReached(totalLevel: number, statuses: StatusMap): boolean {
  return Math.floor(totalLevel) >= FINAL_CLASS_TOTAL_LEVEL && allDerivationsUnlocked(statuses);
}

/** UniqueSkill をまとめて構築する。 */
export function buildUniqueSkill(activations: number, statuses: StatusMap): UniqueSkill {
  const level = skillLevelFromActivations(activations);
  return {
    activations,
    level,
    multiplier: skillMultiplier(level),
    toNext: activationsToNext(activations),
    derivations: derivationStates(statuses),
  };
}
