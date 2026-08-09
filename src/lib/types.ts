import { STATUS_ORDER, DERIVATIONS, DEBUFF_ORDER } from "./constants";

// ── ステータス（★ LEARNING / EXECUTION を主・副に選べない型にする）
export type StatusKey = (typeof STATUS_ORDER)[number];
export type SpecialtyStatusKey  = "INT" | "TECH" | "DATA" | "MARKETING" | "PM" | "BRIDGE" | "ENGLISH";
export type FoundationStatusKey = "LEARNING" | "EXECUTION";
export type MainStatusKey = SpecialtyStatusKey;   // クエストが指定できるのは専門7つのみ
export type SubStatusKey  = SpecialtyStatusKey;

export type Status = {
  key: StatusKey;
  exp: number;              // 累積EXP。Lv・称号はここから毎回導出する（永続化しない）
  measured: boolean;        // calibration 中の測定完了フラグ。false → UI は "???"
  expThreeMonthsAgo: number;// レーダーのゴースト系列用
};
export type StatusMap = Readonly<Record<StatusKey, Status>>;

// ── フェーズ
export type Phase = "main" | "calibration";

// ── クエスト
export type QuestKind = "daily" | "guerrilla" | "mission" | "boss";
export type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";
export type Novelty = "first" | "repeat" | "mastered";

export type QuestBase = {
  id: string; kind: QuestKind; title: string;
  main: MainStatusKey; sub?: SubStatusKey;
  involvedStatuses: readonly MainStatusKey[];  // 3つ以上で《構造化》発動（加算先とは別概念）
  expectedExp: number;
};
export type DailyQuest    = QuestBase & { kind: "daily"; done: boolean; lockedUntil: string };
export type GuerrillaQuest= QuestBase & { kind: "guerrilla"; deadline: string; difficulty: Difficulty };
export type ChildQuest    = { id: string; title: string; done: boolean };
export type Mission       = QuestBase & { kind: "mission"; deadline: string; children: readonly ChildQuest[] };
export type Boss          = QuestBase & { kind: "boss"; deadline: string; hpReward: number };
export type Quest = DailyQuest | GuerrillaQuest | Mission | Boss;

export type DefeatEntry = {
  kind: Exclude<QuestKind, "daily">; name: string; date: string;
  hpDamage: number; expDamage: readonly { key: StatusKey; amount: number }[];
  revengeable: boolean;
};

// ── HP・デバフ・ペナルティ
export type HpZone = "safe" | "warn" | "danger";
export type DebuffKind = (typeof DEBUFF_ORDER)[number];    // "incapacitated" | "weakened" | "defeated"
export type Debuff = { kind: DebuffKind; remainingDays: number };
export type HpState = { current: number; max: number; zone: HpZone; incapacitated: boolean };

export type PenaltyKind = "dailyMiss" | "guerrillaExpired" | "missionFailed" | "bossFailed";
export type PenaltyResult = {
  hpDelta: number;
  expDeltas: readonly { key: StatusKey; amount: number }[];
  addedDebuff: Debuff | null;
  streakReset: boolean;
  gameOver: boolean;
};

// ── 固有スキル
export type DerivationId = (typeof DERIVATIONS)[number]["id"];
export type DerivationState = {
  id: DerivationId; name: string; unlocked: boolean;
  requirements: readonly { key: SpecialtyStatusKey; required: number; current: number }[];
};
export type UniqueSkill = {
  activations: number;      // ★Lv は持たない。必ず発動回数から算出する（07 §2.1 の注意）
  level: number; multiplier: number; toNext: number | null;
  derivations: readonly DerivationState[];
};

// ── スナップショット・殿堂
export type Snapshot = {
  date: string;                                   // YYYY-MM-DD
  levels: Readonly<Record<StatusKey, number>>;
  totalLevel: number;
  gainedExp: number;                              // ヒートマップの濃度に使う
};
export type HallOfFameEntry = {
  generation: number; maxTotalLevel: number;
  maxLevels: Readonly<Record<StatusKey, number>>;
  titles: readonly string[]; defeatedBosses: readonly { name: string; date: string }[];
  longestStreak: number; survivedDays: number; endedAt: string;
};
export type HallOfFame = { generation: number; entries: readonly HallOfFameEntry[] };

// ── 画面に渡る最上位の型
export type CalibrationProgress = { day: number; totalDays: number; done: number; totalQuests: number };
export type GameState = {
  phase: Phase; generation: number; hp: number; streak: number;
  statuses: StatusMap; debuffs: readonly Debuff[];
  uniqueSkillActivations: number;
  calibration?: CalibrationProgress;
};
export type DashboardData = {
  state: GameState;
  quests: { dailies: readonly DailyQuest[]; guerrillas: readonly GuerrillaQuest[];
            missions: readonly Mission[]; bosses: readonly Boss[]; defeats: readonly DefeatEntry[] };
  history: readonly Snapshot[];
  hallOfFame: HallOfFame;
};
