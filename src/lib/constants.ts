// ── 軸順（唯一の定義。レーダー・一覧・凡例はすべてこれを参照する）
export const STATUS_ORDER = [
  "INT", "TECH", "DATA", "MARKETING", "PM", "BRIDGE", "ENGLISH", "LEARNING", "EXECUTION",
] as const;
export const SPECIALTY_ORDER = STATUS_ORDER.slice(0, 7);   // 専門7つ
export const FOUNDATION_ORDER = STATUS_ORDER.slice(7);     // 土台2つ

// ── レベル曲線（04_exp_rules.md §4）
export const LEVEL_THRESHOLDS = [0, 100, 260, 516, 926, 1581, 2630, 4308, 6992, 11287] as const;
export const MAX_LEVEL = 10;

// ── TOTAL Lv（04_exp_rules.md §5）
export const TOTAL_TOP_N = 5;
export const TOTAL_WEIGHT_TOP = 0.6;
export const TOTAL_WEIGHT_ALL = 0.4;

// ── EXP 基礎値・倍率（04_exp_rules.md §1）
export const DIFFICULTY_BASE_EXP = { D1: 10, D2: 25, D3: 60, D4: 150, D5: 400 } as const;
export const NOVELTY_MULTIPLIERS = { first: 1.5, repeat: 1.0, mastered: 0.5 } as const;
export const SUB_STATUS_RATIO = 0.5;          // 副ステータスは 50% 換算
export const DERIVATION_EXP_BONUS = 0.10;     // 派生スキルの常時効果 +10%

// ── 固有スキル《構造化》（07_unique_skill.md §2）
export const SKILL_ACTIVATION_THRESHOLDS = [0, 10, 25, 50, 100, 150, 220, 300, 400, 500] as const;
export const SKILL_MULTIPLIERS = [1.15, 1.20, 1.25, 1.30, 1.35, 1.38, 1.41, 1.44, 1.47, 1.50] as const;
export const MAX_SKILL_LEVEL = 10;
export const STRUCTURE_MIN_INVOLVED = 3;      // 3ステータス以上で発動
export const NO_STRUCTURE_BONUS = 1.0;        // 2つ以下のときの倍率
export const DERIVATIONS = [
  { id: "data-analysis",  name: "《データ分析》",     requires: [{ key: "DATA",   level: 5 }], effect: "DATA" },
  { id: "ai-development", name: "《AI開発》",         requires: [{ key: "TECH",   level: 5 }], effect: "TECH" },
  { id: "system-design",  name: "《システム設計》",   requires: [{ key: "TECH", level: 7 }, { key: "INT", level: 5 }], effect: "TECH" },
  { id: "pm",             name: "《PM》",             requires: [{ key: "PM",     level: 5 }], effect: "PM" },
  { id: "bridge",         name: "《現場との橋渡し》", requires: [{ key: "BRIDGE", level: 5 }], effect: "BRIDGE" },
] as const;                                    // requires は AND 条件（配列全件を満たす）
export const FINAL_CLASS_TOTAL_LEVEL = 9;      // 最終クラスは総合 Lv9 + 全派生解放

// ── HP（06_penalty.md §2）
export const HP_MAX = 100;
export const HP_MIN = 0;
export const HP_PENALTY = {
  dailyMiss: -10, guerrillaExpired: -25, missionFailed: -40, bossFailed: -50,
} as const;
export const HP_RECOVERY = { dailyAllClear: 5, missionCleared: 20, bossCleared: 50 } as const;
// 02_architecture.md §4.6 / §8.2 / §10 Q-5・TODO.md Issue#11・#12 の受け入れ条件が
// hpZone(51→safe/50→warn/26→warn/25→danger/62→safe) を明示しているため、この閾値を正とする。
// 06_penalty.md §7 本文の「71/41」改訂記述は #11 着手時点でこれらの正典と食い違っており未追随。
export const HP_COLOR_THRESHOLDS = { safe: 50, warn: 25 } as const;  // >50 緑 / >25 黄 / <=25 赤
export const HP_INCAPACITATED_BELOW = 10;      // hp < 10 で戦闘不能

// ── EXP 減点（06_penalty.md §2）
export const EXP_PENALTY = {
  dailyMissExecution: -10,
  guerrillaMainRatio: 0.5,      // 主ステ −(基礎値 × 50%)
  guerrillaBridge: -20,
  missionExecutionRatio: 0.3,   // EXECUTION −(予定EXP × 30%)
} as const;

// ── デバフ（重い順に並べる。この配列順が「重さ」の唯一の定義）
export const DEBUFF_ORDER = ["incapacitated", "weakened", "defeated"] as const;
export const DEBUFF_MULTIPLIERS = { incapacitated: 0.5, weakened: 0.8, defeated: 0.9 } as const;
export const DEBUFF_DURATION_DAYS = { incapacitated: 3, weakened: 3, defeated: 7 } as const;
export const DEBUFF_LABELS = { incapacitated: "戦闘不能", weakened: "衰弱", defeated: "敗北" } as const;
export const NO_DEBUFF_MULTIPLIER = 1.0;

// ── クエスト・ストリーク
export const DAILY_QUEST_COUNT = 5;            // 固定5個
export const URGENT_GLOW_WITHIN_DAYS = 3;      // 残り3日未満で赤く発光

// ── 測定期間（07 CALIBRATION）
export const CALIBRATION_TOTAL_DAYS = 14;
export const CALIBRATION_TOTAL_QUESTS = 18;
export const CALIBRATION_INITIAL_LEVEL_RANGE = { min: 1, max: 5 } as const;
export const CALIBRATION_WEIGHTS = { selfReport: 0.4, measured: 0.6 } as const;

// ── 歪みメーター（09_dashboard_spec.md §2.5）
export const BALANCE_GAP_THRESHOLD = 2;
export const BALANCE_MESSAGES = {
  learningHeavy:  "知識が実行を追い越しています。手を動かす量を増やしましょう",
  executionHeavy: "手は動いていますが新しい学びが不足しています",
  balanced:       "学習と実行のバランスが取れています",
} as const;

// ── 成長推移
export const HISTORY_DAYS = 90;
export const HEATMAP_INTENSITY_STEPS = 5;      // 活動0を含む5段階
