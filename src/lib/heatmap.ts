import { HEATMAP_INTENSITY_STEPS } from "./constants";
import type { Snapshot } from "./types";

export type HeatmapDay = { date: string; gainedExp: number; intensity: number };

/**
 * 活動量の分位点しきい値を求める（09_dashboard_spec.md §4.2）。
 *
 * 最大値による線形正規化（`gainedExp / max`）は使わない。外れ値が1日でもあると
 * 残り全日が下位段階に潰れ、逆に日々の値が近いと全セルが最上段に張り付いて
 * 濃淡が消えるため。GitHub の草グラフと同じく**活動があった日だけを対象にした
 * 分位点**で区切ることで、分布がどう偏っていても段階が均等に埋まる。
 *
 * 返すのは段階1..(STEPS-1) の下限値。段階0（活動なし）はしきい値を持たない。
 */
export function intensityThresholds(
  gains: readonly number[],
  steps: number = HEATMAP_INTENSITY_STEPS,
): readonly number[] {
  const active = gains.filter((g) => g > 0).sort((a, b) => a - b);
  if (active.length === 0) return [];

  // 活動段階は 1..steps-1 の (steps-1) 段階。各段階の下限を分位点で取る。
  const activeSteps = steps - 1;
  const thresholds: number[] = [];
  for (let i = 0; i < activeSteps; i += 1) {
    const q = i / activeSteps;
    const idx = Math.min(active.length - 1, Math.floor(q * active.length));
    thresholds.push(active[idx]!);
  }
  return thresholds;
}

/**
 * 1日の獲得EXPを 0..(STEPS-1) の濃度段階に落とす。
 * `gainedExp <= 0` は必ず 0（活動しなかった日を薄い色で塗らない）。
 */
export function intensityOf(
  gainedExp: number,
  thresholds: readonly number[],
): number {
  if (gainedExp <= 0) return 0;
  let level = 1;
  for (let i = 1; i < thresholds.length; i += 1) {
    if (gainedExp >= thresholds[i]!) level = i + 1;
  }
  return level;
}

/** スナップショット配列をヒートマップ用の日配列に変換する。 */
export function buildHeatmapDays(
  history: readonly Snapshot[],
  steps: number = HEATMAP_INTENSITY_STEPS,
): readonly HeatmapDay[] {
  const thresholds = intensityThresholds(
    history.map((s) => s.gainedExp),
    steps,
  );
  return history.map((s) => ({
    date: s.date,
    gainedExp: s.gainedExp,
    intensity: intensityOf(s.gainedExp, thresholds),
  }));
}
