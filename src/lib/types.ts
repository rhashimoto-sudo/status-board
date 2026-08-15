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
/**
 * `exploration` は「未知に触れること自体が完了条件」の探索枠（00_profile.md §6.4）。
 * デイリー5個のうち必ず1個がこれになる（`DAILY_EXPLORATION_SLOT_COUNT`）。成果を問わない。
 *
 * `main` が `null` のものは**生活基盤のデイリー**（睡眠・運動・スマホ断ちなど）。
 * 9軸はすべて能力軸であり、生活習慣はどこに入れても嘘になるため軸を持たせない
 * （`main` を埋めると、早起きしただけでレーダーの該当軸が伸びて形が意味を失う）。
 * EXP は 0 だが、**ストリーク経由で ⚔️EXECUTION に自動導出される**（03_status_system.md §1.1）。
 * デイリーの本体は EXP ではなくストリークなので、これで機能は落ちない。
 */
export type DailyQuest    = Omit<QuestBase, "main"> & {
  kind: "daily"; main: MainStatusKey | null;
  done: boolean; lockedUntil: string; exploration: boolean;
};
export type GuerrillaQuest= QuestBase & { kind: "guerrilla"; deadline: string; difficulty: Difficulty };
export type ChildQuest    = { id: string; title: string; done: boolean };
/** `difficulty` は完遂時の HP 回復量を決める（`HP_RECOVERY_DIVISOR_BY_DIFFICULTY`）。 */
export type Mission       = QuestBase & { kind: "mission"; deadline: string; difficulty: Difficulty; children: readonly ChildQuest[] };
export type Boss          = QuestBase & { kind: "boss"; deadline: string; hpReward: number };
export type Quest = DailyQuest | GuerrillaQuest | Mission | Boss;

export type DefeatEntry = {
  kind: Exclude<QuestKind, "daily">; name: string; date: string;
  // 符号規約（司令塔確定・Wave 6 ロットB指摘D）: 現状のダミーデータは `hpDamage` を正の値
  // （例 50）、`expDamage[].amount` を負の値（例 -90）で持っており、そのままでは符号が不統一。
  // データ側の符号は矯正せず、表示側（`defeat-log.tsx`）が両方とも `-Math.abs(...)` で
  // 「ダメージ量」として正規化してから描画する契約とする。将来どちらの符号でデータが来ても
  // 表示は必ず「-数値」になり、`expDamage` が正の値で「増加」に見えることはない。
  // データ側で符号を統一する場合はこの型・コメントも合わせて見直すこと。
  hpDamage: number; expDamage: readonly { key: StatusKey; amount: number }[];
  revengeable: boolean;
};

// ── HP・デバフ・ペナルティ
export type HpZone = "safe" | "warn" | "danger";
export type DebuffKind = (typeof DEBUFF_ORDER)[number];    // "incapacitated" | "weakened" | "defeated"
export type Debuff = { kind: DebuffKind; remainingDays: number };
export type HpState = { current: number; max: number; zone: HpZone; incapacitated: boolean };

/**
 * HP 回復イベント（06_penalty.md §2.1）。ペナルティと対になる。
 * ミッションのみ難易度で回復量が変わる（00_profile.md §6.1「取り返す手」）。
 */
export type RecoveryEvent =
  | { kind: "dailyAllClear" }
  | { kind: "missionCleared"; difficulty: Difficulty }
  /** ボスは個別に `hpReward` を持つ。省略時は `HP_RECOVERY.bossCleared`。 */
  | { kind: "bossCleared"; hpReward?: number };

export type RecoveryResult = {
  /** 回復の名目量（クランプ前）。「D5 完遂で +33」のように表示に使う。 */
  hpDelta: number;
  /** 適用後の確定 HP。0..100 にクランプ済み。 */
  nextHp: number;
  /**
   * 上限 100 に阻まれて捨てられた量。名目 − 実効。
   * 回復報酬は傷ついているときほど価値が高いという性質を UI・navigator が扱えるようにする。
   */
  wasted: number;
};

export type PenaltyKind = "dailyMiss" | "guerrillaExpired" | "missionFailed" | "bossFailed";
export type PenaltyResult = {
  /** このペナルティによる HP の増減量（表示用）。クランプされていない生の delta。 */
  hpDelta: number;
  /**
   * EXP の生の増減量。安全装置 S-1（EXPフロア。現Lvの下限累積EXPを下回らせず Lv・称号を下げない）は
   * ここでは適用されていない。消費側は必ず `src/lib/exp.ts` の `applyExpDelta` を通すこと。
   */
  expDeltas: readonly { key: StatusKey; amount: number }[];
  addedDebuff: Debuff | null;
  streakReset: boolean;
  /** 適用後の確定 HP。`clampHp` 適用済みで常に 0〜100（S-2 を型の側で保証する）。 */
  nextHp: number;
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
