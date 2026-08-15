import { describe, expect, it } from "vitest";
import {
  applyPenalty,
  clampHp,
  debuffMultiplier,
  gameOver,
  hpZone,
  isGameOver,
  updateStreak,
} from "@/lib/penalty";
import { STATUS_ORDER } from "@/lib/constants";
import type { DailyQuest, Debuff, GameState, HallOfFame, StatusMap } from "@/lib/types";

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
  });

  it("missionFailed: EXECUTION-(予定EXP×30%)・HP-40", () => {
    const result = applyPenalty("missionFailed", makeState({ hp: 50 }), { expectedExp: 100 });
    expect(result.hpDelta).toBe(-40);
    expect(result.expDeltas).toEqual([{ key: "EXECUTION", amount: -30 }]);
  });

  it("bossFailed: EXP減点なし・敗北デバフ付与・HP-50", () => {
    const result = applyPenalty("bossFailed", makeState({ hp: 50 }));
    expect(result.hpDelta).toBe(-50);
    expect(result.expDeltas).toEqual([]);
    expect(result.addedDebuff).toEqual({ kind: "defeated", remainingDays: 7 });
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
});
