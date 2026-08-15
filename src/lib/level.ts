import { LEVEL_THRESHOLDS, MAX_LEVEL, STATUS_ORDER, TOTAL_TOP_N, TOTAL_WEIGHT_TOP, TOTAL_WEIGHT_ALL, WEAK_AXIS_COUNT } from "./constants";
import type { StatusKey, StatusMap } from "./types";

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

/** exp >= LEVEL_THRESHOLDS[i] を満たす最大の i+1 を返す（上限 MAX_LEVEL）。 */
export function levelFromExp(exp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return clampLevel(level);
}

/** その Lv の下限累積EXP。 */
export function levelFloorExp(level: number): number {
  const clamped = clampLevel(level);
  return LEVEL_THRESHOLDS[clamped - 1];
}

/** 次Lvまでの残EXP。Lv10（MAX）では null。 */
export function expToNextLevel(exp: number): number | null {
  const level = levelFromExp(exp);
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level] - exp;
}

/** 現Lv内の進捗率 0..1。Lv10 では 1。 */
export function levelProgress(exp: number): number {
  const level = levelFromExp(exp);
  if (level >= MAX_LEVEL) return 1;
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceil = LEVEL_THRESHOLDS[level];
  const progress = (exp - floor) / (ceil - floor);
  return Math.min(1, Math.max(0, progress));
}

/** 9ステータス全てのLvを算出する。 */
export function levelsOf(statuses: StatusMap): Record<StatusKey, number> {
  const result = {} as Record<StatusKey, number>;
  for (const key of STATUS_ORDER) {
    result[key] = levelFromExp(statuses[key].exp);
  }
  return result;
}

/**
 * 上位5ステータスのLv平均×0.6 + 全9ステータスのLv平均×0.4。
 * Lv同値の場合は STATUS_ORDER 順で先にあるものを上位5件に優先して採用する（決定的な選択）。
 * 小数第1位に丸めて返す。
 */
export function computeTotalLevel(statuses: StatusMap): number {
  const levels = levelsOf(statuses);
  // STATUS_ORDER の順に並んだ配列を、Lv降順・同値ならSTATUS_ORDER順（=元のindex昇順）で安定ソートする。
  const entries = STATUS_ORDER.map((key, index) => ({ key, index, level: levels[key] }));
  const sorted = [...entries].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return a.index - b.index;
  });
  const top = sorted.slice(0, TOTAL_TOP_N);
  const topAvg = top.reduce((sum, e) => sum + e.level, 0) / TOTAL_TOP_N;
  const allAvg = entries.reduce((sum, e) => sum + e.level, 0) / entries.length;
  const total = topAvg * TOTAL_WEIGHT_TOP + allAvg * TOTAL_WEIGHT_ALL;
  return Math.round(total * 10) / 10;
}

/** TOTAL Lv の小数部（ヒーローのEXPバーに使う）。0..1。 */
export function totalLevelProgress(totalLevel: number): number {
  const fraction = totalLevel - Math.floor(totalLevel);
  return Math.min(1, Math.max(0, fraction));
}

/**
 * 最も Lv が低い軸を返す（CLAUDE.md「弱い領域が得意領域の陰に隠れて放置される」への対処）。
 * 同値のときは STATUS_ORDER 順で決定的に選ぶ（computeTotalLevel の上位5選出と同じ規則）。
 * calibration 中の未測定軸は判定対象から外す（"???" の軸を「最も薄い」と断定しないため）。
 */
export function weakestStatuses(
  statuses: StatusMap,
  count: number = WEAK_AXIS_COUNT,
): readonly { key: StatusKey; level: number }[] {
  const levels = levelsOf(statuses);
  const entries = STATUS_ORDER
    .map((key, index) => ({ key, index, level: levels[key], measured: statuses[key].measured }))
    .filter((e) => e.measured);
  const sorted = [...entries].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.index - b.index;
  });
  return sorted.slice(0, count).map(({ key, level }) => ({ key, level }));
}
