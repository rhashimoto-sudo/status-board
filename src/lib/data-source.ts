import "server-only";

import statusMain from "@/data/status.json";
import statusCalib from "@/data/status.calib.json";
import questsData from "@/data/quests.json";
import historyData from "@/data/history.json";
import hallOfFameData from "@/data/hall-of-fame.json";

import type {
  CalibrationProgress,
  DashboardData,
  GameState,
  HallOfFame,
  Phase,
  Snapshot,
  StatusMap,
} from "./types";

// JSON モジュールはリテラル型を保持しないため、この入口でのみ型を付け直す（C-1）。
type RawStatus = {
  generation: number;
  hp: number;
  streak: number;
  statuses: StatusMap;
  debuffs: GameState["debuffs"];
  uniqueSkillActivations: number;
  calibration?: CalibrationProgress;
};

function toGameState(raw: RawStatus, phase: Phase): GameState {
  return {
    phase,
    generation: raw.generation,
    hp: raw.hp,
    streak: raw.streak,
    statuses: raw.statuses,
    debuffs: raw.debuffs,
    uniqueSkillActivations: raw.uniqueSkillActivations,
    calibration: raw.calibration,
  };
}

/** JSON を import し型を付けて返す唯一の入口。phase による分岐はここ1行のみ。 */
export function loadDashboard(phase: Phase): DashboardData {
  const raw = (phase === "calibration" ? statusCalib : statusMain) as RawStatus; // ★分岐はこの1行のみ

  return {
    state: toGameState(raw, phase),
    quests: questsData as DashboardData["quests"],
    history: historyData as readonly Snapshot[],
    hallOfFame: hallOfFameData as HallOfFame,
  };
}
