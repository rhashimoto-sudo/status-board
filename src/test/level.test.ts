import { describe, expect, it } from "vitest";
import {
  computeTotalLevel,
  expToNextLevel,
  levelFloorExp,
  levelFromExp,
  levelProgress,
  levelsOf,
  totalLevelProgress,
  weakestStatuses,
  computeLevelCap,
  nextGateBoss,
  cappedSavingsExp,
} from "@/lib/level";
import { DERIVATIONS, FINAL_CLASS_TOTAL_LEVEL, GATE_BOSSES, INITIAL_LEVEL_CAP, LEVEL_CAP_GATES, LEVEL_THRESHOLDS, MAX_LEVEL, STATUS_ORDER } from "@/lib/constants";
import type { Status, StatusKey, StatusMap } from "@/lib/types";

function makeStatusMap(expByKey: Partial<Record<StatusKey, number>>): StatusMap {
  const map = {} as Record<StatusKey, Status>;
  for (const key of STATUS_ORDER) {
    map[key] = {
      key,
      exp: expByKey[key] ?? 0,
      measured: true,
      expThreeMonthsAgo: 0,
    };
  }
  return map;
}

// 旧10段スケール（100段化前の正典。移行の検算に使う唯一のマジックナンバー群）
const OLD_LEVEL_THRESHOLDS = [0, 100, 260, 516, 926, 1581, 2630, 4308, 6992, 11287];

describe("LEVEL_THRESHOLDS（100段スケールの構造）", () => {
  it("length は 100", () => {
    expect(LEVEL_THRESHOLDS.length).toBe(100);
  });

  it.each(OLD_LEVEL_THRESHOLDS.map((value, k) => [k, value] as const))(
    "LEVEL_THRESHOLDS[10*%i] は旧閾値 %i と一致する",
    (k, expected) => {
      expect(LEVEL_THRESHOLDS[10 * k]).toBe(expected);
    },
  );

  it("全99区間で単調増加する", () => {
    for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeLessThan(LEVEL_THRESHOLDS[i + 1]);
    }
  });
});

describe("levelFromExp", () => {
  it.each([
    [0, 1],
    [8, 2],
    [7, 1],
    [11287, 91],
    [17318, 100],
    [999999, 100],
  ])("exp=%i -> Lv%i", (exp, expected) => {
    expect(levelFromExp(exp)).toBe(expected);
  });
});

describe("levelFromExp の cap の効き", () => {
  it("累積EXPがLv91相当でも cap=50 なら実効Lvは50に頭打ちになる", () => {
    expect(levelFromExp(11287)).toBe(91); // cap なし（生Lv相当）
    expect(levelFromExp(11287, 50)).toBe(50);
  });

  it("cap を50→70に上げると貯蓄分で一気に70まで上がる", () => {
    const exp = 11287; // Lv91相当の貯蓄
    expect(levelFromExp(exp, 50)).toBe(50);
    expect(levelFromExp(exp, 70)).toBe(70);
  });

  it("cap が範囲外（0以下・MAX_LEVEL超）でもクランプされて壊れない", () => {
    expect(levelFromExp(999999, 0)).toBe(1);
    expect(levelFromExp(999999, -10)).toBe(1);
    expect(levelFromExp(999999, MAX_LEVEL + 50)).toBe(MAX_LEVEL);
  });
});

