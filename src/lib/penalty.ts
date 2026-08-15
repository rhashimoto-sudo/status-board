import {
  DAILY_QUEST_COUNT,
  DEBUFF_DURATION_DAYS,
  DEBUFF_MULTIPLIERS,
  DEBUFF_ORDER,
  EXP_PENALTY,
  HP_COLOR_THRESHOLDS,
  HP_INCAPACITATED_BELOW,
  HP_MAX,
  HP_MIN,
  HP_PENALTY,
  NO_DEBUFF_MULTIPLIER,
  STATUS_ORDER,
} from "./constants";
import { computeTotalLevel, levelsOf } from "./level";
import type {
  Debuff,
  DailyQuest,
  GameState,
  HallOfFame,
  HallOfFameEntry,
  HpState,
  HpZone,
  MainStatusKey,
  Phase,
  PenaltyKind,
  PenaltyResult,
  StatusMap,
} from "./types";

/** 06_penalty.md §2「HPは 0..100 でクランプする」（S-2 / AC-4）。 */
export function clampHp(hp: number): number {
  return Math.min(HP_MAX, Math.max(HP_MIN, hp));
}

/** 06_penalty.md §7: HP_COLOR_THRESHOLDS を境界に safe/warn/danger を返す。 */
export function hpZone(hp: number): HpZone {
  if (hp > HP_COLOR_THRESHOLDS.safe) return "safe";
  if (hp > HP_COLOR_THRESHOLDS.warn) return "warn";
  return "danger";
}

/**
 * HP の表示状態をまとめて返す。calibration 中の "—" 表示切り替えは UI 側の責務のため、
 * ここでは常に実際の HP から算出した値を返す（phase は将来の分岐余地として受け取るのみ）。
 */
export function hpState(hp: number, phase: Phase): HpState {
  void phase;
  const current = clampHp(hp);
  return {
    current,
    max: HP_MAX,
    zone: hpZone(current),
    incapacitated: current < HP_INCAPACITATED_BELOW,
  };
}

/** DEBUFF_ORDER（重い順）で最初に該当する1件だけを返す（S-3 / C-8）。 */
export function strongestDebuff(debuffs: readonly Debuff[]): Debuff | null {
  for (const kind of DEBUFF_ORDER) {
    const found = debuffs.find((d) => d.kind === kind);
    if (found) return found;
  }
  return null;
}

/** デバフは乗算しない。最も重い1つの倍率だけを返す（AC-6 / S-3）。 */
export function debuffMultiplier(debuffs: readonly Debuff[]): number {
  const strongest = strongestDebuff(debuffs);
  return strongest ? DEBUFF_MULTIPLIERS[strongest.kind] : NO_DEBUFF_MULTIPLIER;
}

/**
 * デイリー5/5 達成時のみ +1、それ以外（1つでも未達）は 0 にリセットする（AC-12）。
 * デイリーは「毎日固定5個」（01_requirements.md §デイリー）が前提のため、
 * dailies.length が DAILY_QUEST_COUNT と一致しないのは「未達」ではなくデータ不整合
 * （読み込み中・件数ずれ等）である。これを未達と同一視して無条件にストリークを 0 にすると、
 * 全達成していてもデータ不整合のタイミングでストリークが消えうるため、明確に区別してエラーとして
 * 停止させる（安全に倒す。ストリークを黙って据え置く/据え置かないの判断を呼び出し側に押し付けない）。
 */
export function updateStreak(dailies: readonly DailyQuest[], streak: number): number {
  if (dailies.length !== DAILY_QUEST_COUNT) {
    throw new Error(
      `updateStreak: dailies.length must be ${DAILY_QUEST_COUNT} (got ${dailies.length}) — データ不整合`,
    );
  }
  const allClear = dailies.every((d) => d.done);
  return allClear ? streak + 1 : 0;
}

/** HP が 0 に到達したか（クランプ後の値で判定する）。 */
export function isGameOver(hp: number): boolean {
  return hp <= 0;
}

/**
 * 06_penalty.md §2 のペナルティ表を適用する。
 * S-4（測定期間の免除）は入口1箇所でのみ判定する（C-9）。
 */
