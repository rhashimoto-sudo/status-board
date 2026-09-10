import { describe, expect, it } from "vitest";
import {
  applyPenalty,
  applyRecovery,
  clampHp,
  debuffMultiplier,
  gameOver,
  hpZone,
  isGameOver,
  missionRecoveryAmount,
  updateStreak,
} from "@/lib/penalty";
import { HP_MAX, HP_PENALTY, HP_RECOVERY, INITIAL_LEVEL_CAP, STATUS_ORDER } from "@/lib/constants";
import type { DailyQuest, Debuff, Difficulty, GameState, HallOfFame, StatusMap } from "@/lib/types";

const DIFFICULTIES: readonly Difficulty[] = ["D1", "D2", "D3", "D4", "D5"];

function makeStatuses(exp: number): StatusMap {
  return Object.fromEntries(
    STATUS_ORDER.map((key) => [key, { key, exp, measured: true, expThreeMonthsAgo: 0 }]),
  ) as unknown as StatusMap;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "main",
    generation: 1,
    hp: 100,
    streak: 0,
    statuses: makeStatuses(100),
    debuffs: [],
    uniqueSkillActivations: 0,
    levelCap: INITIAL_LEVEL_CAP,
    defeatedGateLevels: [],
    ...overrides,
  };
}

function makeDaily(done: boolean): DailyQuest {
  return {
    id: `d-${Math.random()}`,
    kind: "daily",
    title: "test",
    main: "TECH",
    involvedStatuses: ["TECH"],
    expectedExp: 10,
    done,
    lockedUntil: "2026-01-01T00:00:00.000Z",
    exploration: false,
  };
}

describe("clampHp", () => {
  it("5-25 -> 0（-20にならない）", () => {
    expect(clampHp(5 - 25)).toBe(0);
  });

  it("98+50 -> 100（148にならない）", () => {
    expect(clampHp(98 + 50)).toBe(100);
  });
});

// 正典: 01_requirements.md FR-8-1 / 06_penalty.md §7（緑71〜100 / 黄41〜70 / 赤0〜40。
// 旧案「緑>50/黄>25/赤<=25」は警告が遅すぎるため改訂済みで採用しない）。
describe("hpZone", () => {
  it.each([
    [71, "safe"],
    [70, "warn"],
    [41, "warn"],
    [40, "danger"],
    [62, "warn"],
    [100, "safe"],
    [0, "danger"],
  ] as const)("hp=%i -> %s", (hp, expected) => {
    expect(hpZone(hp)).toBe(expected);
  });
});

describe("debuffMultiplier", () => {
  it("衰弱+敗北が同時 -> 0.8（0.72にならない）", () => {
    const debuffs: Debuff[] = [
      { kind: "weakened", remainingDays: 3 },
      { kind: "defeated", remainingDays: 7 },
    ];
    expect(debuffMultiplier(debuffs)).toBe(0.8);
  });

  it("3種同時 -> 0.5（最も重い戦闘不能のみ）", () => {
    const debuffs: Debuff[] = [
      { kind: "incapacitated", remainingDays: 3 },
      { kind: "weakened", remainingDays: 3 },
      { kind: "defeated", remainingDays: 7 },
    ];
    expect(debuffMultiplier(debuffs)).toBe(0.5);
  });

  it("なし -> 1.0", () => {
    expect(debuffMultiplier([])).toBe(1.0);
  });
});