describe("cap到達中も levelProgress/expToNextLevel が 0/null に潰れない", () => {
  // 実Lv91相当（cap=50の画面では実効Lvは50に見えるが、貯蓄自体は生きている）
  const floorOfLv91 = LEVEL_THRESHOLDS[90];
  const ceilOfLv91 = LEVEL_THRESHOLDS[91];
  const midOfLv91 = Math.round((floorOfLv91 + ceilOfLv91) / 2);

  it("expToNextLevel は次の閾値までの残りを返す（null にならない）", () => {
    expect(levelFromExp(midOfLv91, 50)).toBe(50); // 実効Lvはcapで頭打ち
    expect(levelFromExp(midOfLv91)).toBe(91); // 生Lvは91のまま
    expect(expToNextLevel(midOfLv91)).toBe(ceilOfLv91 - midOfLv91);
    expect(expToNextLevel(midOfLv91)).not.toBeNull();
  });

  it("levelProgress は生のLv内進捗を返す（0 に潰れない）", () => {
    const progress = levelProgress(midOfLv91);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it("expToNextLevel が null を返すのは実Lvが MAX_LEVEL に達したときだけ", () => {
    const floorOfLv99 = LEVEL_THRESHOLDS[98];
    expect(levelFromExp(floorOfLv99)).toBe(99);
    expect(expToNextLevel(floorOfLv99)).not.toBeNull();

    const floorOfLv100 = LEVEL_THRESHOLDS[99];
    expect(levelFromExp(floorOfLv100)).toBe(MAX_LEVEL);
    expect(expToNextLevel(floorOfLv100)).toBeNull();
    expect(expToNextLevel(999999)).toBeNull();
  });
});

describe("levelProgress", () => {
  it("常に 0..1 の範囲に収まる", () => {
    for (const exp of [0, 50, 99, 100, 500, 925, 926, 11286, 11287, 17318, 999999]) {
      const progress = levelProgress(exp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it("Lv内の下限では 0 に近い", () => {
    expect(levelProgress(LEVEL_THRESHOLDS[1])).toBe(0);
  });

  it("実Lvが MAX_LEVEL では 1 を返す", () => {
    expect(levelProgress(LEVEL_THRESHOLDS[99])).toBe(1);
    expect(levelProgress(999999)).toBe(1);
  });
});

describe("levelFloorExp", () => {
  it.each([
    [1, LEVEL_THRESHOLDS[0]],
    [2, LEVEL_THRESHOLDS[1]],
    [5, LEVEL_THRESHOLDS[4]],
    [91, LEVEL_THRESHOLDS[90]],
    [100, LEVEL_THRESHOLDS[99]],
  ])("Lv%i の下限累積EXPは %i", (level, expected) => {
    expect(levelFloorExp(level)).toBe(expected);
  });

  it("範囲外の Lv はクランプする", () => {
    expect(levelFloorExp(0)).toBe(LEVEL_THRESHOLDS[0]);
    expect(levelFloorExp(MAX_LEVEL + 1)).toBe(LEVEL_THRESHOLDS[MAX_LEVEL - 1]);
  });
});

describe("levelsOf", () => {
  it("9ステータス全ての実効Lvを cap ありで算出する", () => {
    const statuses = makeStatusMap({ INT: LEVEL_THRESHOLDS[1], TECH: LEVEL_THRESHOLDS[4] });
    const levels = levelsOf(statuses, MAX_LEVEL);
    expect(levels.INT).toBe(2);
    expect(levels.TECH).toBe(5);
    expect(levels.DATA).toBe(1);
  });

  it("levelCap が効いて全軸が頭打ちになる", () => {
    const statuses = makeStatusMap({ INT: LEVEL_THRESHOLDS[90] }); // 実Lv91相当
    const levels = levelsOf(statuses, 50);
    expect(levels.INT).toBe(50);
  });
});

describe("computeTotalLevel", () => {
  it("全ステータスLv1のとき TOTAL Lv 1.0", () => {
    const statuses = makeStatusMap({});
    expect(computeTotalLevel(statuses, MAX_LEVEL)).toBe(1.0);
  });

  it("上位5平均×0.6 + 全9平均×0.4 の式どおりに計算する", () => {
    // Lv構成（STATUS_ORDER順）: INT10 TECH9 DATA8 MARKETING7 PM6 BRIDGE5 ENGLISH4 LEARNING3 EXECUTION2
    const statuses = makeStatusMap({
      INT: levelFloorExp(10),
      TECH: levelFloorExp(9),
      DATA: levelFloorExp(8),
      MARKETING: levelFloorExp(7),
      PM: levelFloorExp(6),
      BRIDGE: levelFloorExp(5),
      ENGLISH: levelFloorExp(4),
      LEARNING: levelFloorExp(3),
      EXECUTION: levelFloorExp(2),
    });
    // 上位5: 10,9,8,7,6 -> 平均8 / 全9: (10+9+8+7+6+5+4+3+2)/9 = 54/9 = 6
    const expected = Math.round((8 * 0.6 + 6 * 0.4) * 10) / 10;
    expect(computeTotalLevel(statuses, MAX_LEVEL)).toBe(expected);
    expect(computeTotalLevel(statuses, MAX_LEVEL)).toBe(7.2);
  });

  it("小数第1位まで保持する", () => {
    const statuses = makeStatusMap({
      INT: levelFloorExp(3),
    });
    const total = computeTotalLevel(statuses, MAX_LEVEL);
    expect(Number.isInteger(total * 10)).toBe(true);
  });

  it("Lv同値が6件以上あっても選択が決定的（複数回呼んでも同じ結果）", () => {
    // 9ステータス中6件が同一Lv(5)で並ぶケース
    const statuses = makeStatusMap({
      INT: levelFloorExp(5),
      TECH: levelFloorExp(5),
      DATA: levelFloorExp(5),
      MARKETING: levelFloorExp(5),
      PM: levelFloorExp(5),
      BRIDGE: levelFloorExp(5),
      ENGLISH: levelFloorExp(3),
      LEARNING: levelFloorExp(2),
      EXECUTION: levelFloorExp(1),
    });
    const results = Array.from({ length: 10 }, () => computeTotalLevel(statuses, MAX_LEVEL));
    expect(new Set(results).size).toBe(1);
    // 上位5(全て同値5の中から5件): 平均5 / 全9平均: (5*6+3+2+1)/9 = 36/9 = 4
    expect(results[0]).toBe(Math.round((5 * 0.6 + 4 * 0.4) * 10) / 10);
  });

  it("levelCap が効いて全軸が頭打ちになった状態で計算する", () => {
    const statuses = makeStatusMap({ INT: LEVEL_THRESHOLDS[90] }); // 実Lv91相当、他はLv1
    // cap=50: INTは50、他8軸はLv1 -> 上位5: 50,1,1,1,1 平均10.8 / 全9平均: (50+1*8)/9 = 58/9 = 6.444...
    const total = computeTotalLevel(statuses, 50);
    const topAvg = (50 + 1 * 4) / 5; // 上位5: INT(50)+STATUS_ORDER順の次点4件(いずれもLv1)
    const allAvg = (50 + 1 * 8) / 9; // 全9: INT(50)+残り8件(いずれもLv1)
    const expected = Math.round((topAvg * 0.6 + allAvg * 0.4) * 10) / 10;
    expect(total).toBe(expected);
  });
});

describe("levelProgress と expToNextLevel の分母一致（status-list.tsx のバー/テキスト表示の根拠）", () => {
  // status-list.tsx はバー(levelProgress)とテキスト(expToNextLevel)を同じLv帯から算出する。
  // 恒等式 floor + progress * (ceil - floor) + remaining === ceil が常に成り立つことを固定する。
  it.each([
    [LEVEL_THRESHOLDS[0], 1],
    [LEVEL_THRESHOLDS[1] - 1, 1],
    [LEVEL_THRESHOLDS[1], 2],
    [LEVEL_THRESHOLDS[4] - 1, 4],
    [LEVEL_THRESHOLDS[4], 5],
    [LEVEL_THRESHOLDS[5] - 1, 5],
    [LEVEL_THRESHOLDS[5], 6],
  ])("exp=%i (Lv%i) でバーとテキストの分母が一致する", (exp, expectedLevel) => {
    expect(levelFromExp(exp)).toBe(expectedLevel);

    const progress = levelProgress(exp);
    const remaining = expToNextLevel(exp);
    expect(remaining).not.toBeNull();

    const floor = levelFloorExp(expectedLevel);
    const ceil = exp + remaining!; // = 次Lvの累積閾値（テキスト側が使う値）
    // 恒等式: floor + progress*(ceil-floor) + remaining === ceil（バーとテキストが同じLv帯を参照する証明）
    expect(floor + progress * (ceil - floor) + remaining!).toBeCloseTo(ceil, 10);
  });

  it("実Lvが MAX_LEVEL では expToNextLevel が null、levelProgress が 1 を返す", () => {
    expect(levelFromExp(LEVEL_THRESHOLDS[99])).toBe(MAX_LEVEL);
    expect(expToNextLevel(LEVEL_THRESHOLDS[99])).toBeNull();
    expect(levelProgress(LEVEL_THRESHOLDS[99])).toBe(1);
  });
});

describe("totalLevelProgress", () => {
  it("小数部を 0..1 で返す", () => {
    expect(totalLevelProgress(4.2)).toBeCloseTo(0.2);
    expect(totalLevelProgress(5.0)).toBe(0);
    expect(totalLevelProgress(10.0)).toBe(0);
  });
});

describe("weakestStatuses", () => {
  const mk = (levels: Partial<Record<StatusKey, number>>, measured = true): StatusMap => {
    const out = {} as Record<StatusKey, { key: StatusKey; exp: number; measured: boolean; expThreeMonthsAgo: number }>;
    for (const key of STATUS_ORDER) {
      const lv = levels[key] ?? 1;
      out[key] = { key, exp: levelFloorExp(lv), measured, expThreeMonthsAgo: 0 };
    }
    return out as StatusMap;
  };

  it("最も Lv の低い2軸を返す", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    expect(weakestStatuses(s, MAX_LEVEL).map((w) => w.key)).toEqual(["BRIDGE", "ENGLISH"]);
  });

  it("同値のときは STATUS_ORDER 順で決定的に選ぶ", () => {
    const s = mk({}); // 全て Lv1
    expect(weakestStatuses(s, MAX_LEVEL).map((w) => w.key)).toEqual([STATUS_ORDER[0], STATUS_ORDER[1]]);
  });

  it("未測定の軸は対象から外す", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    const partial = { ...s, BRIDGE: { ...s.BRIDGE, measured: false } } as StatusMap;
    expect(weakestStatuses(partial, MAX_LEVEL).map((w) => w.key)).not.toContain("BRIDGE");
  });

  it("count で本数を変えられる", () => {
    const s = mk({ INT: 5, TECH: 4, DATA: 5, MARKETING: 3, PM: 3, BRIDGE: 2, ENGLISH: 2, LEARNING: 4, EXECUTION: 3 });
    expect(weakestStatuses(s, MAX_LEVEL, 3)).toHaveLength(3);
  });

  it("levelCap が効いて頭打ちの軸同士が同値扱いになる", () => {
    // INT/TECHが実Lv91相当まで貯蓄していても cap=50 では両方50止まりで並ぶ
    const s = makeStatusMap({ INT: LEVEL_THRESHOLDS[90], TECH: LEVEL_THRESHOLDS[95] });
    const result = weakestStatuses(s, 50, 9);
    const int = result.find((r) => r.key === "INT")!;
    const tech = result.find((r) => r.key === "TECH")!;
    expect(int.level).toBe(50);
    expect(tech.level).toBe(50);
  });
});

describe("派生解放・最終クラスの閾値定数（100段化に追随）", () => {
  it("派生解放の要求Lvはすべて50または70のいずれか（Lv50/70ゲートで切り替わる）", () => {
    const requiredLevels = DERIVATIONS.flatMap((d) => d.requires.map((r) => r.level));
    expect(requiredLevels.length).toBeGreaterThan(0);
    for (const level of requiredLevels) {
      expect([50, 70]).toContain(level);
    }
  });

  it("最終クラスは TOTAL Lv90 で判定される", () => {
    expect(FINAL_CLASS_TOTAL_LEVEL).toBe(90);
  });
});

/**
 * S-2: levelCap を引き上げる唯一の経路（ゲートボス討伐）。
 *
 * 決定5「ゲートは Lv50/70/90（初期キャップ Lv50）」の 50 は**初期キャップ**であって
 * ボスの解放先ではない。この読みでないと Lv100 に到達する経路が存在しなくなる。
 */
describe("computeLevelCap / nextGateBoss", () => {
  it("未討伐なら INITIAL_LEVEL_CAP のまま", () => {
    expect(computeLevelCap([])).toBe(INITIAL_LEVEL_CAP);
    expect(INITIAL_LEVEL_CAP).toBe(50);
  });

  it("ゲートボス3体の解放先は 70 / 90 / 100 で、LEVEL_CAP_GATES の2番目以降と一致する", () => {
    expect(GATE_BOSSES.map((boss) => boss.unlockLevel)).toEqual([70, 90, 100]);
    expect(GATE_BOSSES.map((boss) => boss.unlockLevel)).toEqual([...LEVEL_CAP_GATES].slice(1));
    expect(GATE_BOSSES).toHaveLength(3);   // 決定6: 今年の合格条件3つと1対1
  });

  it("討伐した分だけ 50 → 70 → 90 → 100 と上がる", () => {
    expect(computeLevelCap([70])).toBe(70);
    expect(computeLevelCap([70, 90])).toBe(90);
    expect(computeLevelCap([70, 90, 100])).toBe(100);
  });

  it("討伐順が前後しても、到達済みの最大値が cap になる", () => {
    expect(computeLevelCap([90, 70])).toBe(90);
    expect(computeLevelCap([100])).toBe(100);
  });

  it("GATE_BOSSES に無い値は無視する（データが壊れても cap が勝手に上がらない）", () => {
    expect(computeLevelCap([65])).toBe(INITIAL_LEVEL_CAP);
    expect(computeLevelCap([999])).toBe(INITIAL_LEVEL_CAP);
    expect(computeLevelCap([70, 999])).toBe(70);
  });

  it("cap は MAX_LEVEL を超えない", () => {
    expect(computeLevelCap([70, 90, 100])).toBeLessThanOrEqual(MAX_LEVEL);
  });

  it("nextGateBoss は現 cap を次に引き上げるボスを返し、最終到達後は null", () => {
    expect(nextGateBoss(50)?.unlockLevel).toBe(70);
    expect(nextGateBoss(70)?.unlockLevel).toBe(90);
    expect(nextGateBoss(90)?.unlockLevel).toBe(100);
    expect(nextGateBoss(100)).toBeNull();
  });

  it("nextGateBoss の名前は GATE_BOSSES 由来（画面に直書きしない）", () => {
    expect(nextGateBoss(50)?.name).toBe(GATE_BOSSES[0].name);
  });
});

describe("cappedSavingsExp（キャップ中の貯蓄量）", () => {
  it("頭打ちしていなければ 0", () => {
    expect(cappedSavingsExp(LEVEL_THRESHOLDS[40], 50)).toBe(0);   // Lv41 < cap50
  });

  it("cap 到達後は cap の下限累積EXPからの超過分を返す", () => {
    const floor50 = LEVEL_THRESHOLDS[49];                          // Lv50 の下限
    expect(cappedSavingsExp(floor50, 50)).toBe(0);
    expect(cappedSavingsExp(floor50 + 300, 50)).toBe(300);
  });

  it("cap が上がると同じ累積EXPでも貯蓄は解消される（Lvへ変換される）", () => {
    const exp = LEVEL_THRESHOLDS[49] + 300;
    expect(cappedSavingsExp(exp, 50)).toBeGreaterThan(0);
    expect(cappedSavingsExp(exp, 70)).toBe(0);
  });

  it("cap 済みLvではなく生Lvで到達を判定する（cap済みLvだと到達を検出できない）", () => {
    const exp = LEVEL_THRESHOLDS[69];            // 生Lv70・cap50 なら実効Lv50
    expect(levelFromExp(exp, 50)).toBe(50);
    expect(cappedSavingsExp(exp, 50)).toBe(exp - LEVEL_THRESHOLDS[49]);
  });
});
