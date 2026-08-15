import { describe, expect, it } from "vitest";
import {
  deriveStatuses,
  isPhaseComplete,
  phaseCompletedDate,
  phaseCompletion,
  phaseDifficulty,
} from "@/lib/work-task";
import {
  AREA_TO_SUB_STATUS,
  PHASE_COMPLETION,
  WORK_TYPE_TO_MAIN_STATUS,
} from "@/lib/constants";

describe("deriveStatuses", () => {
  it("主軸は作業種別から決まる（領域は主軸に影響しない）", () => {
    // 同じ「集計」なら SEO でも MEO でも使う力は DATA。
    expect(deriveStatuses({ workType: "集計", area: "SEO" }).main).toBe("DATA");
    expect(deriveStatuses({ workType: "集計", area: "MEO" }).main).toBe("DATA");
    expect(deriveStatuses({ workType: "集計", area: "AI開発" }).main).toBe("DATA");
  });

  it("副軸は領域から決まる", () => {
    expect(deriveStatuses({ workType: "集計", area: "MEO" }).sub).toBe("MARKETING");
    expect(deriveStatuses({ workType: "調整・相談", area: "AI開発" }).sub).toBe("TECH");
  });

  it("主軸と副軸が同じになる場合は副軸を落とす（実測で最多の AI開発×開発実装）", () => {
    expect(deriveStatuses({ workType: "開発実装", area: "AI開発" })).toEqual({
      main: "TECH",
      sub: null,
    });
  });

  it("領域『その他』は副軸を持たない", () => {
    expect(deriveStatuses({ workType: "集計", area: "その他" }).sub).toBeNull();
  });

  it("未知の作業種別は main:null を返す（適当な軸を割り当てない）", () => {
    expect(deriveStatuses({ workType: "存在しない種別", area: "SEO" })).toEqual({
      main: null,
      sub: null,
    });
    expect(deriveStatuses({ workType: null, area: "SEO" }).main).toBeNull();
  });

  it("未知の領域は副軸なしとして扱う（主軸は生きる）", () => {
    expect(deriveStatuses({ workType: "開発実装", area: "存在しない領域" })).toEqual({
      main: "TECH",
      sub: null,
    });
  });

  it("発信・共有 は PM に対応する（本人指定）", () => {
    expect(deriveStatuses({ workType: "発信・共有", area: "その他" }).main).toBe("PM");
  });

  it("土台2軸（LEARNING / EXECUTION）が主軸・副軸に現れない（03 §1.1 の禁止事項）", () => {
    const foundation = ["LEARNING", "EXECUTION"];
    for (const value of Object.values(WORK_TYPE_TO_MAIN_STATUS)) {
      expect(foundation).not.toContain(value);
    }
    for (const value of Object.values(AREA_TO_SUB_STATUS)) {
      expect(foundation).not.toContain(value);
    }
  });

  it("Notion の作業種別10種すべてに主軸が定義されている（2026-08-15 実測の選択肢）", () => {
    const notionWorkTypes = [
      "施策立案・設計", "分析・調査", "施策実装", "開発実装", "報告・定例",
      "調整・相談", "集計", "資料・スライド作成", "AIリライト運用", "プロジェクト分解",
    ];
    for (const workType of notionWorkTypes) {
      expect(deriveStatuses({ workType, area: null }).main).not.toBeNull();
    }
  });

  it("Notion の領域5種すべてが対応表にある（2026-08-15 実測の選択肢）", () => {
    for (const area of ["店頭改善", "SEO", "MEO", "AI開発", "その他"]) {
      expect(area in AREA_TO_SUB_STATUS).toBe(true);
    }
  });
});