export function applyPenalty(
  kind: PenaltyKind,
  state: GameState,
  ctx?: { baseExp?: number; expectedExp?: number; main?: MainStatusKey },
): PenaltyResult {
  if (state.phase === "calibration") {
    // ★ S-4: 判定は必ずここだけ。免除中でも「現在の HP」は正しく返す。
    return {
      hpDelta: 0,
      expDeltas: [],
      addedDebuff: null,
      streakReset: false,
      nextHp: clampHp(state.hp),
      gameOver: false,
    };
  }

  switch (kind) {
    case "dailyMiss": {
      const hpDelta = HP_PENALTY.dailyMiss;
      const nextHp = clampHp(state.hp + hpDelta);
      return {
        hpDelta,
        expDeltas: [{ key: "EXECUTION", amount: EXP_PENALTY.dailyMissExecution }],
        addedDebuff: null,
        streakReset: true,
        nextHp,
        gameOver: isGameOver(nextHp),
      };
    }
    case "guerrillaExpired": {
      const hpDelta = HP_PENALTY.guerrillaExpired;
      const nextHp = clampHp(state.hp + hpDelta);
      const baseExp = ctx?.baseExp ?? 0;
      const expDeltas: { key: MainStatusKey; amount: number }[] = [];
      if (ctx?.main) {
        expDeltas.push({
          key: ctx.main,
          amount: -Math.round(baseExp * EXP_PENALTY.guerrillaMainRatio),
        });
      }
      expDeltas.push({ key: "BRIDGE", amount: EXP_PENALTY.guerrillaBridge });
      return {
        hpDelta,
        expDeltas,
        addedDebuff: null,
        streakReset: false,
        nextHp,
        gameOver: isGameOver(nextHp),
      };
    }
    case "missionFailed": {
      const hpDelta = HP_PENALTY.missionFailed;
      const nextHp = clampHp(state.hp + hpDelta);
      const expectedExp = ctx?.expectedExp ?? 0;
      return {
        hpDelta,
        expDeltas: [
          { key: "EXECUTION", amount: -Math.round(expectedExp * EXP_PENALTY.missionExecutionRatio) },
        ],
        addedDebuff: null,
        streakReset: false,
        nextHp,
        gameOver: isGameOver(nextHp),
      };
    }
    case "bossFailed": {
      const hpDelta = HP_PENALTY.bossFailed;
      const nextHp = clampHp(state.hp + hpDelta);
      return {
        hpDelta,
        expDeltas: [],
        addedDebuff: { kind: "defeated", remainingDays: DEBUFF_DURATION_DAYS.defeated },
        streakReset: false,
        nextHp,
        gameOver: isGameOver(nextHp),
      };
    }
  }
}

/** ローカルタイムゾーンで `YYYY-MM-DD` を生成する（`toISOString` はUTCになりJST深夜にずれるため使わない）。 */
function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 06_penalty.md §5.3 の手順で GAME OVER を処理する。
 * 1.スナップショット 2.entries に push（既存を消さない） 3.全初期化 4.HP=100 5.generation+1 6.phase は "main" のまま
 */
export function gameOver(state: GameState, hallOfFame: HallOfFame): { state: GameState; hallOfFame: HallOfFame } {
  const entry: HallOfFameEntry = {
    generation: state.generation,
    maxTotalLevel: computeTotalLevel(state.statuses),
    maxLevels: levelsOf(state.statuses),
    titles: [],
    defeatedBosses: [],
    longestStreak: state.streak,
    survivedDays: 0,
    endedAt: localDateString(new Date()),
  };

  // §5.1 は exp/Lv/称号だけでなく「実績・進行中クエストの進捗」も初期化対象とする。
  // expThreeMonthsAgo（レーダーのゴースト系列）を前世代の値のまま残すと、消えた前世代の形を
  // 描き続けてしまうため exp と同じく 0 にする。measured は §5.3 手順6「phase は "main" のまま
  // （測定期間には戻らない）」により、新生成も main フェーズの通常表示（"???" にはならない）
  // という前提のため true に戻す（calibration に戻らない以上 false は意味を持たない）。
  const resetStatuses = Object.fromEntries(
    STATUS_ORDER.map((key) => [
      key,
      { ...state.statuses[key], exp: 0, expThreeMonthsAgo: 0, measured: true },
    ]),
  ) as unknown as StatusMap;

  const nextState: GameState = {
    ...state,
    phase: "main",
    generation: state.generation + 1,
    hp: HP_MAX,
    streak: 0,
    statuses: resetStatuses,
    debuffs: [],
    uniqueSkillActivations: 0,
  };

  const nextHallOfFame: HallOfFame = {
    generation: nextState.generation,
    entries: [...hallOfFame.entries, entry],
  };

  return { state: nextState, hallOfFame: nextHallOfFame };
}