describe("applyPenalty", () => {
  it("phase:calibration では全種別で hpDelta が0・GAME OVERが発火しない", () => {
    const state = makeState({ phase: "calibration", hp: 5 });
    for (const kind of ["dailyMiss", "guerrillaExpired", "missionFailed", "bossFailed"] as const) {
      const result = applyPenalty(kind, state);
      expect(result.hpDelta).toBe(0);
      expect(result.gameOver).toBe(false);
    }
  });

  it("phase:calibration では全種別で nextHp が clampHp(state.hp) と一致する", () => {
    const state = makeState({ phase: "calibration", hp: 5 });
    for (const kind of ["dailyMiss", "guerrillaExpired", "missionFailed", "bossFailed"] as const) {
      const result = applyPenalty(kind, state);
      expect(result.hpDelta).toBe(0);
      expect(result.nextHp).toBe(clampHp(state.hp));
      expect(result.gameOver).toBe(false);
    }
  });

  it("dailyMiss: HP-10・EXECUTION-10・streakReset", () => {
    const result = applyPenalty("dailyMiss", makeState({ hp: 50 }));
    expect(result.hpDelta).toBe(-10);
    expect(result.expDeltas).toEqual([{ key: "EXECUTION", amount: -10 }]);
    expect(result.streakReset).toBe(true);
  });

  it("dailyMiss: HP5から適用でGAME OVERが発火する", () => {
    const result = applyPenalty("dailyMiss", makeState({ hp: 5 }));
    expect(result.gameOver).toBe(true);
  });

  it("dailyMiss: HP5から適用で hpDelta:-10 と nextHp:0 が両立する（クランプは nextHp のみ）", () => {
    const result = applyPenalty("dailyMiss", makeState({ hp: 5 }));
    expect(result.hpDelta).toBe(-10);
    expect(result.nextHp).toBe(0);
    expect(result.gameOver).toBe(isGameOver(result.nextHp));
  });

  it("guerrillaExpired: 主ステ-(基礎値×50%)・BRIDGE-20・HP-25", () => {
    const result = applyPenalty("guerrillaExpired", makeState({ hp: 50 }), {
      baseExp: 60,
      main: "TECH",
    });
    expect(result.hpDelta).toBe(-25);
    expect(result.expDeltas).toEqual([
      { key: "TECH", amount: -30 },
      { key: "BRIDGE", amount: -20 },
    ]);
    expect(result.nextHp).toBe(25);
    expect(result.gameOver).toBe(isGameOver(result.nextHp));
  });

  it("missionFailed: EXECUTION-(予定EXP×30%)・HP-40", () => {
    const result = applyPenalty("missionFailed", makeState({ hp: 50 }), { expectedExp: 100 });
    expect(result.hpDelta).toBe(-40);
    expect(result.expDeltas).toEqual([{ key: "EXECUTION", amount: -30 }]);
    expect(result.nextHp).toBe(10);
    expect(result.gameOver).toBe(isGameOver(result.nextHp));
  });

  it("bossFailed: EXP減点なし・敗北デバフ付与・HP-50", () => {
    const result = applyPenalty("bossFailed", makeState({ hp: 50 }));
    expect(result.hpDelta).toBe(-50);
    expect(result.expDeltas).toEqual([]);
    expect(result.addedDebuff).toEqual({ kind: "defeated", remainingDays: 7 });
    expect(result.nextHp).toBe(0);
    expect(result.gameOver).toBe(isGameOver(result.nextHp));
  });

  it("bossFailed: HP100から適用で nextHp:50・hpDelta:-50", () => {
    const result = applyPenalty("bossFailed", makeState({ hp: 100 }));
    expect(result.hpDelta).toBe(-50);
    expect(result.nextHp).toBe(50);
    expect(result.gameOver).toBe(isGameOver(result.nextHp));
  });

  it("回復側の境界: clampHp(98+50) === 100 が守られる（HP上限のクランプ確認）", () => {
    expect(clampHp(98 + 50)).toBe(100);
  });
});

describe("isGameOver", () => {
  it("hp<=0でtrue", () => {
    expect(isGameOver(0)).toBe(true);
    expect(isGameOver(1)).toBe(false);
  });
});

describe("gameOver", () => {
  it("全ステータスexp0・HP100・generation+1、既存Hall of Fameエントリが消えず1件増える", () => {
    const state = makeState({ generation: 1, hp: 0, streak: 3, statuses: makeStatuses(500) });
    const hallOfFame: HallOfFame = {
      generation: 1,
      entries: [
        {
          generation: 0,
          maxTotalLevel: 3,
          maxLevels: Object.fromEntries(STATUS_ORDER.map((k) => [k, 3])) as Record<
            (typeof STATUS_ORDER)[number],
            number
          >,
          titles: ["existing"],
          defeatedBosses: [],
          longestStreak: 5,
          survivedDays: 30,
          endedAt: "2026-01-01",
        },
      ],
    };

    const result = gameOver(state, hallOfFame);

    for (const key of STATUS_ORDER) {
      expect(result.state.statuses[key].exp).toBe(0);
    }
    expect(result.state.hp).toBe(100);
    expect(result.state.generation).toBe(2);
    expect(result.hallOfFame.entries).toHaveLength(2);
    expect(result.hallOfFame.entries[0]).toEqual(hallOfFame.entries[0]);
    expect(result.hallOfFame.entries[1].generation).toBe(1);
  });

  it("累積EXPがLv91相当（11287以上）でも levelCap:50 なら maxLevels は50で頭打ちになる", () => {
    const state = makeState({ hp: 0, levelCap: 50, statuses: makeStatuses(11287) });
    const hallOfFame: HallOfFame = { generation: 1, entries: [] };

    const result = gameOver(state, hallOfFame);

    const entry = result.hallOfFame.entries[0]!;
    for (const key of STATUS_ORDER) {
      expect(entry.maxLevels[key]).toBe(50);
    }
    expect(entry.maxTotalLevel).toBe(50);
  });

  it("前世代の expThreeMonthsAgo が残らず0にリセットされる（ゴースト系列の取りこぼし防止）", () => {
    const statuses = Object.fromEntries(
      STATUS_ORDER.map((key) => [key, { key, exp: 500, measured: true, expThreeMonthsAgo: 300 }]),
    ) as unknown as StatusMap;
    const state = makeState({ hp: 0, statuses });
    const hallOfFame: HallOfFame = { generation: 1, entries: [] };

    const result = gameOver(state, hallOfFame);

    for (const key of STATUS_ORDER) {
      expect(result.state.statuses[key].expThreeMonthsAgo).toBe(0);
      expect(result.state.statuses[key].measured).toBe(true);
    }
  });

  it("endedAt は Asia/Tokyo 固定の日付（実行環境のTZに依存しない。UTC変換でずれない）", () => {
    const state = makeState({ hp: 0 });
    const hallOfFame: HallOfFame = { generation: 1, entries: [] };
    // UTC 2026-01-14T16:30:00Z == JST 2026-01-15 01:30（日付がまたぐケース）
    const fixed = new Date("2026-01-14T16:30:00.000Z");
    const originalDate = globalThis.Date;
    class MockDate extends originalDate {
      constructor() {
        super(fixed.getTime());
      }
    }
    // @ts-expect-error テスト用に Date を固定日時にモックする
    globalThis.Date = MockDate;
    try {
      const result = gameOver(state, hallOfFame);
      expect(result.hallOfFame.entries[0].endedAt).toBe("2026-01-15");
    } finally {
      globalThis.Date = originalDate;
    }
  });
});

