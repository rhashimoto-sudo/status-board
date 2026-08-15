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
/** ヒーローと一覧で「最も薄い軸」として強調する本数（CLAUDE.md の弱点可視化）。 */
export const WEAK_AXIS_COUNT = 2;
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
/**
 * ミッション完遂時の HP 回復量を難易度で変える（00_profile.md §6.1 / 12_rewards.md）。
 * 値は「HP_MAX の何分の1か」を表す除数。実回復量は `Math.round(HP_MAX / divisor)`。
 *
 * 設計の前提:
 * - D3 = 1/5 = 20 は `HP_RECOVERY.missionCleared` の従来値。**中央値として据え置き**、
 *   その上下に開く。これで既存のバランス前提を壊さない
 * - `DIFFICULTY_BASE_EXP`（10/25/60/150/400）の指数曲線は**使えない**。
 *   EXP は青天井だが HP は 100 の器であり、D5 を指数で伸ばすと1回で全快して
 *   ペナルティが無力化するため、意図的に緩やかな曲線にしている
 * - 上限は `bossCleared: 50` を超えない（ボス討伐が常に最大の回復であること）
 * - 失敗側（`HP_PENALTY.missionFailed`）は難易度で開かない。固定のままにすることで
 *   「難しいほどリスク調整後の期待値が良い」傾斜が生まれる（D1は成功率89%、D5は55%で損益分岐）
 */
export const HP_RECOVERY_DIVISOR_BY_DIFFICULTY = {
  D1: 20, D2: 10, D3: 5, D4: 4, D5: 3,
} as const;                                    // → +5 / +10 / +20 / +25 / +33
// 06_penalty.md §7「改訂の経緯（確定済み）」: 旧案 >50緑/>25黄/<=25赤 は警告が遅すぎるため改訂。
// 現行: 71〜100 緑（safe）/ 41〜70 黄（warn）/ 0〜40 赤（danger）。旧案の 50/25 は使わない。
export const HP_COLOR_THRESHOLDS = { safe: 70, warn: 40 } as const;  // >70 緑 / >40 黄 / <=40 赤
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
/**
 * デイリー5個のうち「探索枠」の個数（00_profile.md §6.4）。
 *
 * 🔥好奇心・探索 は本人の**長期の起爆剤**だが、合格条件から逆算したクエストは
 * すべて既知の課題になりがちで、放っておくと探索が締め出される。枠として確保する。
 *
 * 探索枠は**未知に触れること自体が完了条件**であり、成果を問わない
 * （新規性が高く出るため 🔥LEARNING に自然に効く）。
 * `quest-designer` はこの個数を必ず満たすこと。0 にしてはならない。
 */
export const DAILY_EXPLORATION_SLOT_COUNT = 1;
export const URGENT_GLOW_WITHIN_DAYS = 3;      // 残り3日未満で赤く発光

// ── 表示タイムゾーン（司令塔確定。docs/10_notion_schema.md:64 は未確定のためここで固定する）
// 本プロジェクトは日本語の個人用ダッシュボードであり、ローカル開発（JST）と
// Vercel の Node ランタイム（UTC）で曜日・日付の表示が変わらないことを要件とする。
export const DISPLAY_TIME_ZONE = "Asia/Tokyo" as const;

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
/** 乖離の趨勢（3ヶ月前との比較）。差そのものではなく「縮まっているか」を伝える。 */
export const BALANCE_TREND_MESSAGES = {
  narrowing: "縮小中",
  widening:  "拡大中",
  flat:      "横ばい",
} as const;

// ── 成長推移
export const HISTORY_DAYS = 90;
export const HEATMAP_INTENSITY_STEPS = 5;      // 活動0を含む5段階

// ── 背景のネットワークアニメーション（11_design_system.md 追記分） ──
// 見た目の調整値。コンポーネントに直書きしない。
export const NETWORK_BG = {
  /** ノード密度。10000px² あたりの個数。画面が広いほどノードが増える。 */
  densityPer10kPx: 0.9,
  /** ノード数の上限（低性能端末とバッテリーの保護）。 */
  maxNodes: 90,
  /** 線を張る最大距離(px)。近いノード同士だけが繋がる。 */
  linkDistance: 130,
  /** ノードの移動速度(px/秒)。ゆっくり漂う程度に留める。 */
  speed: 12,
  /** ノードの半径(px)。 */
  nodeRadius: 1.4,
  /** 線の最大不透明度（距離が近いほど濃い）。 */
  linkOpacity: 0.22,
  /** ノードの不透明度。 */
  nodeOpacity: 0.55,
} as const;

/**
 * 背景の system frame（ソロレベリング風のステータスウィンドウ枠）。
 * ゆっくり拡大・収縮して「呼吸している」ように見せる。
 */
export const SYSTEM_FRAME = {
  /** 画面端からの余白の割合（短辺基準）。小さいほど枠が外側に広がる。 */
  insetRatio: 0.06,
  /** 呼吸1周期の秒数。 */
  breathSeconds: 7,
  /** 拡大の最大倍率（1.0 = 等倍）。 */
  breathScale: 1.06,
  /** 枠線の不透明度。 */
  strokeOpacity: 0.8,
  /** 枠線の太さ(px)。 */
  lineWidth: 2,
  /** Canvas 内の発光半径(px)。CSS の影プロパティは使わない。 */
  glowBlur: 20,
  /** 四隅ブラケットの腕の長さ(px)。 */
  cornerLength: 64,
  /** 左右に並ぶ装飾チップの本数と厚み。 */
  chipCount: 3,
  chipThickness: 5,
} as const;
