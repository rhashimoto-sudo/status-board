import { GATE_BOSSES, INITIAL_LEVEL_CAP, LEVEL_THRESHOLDS, MAX_LEVEL, STATUS_ORDER, TOTAL_TOP_N, TOTAL_WEIGHT_TOP, TOTAL_WEIGHT_ALL, WEAK_AXIS_COUNT } from "./constants";
import type { GateBoss, StatusKey, StatusMap } from "./types";

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

/**
 * levelCap を 1..MAX_LEVEL にクランプする（1未満やMAX_LEVEL超が渡っても壊れないようにする）。
 */
function clampLevelCap(levelCap: number): number {
  return Math.min(MAX_LEVEL, Math.max(1, levelCap));
}

/**
 * exp >= LEVEL_THRESHOLDS[i] を満たす最大の i+1 を実効Lvとして返す（min(算出Lv, levelCap)）。
 *
 * levelCap は任意引数・既定値 MAX_LEVEL。理由: exp.ts の EXP フロア計算は生のLvを必要とし
 * （キャップ後のLvでフロアすると貯蓄が消える）、かつ既定値 MAX_LEVEL はキャップなしと
 * 数学的に等価（no-op）であるため、既定値の存在自体が上限を無効化するわけではない。
 * ただし実効Lvを表示・判定に使う呼び出し元は必ず明示的に cap を渡すこと。
 */
export function levelFromExp(exp: number, levelCap: number = MAX_LEVEL): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return Math.min(clampLevel(level), clampLevelCap(levelCap));
}

/** その Lv の下限累積EXP。 */
export function levelFloorExp(level: number): number {
  const clamped = clampLevel(level);
  return LEVEL_THRESHOLDS[clamped - 1];
}

/**
 * 次Lvまでの残EXP。実Lvが MAX_LEVEL に達したときのみ null。
 *
 * cap 引数は追加しない。生の累積EXPに対する値を返し続けることで、levelCap 到達中も
 * 「貯まっているEXP量」がそのまま画面に見える（S-2の要件）。0 やnullに潰さない。
 */
export function expToNextLevel(exp: number): number | null {
  const level = levelFromExp(exp);
  if (level >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[level] - exp;
}

/**
 * 現Lv内の進捗率 0..1。実Lvが MAX_LEVEL では 1。
 *
 * cap 引数は追加しない。expToNextLevel と同様、生の累積EXPに対する進捗を返し続け、
 * levelCap 到達中も貯蓄の進み具合がそのまま見えるようにする。0 に潰さない。
 */
export function levelProgress(exp: number): number {
  const level = levelFromExp(exp);
  if (level >= MAX_LEVEL) return 1;
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceil = LEVEL_THRESHOLDS[level];
  const progress = (exp - floor) / (ceil - floor);
  return Math.min(1, Math.max(0, progress));
}

/**
 * 9ステータス全ての実効Lv（min(算出Lv, levelCap)）を算出する。
 *
 * levelCap を必須引数にする。集計系関数は渡し忘れると全軸の上限が無言で効かなくなるため。
 */
export function levelsOf(statuses: StatusMap, levelCap: number): Record<StatusKey, number> {
  const result = {} as Record<StatusKey, number>;
  for (const key of STATUS_ORDER) {
    result[key] = levelFromExp(statuses[key].exp, levelCap);
  }
  return result;
}

/**
 * 上位5ステータスの実効Lv平均×0.6 + 全9ステータスの実効Lv平均×0.4。
 * Lv同値の場合は STATUS_ORDER 順で先にあるものを上位5件に優先して採用する（決定的な選択）。
 * 小数第1位に丸めて返す。
 *
 * levelCap を必須引数にする。渡し忘れると全軸の上限が無言で効かなくなるため。
 */
export function computeTotalLevel(statuses: StatusMap, levelCap: number): number {
  const levels = levelsOf(statuses, levelCap);
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

/**
 * 討伐済みゲートボスの unlockLevel 集合から levelCap を導出する（S-2 / 決定2の単一キャップ）。
 *
 * levelCap を状態として持たず毎回導出する理由: 状態として持つと「討伐した事実」と「cap の値」が
 * 二重管理になり、片方だけ書き換えたときに静かに食い違う。原典は討伐済みの集合ひとつだけにする。
 *
 * GATE_BOSSES に存在しない値は無視する（データが壊れても cap が勝手に上がらないようにする）。
 * 空配列・未討伐なら INITIAL_LEVEL_CAP。
 */
export function computeLevelCap(defeatedGateLevels: readonly number[]): number {
  const unlockable = new Set<number>(GATE_BOSSES.map((boss) => boss.unlockLevel));
  const reached = defeatedGateLevels.filter((level) => unlockable.has(level));
  return clampLevelCap(Math.max(INITIAL_LEVEL_CAP, ...reached));
}

/**
 * 現在の levelCap を次に引き上げるゲートボス。すべて討伐済み（cap が最終値）なら null。
 * 「⛔ Lv50 到達。ボス《…》討伐で解放」の《…》はここから引く（画面に名前を直書きしない）。
 */
export function nextGateBoss(levelCap: number): GateBoss | null {
  return GATE_BOSSES.find((boss) => boss.unlockLevel > levelCap) ?? null;
}

/**
 * levelCap に頭打ちされている間に、cap より上へ貯まっている累積EXP（貯蓄量）。
 *
 * 基準は **cap を適用しない生Lv** ではなく cap そのものの下限累積EXP。
 * 「cap の下限からいくら積み上がったか」を返すので、cap が解放された瞬間に
 * その分がそのままLvへ変換される量と一致する。頭打ちしていなければ 0。
 */
export function cappedSavingsExp(exp: number, levelCap: number): number {
  if (levelFromExp(exp) < clampLevelCap(levelCap)) return 0;
  return Math.max(0, exp - levelFloorExp(levelCap));
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
 *
 * levelCap を第2引数の必須引数にする（渡し忘れると全軸の上限が無言で効かなくなるため）。
 * count は第3引数の任意引数へ移す。
 */
export function weakestStatuses(
  statuses: StatusMap,
  levelCap: number,
  count: number = WEAK_AXIS_COUNT,
): readonly { key: StatusKey; level: number }[] {
  const levels = levelsOf(statuses, levelCap);
  const entries = STATUS_ORDER
    .map((key, index) => ({ key, index, level: levels[key], measured: statuses[key].measured }))
    .filter((e) => e.measured);
  const sorted = [...entries].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.index - b.index;
  });
  return sorted.slice(0, count).map(({ key, level }) => ({ key, level }));
}