describe("updateStreak", () => {
  it("5/5 -> +1", () => {
    const dailies = [makeDaily(true), makeDaily(true), makeDaily(true), makeDaily(true), makeDaily(true)];
    expect(updateStreak(dailies, 3)).toBe(4);
  });

  it("4/5 -> 0", () => {
    const dailies = [makeDaily(true), makeDaily(true), makeDaily(true), makeDaily(true), makeDaily(false)];
    expect(updateStreak(dailies, 3)).toBe(0);
  });

  it("件数不一致（データ不整合）は未達と区別してエラーを投げる: 空配列", () => {
    expect(() => updateStreak([], 3)).toThrow();
  });

  it("件数不一致（データ不整合）は未達と区別してエラーを投げる: 全達成でも6件はエラー", () => {
    const dailies = [
      makeDaily(true),
      makeDaily(true),
      makeDaily(true),
      makeDaily(true),
      makeDaily(true),
      makeDaily(true),
    ];
    expect(() => updateStreak(dailies, 3)).toThrow();
  });
});

describe("applyRecovery / missionRecoveryAmount", () => {
  it("難易度が上がるほど回復量が増える（単調増加）", () => {
    const amounts = DIFFICULTIES.map(missionRecoveryAmount);
    expect(amounts).toEqual([5, 10, 20, 25, 33]);
    for (let i = 1; i < amounts.length; i += 1) {
      expect(amounts[i]!).toBeGreaterThan(amounts[i - 1]!);
    }
  });

  it("D3 は従来の固定値 HP_RECOVERY.missionCleared と一致する（中央値の据え置き）", () => {
    expect(missionRecoveryAmount("D3")).toBe(HP_RECOVERY.missionCleared);
  });

  it("最大の回復は常にボス討伐であること（D5 でもボスを超えない）", () => {
    expect(missionRecoveryAmount("D5")).toBeLessThan(HP_RECOVERY.bossCleared);
  });

  it("ミッション完遂は難易度ぶん回復する", () => {
    expect(applyRecovery(50, { kind: "missionCleared", difficulty: "D5" })).toEqual({
      hpDelta: 33,
      nextHp: 83,
      wasted: 0,
    });
  });

  it("HP は 100 を超えない。超過分は wasted に出る", () => {
    const result = applyRecovery(90, { kind: "missionCleared", difficulty: "D5" });
    expect(result.nextHp).toBe(HP_MAX);
    expect(result.hpDelta).toBe(33);
    expect(result.wasted).toBe(23);
  });

  it("満タンでは回復が全部捨てられる（傷ついているほど回復報酬の価値が高い）", () => {
    const result = applyRecovery(HP_MAX, { kind: "missionCleared", difficulty: "D1" });
    expect(result.nextHp).toBe(HP_MAX);
    expect(result.wasted).toBe(result.hpDelta);
  });

  it("デイリー全達成は難易度を持たず固定値", () => {
    expect(applyRecovery(50, { kind: "dailyAllClear" }).nextHp).toBe(50 + HP_RECOVERY.dailyAllClear);
  });

  it("ボスは個別の hpReward を使い、無ければ既定値", () => {
    expect(applyRecovery(0, { kind: "bossCleared", hpReward: 60 }).nextHp).toBe(60);
    expect(applyRecovery(0, { kind: "bossCleared" }).nextHp).toBe(HP_RECOVERY.bossCleared);
  });

  it("失敗側は難易度で開かない: どの難易度でも成功の回復量は missionFailed の減点を下回る", () => {
    // 完遂の回復が未達の減点を上回ると、失敗を繰り返しても HP が減らなくなる。
    for (const d of DIFFICULTIES) {
      expect(missionRecoveryAmount(d)).toBeLessThan(Math.abs(HP_PENALTY.missionFailed));
    }
  });
});
