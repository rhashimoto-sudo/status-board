import { describe, expect, it, vi } from "vitest";

// data-source.ts は `import "server-only"` を持つ。node 環境の vitest では
// このモジュールが例外を投げるため、テストでは空モジュールに差し替える。
vi.mock("server-only", () => ({}));

import { INITIAL_LEVEL_CAP, STATUS_ORDER } from "@/lib/constants";
import { loadDashboard } from "@/lib/data-source";

// data-source.ts は JSON を `as` でキャストしており、型検査はデータ崩れを捕まえない
// （JSON の widen された型がキャスト先の supertype になるため）。ダミーデータの
// タイポ・キー欠落・種別の書き間違いを typecheck ではなくここで機械的に落とす。
describe("loadDashboard の phase 分岐", () => {
  it('"main" は phase:"main" のデータを返す', () => {
    expect(loadDashboard("main").state.phase).toBe("main");
  });

  it('"calibration" は phase:"calibration" の測定期間データを返す', () => {
    const { state } = loadDashboard("calibration");
    expect(state.phase).toBe("calibration");
    expect(state.calibration).toBeDefined();
  });

  it("main と calibration で別のデータソースを読む", () => {
    const main = loadDashboard("main").state;
    const calib = loadDashboard("calibration").state;
    expect(main.calibration).toBeUndefined();
    expect(calib.calibration).toBeDefined();
  });
});

describe("ダミーデータの形状", () => {
  const phases = ["main", "calibration"] as const;

  for (const phase of phases) {
    describe(`phase="${phase}"`, () => {
      const data = loadDashboard(phase);

      it("statuses に STATUS_ORDER の9キーが過不足なく揃っている", () => {
        expect(Object.keys(data.state.statuses).sort()).toEqual([...STATUS_ORDER].sort());
      });

      it("各ステータスが key/exp/measured を持ち exp が非負の数値である", () => {
        for (const key of STATUS_ORDER) {
          const status = data.state.statuses[key];
          expect(status.key).toBe(key);
          expect(typeof status.exp).toBe("number");
          expect(status.exp).toBeGreaterThanOrEqual(0);
          expect(typeof status.measured).toBe("boolean");
        }
      });

      it("HP が 0..100 に収まっている", () => {
        expect(data.state.hp).toBeGreaterThanOrEqual(0);
        expect(data.state.hp).toBeLessThanOrEqual(100);
      });

      it("quests が5つの配列キーをすべて持つ", () => {
        expect(Object.keys(data.quests).sort()).toEqual([
          "bosses",
          "dailies",
          "defeats",
          "guerrillas",
          "missions",
        ]);
        for (const list of Object.values(data.quests)) {
          expect(Array.isArray(list)).toBe(true);
        }
      });

      it("期限を持つクエストの deadline が解釈可能な日時文字列である", () => {
        for (const quest of [...data.quests.bosses, ...data.quests.guerrillas]) {
          expect(Number.isNaN(Date.parse(quest.deadline))).toBe(false);
        }
      });

      it("history の各スナップショットが9キー分の levels を持つ", () => {
        expect(data.history.length).toBeGreaterThan(0);
        for (const snapshot of data.history) {
          expect(Number.isNaN(Date.parse(snapshot.date))).toBe(false);
          expect(Object.keys(snapshot.levels).sort()).toEqual([...STATUS_ORDER].sort());
        }
      });

      it("hallOfFame が generation と entries を持つ", () => {
        expect(typeof data.hallOfFame.generation).toBe("number");
        expect(Array.isArray(data.hallOfFame.entries)).toBe(true);
      });

      it("levelCap が INITIAL_LEVEL_CAP と同値である", () => {
        expect(data.state.levelCap).toBe(INITIAL_LEVEL_CAP);
      });
    });
  }
});