describe("phaseDifficulty", () => {
  it.each([
    [0, "D2"], [2, "D2"],
    [3, "D3"], [5, "D3"],
    [6, "D4"], [10, "D4"],
    [11, "D5"], [100, "D5"],
  ] as const)("配下タスク %i 件 -> %s", (count, expected) => {
    expect(phaseDifficulty(count)).toBe(expected);
  });

  it("配下タスク数に対して単調非減少である", () => {
    const order = ["D1", "D2", "D3", "D4", "D5"];
    let prev = -1;
    for (let n = 0; n <= 30; n += 1) {
      const idx = order.indexOf(phaseDifficulty(n));
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
  });
});

describe("phaseCompletion", () => {
  it("期限内に完了なら満点", () => {
    expect(phaseCompletion("2026-09-15", "2026-09-10")).toBe(PHASE_COMPLETION.onTime);
  });

  it("期限当日の完了は遅延ではない", () => {
    expect(phaseCompletion("2026-09-15", "2026-09-15")).toBe(PHASE_COMPLETION.onTime);
  });

  it("期限を過ぎたら完遂度を下げる", () => {
    expect(phaseCompletion("2026-09-15", "2026-09-16")).toBe(PHASE_COMPLETION.late);
  });

  it("期限未設定は減点しない（約束が無かったものを罰しない）", () => {
    expect(phaseCompletion(null, "2026-09-16")).toBe(PHASE_COMPLETION.onTime);
    expect(phaseCompletion("2026-09-15", null)).toBe(PHASE_COMPLETION.onTime);
  });

  it("年をまたぐ比較でも辞書順で正しく判定できる", () => {
    expect(phaseCompletion("2026-12-31", "2027-01-01")).toBe(PHASE_COMPLETION.late);
    expect(phaseCompletion("2027-01-01", "2026-12-31")).toBe(PHASE_COMPLETION.onTime);
  });
});

describe("isPhaseComplete", () => {
  const c = (done: boolean) => ({ done, completedDate: null });

  it("配下が全完了なら true", () => {
    expect(isPhaseComplete([c(true), c(true), c(true)])).toBe(true);
  });

  it("1件でも未完了なら false", () => {
    expect(isPhaseComplete([c(true), c(false)])).toBe(false);
  });

  it("配下0件は完了扱いにしない（『全部完了』が空虚に真になるのを防ぐ）", () => {
    // 実測（2026-08-15）で配下0件のフェーズが5件あった。完了と見なすと EXP を誤って配る。
    expect(isPhaseComplete([])).toBe(false);
  });
});

describe("phaseCompletedDate", () => {
  it("配下タスクの完了日の最大値を返す（最後の1件が終わった日）", () => {
    expect(
      phaseCompletedDate([
        { done: true, completedDate: "2026-08-01" },
        { done: true, completedDate: "2026-08-12" },
        { done: true, completedDate: "2026-08-05" },
      ]),
    ).toBe("2026-08-12");
  });

  it("完了日を持つ子が無ければ null", () => {
    expect(phaseCompletedDate([{ done: true, completedDate: null }])).toBeNull();
    expect(phaseCompletedDate([])).toBeNull();
  });

  it("年をまたいでも最大値を正しく選ぶ", () => {
    expect(
      phaseCompletedDate([
        { done: true, completedDate: "2027-01-05" },
        { done: true, completedDate: "2026-12-31" },
      ]),
    ).toBe("2027-01-05");
  });
});

// 実測データの回帰（2026-08-15 時点の work-dashboard）。
// フェーズ「口コミ促進」= 配下4件が全完了・最終完了日 2026-08-12・期限 2026-09-30。
describe("実測フェーズ「口コミ促進」の再現", () => {
  const children = [
    { done: true, completedDate: "2026-08-10" },
    { done: true, completedDate: "2026-08-12" },
    { done: true, completedDate: "2026-08-03" },
    { done: true, completedDate: "2026-08-11" },
  ];

  it("完了と判定され、D3・期限内・完遂度1.0 になる", () => {
    expect(isPhaseComplete(children)).toBe(true);
    const completed = phaseCompletedDate(children);
    expect(completed).toBe("2026-08-12");
    expect(phaseDifficulty(children.length)).toBe("D3");
    expect(phaseCompletion("2026-09-30", completed)).toBe(PHASE_COMPLETION.onTime);
  });
});
