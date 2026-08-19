// ── 軸順（唯一の定義。レーダー・一覧・凡例はすべてこれを参照する）
export const STATUS_ORDER = [
  "INT", "TECH", "DATA", "MARKETING", "PM", "BRIDGE", "ENGLISH", "LEARNING", "EXECUTION",
] as const;
export const SPECIALTY_ORDER = STATUS_ORDER.slice(0, 7);   // 専門7つ
export const FOUNDATION_ORDER = STATUS_ORDER.slice(7);     // 土台2つ

// ── レベル曲線（04_exp_rules.md §4 / Issue #25 で100段化）
//
// 旧10段 [0,100,260,516,926,1581,2630,4308,6992,11287] を、公比 1.6^(1/10) の等比補間で
// 100段に再分割したもの（10段ごとに旧閾値へ厳密一致）。再計算・再丸めをせずそのまま採用する。
// 旧カンスト11287はLv91にあたり、Lv92〜100は旧設計に存在しなかった領域（新設）。
// EXP側のバランス定数（DIFFICULTY_BASE_EXP等）はこの再分割では変更しない。
export const LEVEL_THRESHOLDS = [
  // Lv1-10
  0, 8, 16, 25, 34, 44, 54, 65, 76, 88,
  // Lv11-20
  100, 113, 126, 140, 155, 171, 187, 204, 222, 240,
  // Lv21-30
  260, 281, 302, 325, 348, 373, 399, 426, 455, 485,
  // Lv31-40
  516, 549, 583, 619, 657, 697, 739, 782, 828, 876,
  // Lv41-50
  926, 979, 1034, 1091, 1152, 1215, 1282, 1351, 1424, 1501,
  // Lv51-60
  1581, 1665, 1753, 1846, 1943, 2044, 2151, 2262, 2379, 2502,
  // Lv61-70
  2630, 2765, 2906, 3053, 3208, 3371, 3541, 3720, 3907, 4103,
  // Lv71-80
  4308, 4523, 4749, 4985, 5233, 5493, 5765, 6051, 6350, 6663,
  // Lv81-90
  6992, 7336, 7698, 8076, 8473, 8888, 9324, 9781, 10259, 10761,
  // Lv91-100（旧カンスト11287=Lv91。Lv92-100は旧設計に存在しなかった領域）
  11287, 11838, 12416, 13021, 13656, 14321, 15018, 15749, 16515, 17318,
] as const;
export const MAX_LEVEL = 100;

/** 称号帯の刻み幅（Lv1〜10を帯1、11〜20を帯2、…という10刻み）。 */
export const TITLE_BAND_SIZE = 10;
/**
 * levelCap のゲート値（この段階まではこのレベルで頭打ち）。
 * ゲート③(Lv90)がその直前（Lv91=旧カンスト11287）に落ちる設計。
 */
export const LEVEL_CAP_GATES = [50, 70, 90, 100] as const;
/** 初期状態の levelCap（ゲート①）。 */
export const INITIAL_LEVEL_CAP = LEVEL_CAP_GATES[0];

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
  { id: "data-analysis",  name: "《データ分析》",     requires: [{ key: "DATA",   level: 50 }], effect: "DATA" },
  { id: "ai-development", name: "《AI開発》",         requires: [{ key: "TECH",   level: 50 }], effect: "TECH" },
  { id: "system-design",  name: "《システム設計》",   requires: [{ key: "TECH", level: 70 }, { key: "INT", level: 50 }], effect: "TECH" },
  { id: "pm",             name: "《PM》",             requires: [{ key: "PM",     level: 50 }], effect: "PM" },
  { id: "bridge",         name: "《現場との橋渡し》", requires: [{ key: "BRIDGE", level: 50 }], effect: "BRIDGE" },
] as const;                                    // requires は AND 条件（配列全件を満たす）
export const FINAL_CLASS_TOTAL_LEVEL = 90;     // 最終クラスは総合 Lv90 + 全派生解放（Issue #25 で100段化に合わせ×10）

// ── work-dashboard のタスク → 9軸の対応（10_notion_schema.md §8）
//
// 原則: `作業種別` =「どの能力を使ったか」→ **主軸**
//       `領域`     =「何の分野か」      → **副軸**
// 領域（SEO/MEO/AI開発）は業務ドメインであって能力ではない。同じ「集計」でも
// SEO でも MEO でも使う力は 📊DATA なので、主軸は必ず作業種別から決める。
//
// この表は work-dashboard の Notion 選択肢と1:1で対応する。向こうに選択肢が
// 増えたらここも足すこと（欠けている値は `null` 扱いになり EXP が付かない）。
//
// `types.ts` は `constants.ts` を import するため、逆向きの import はできない（循環になる）。
// 主軸に使える軸の型は `STATUS_ORDER` から導出する（土台2軸を除いた専門7軸）。
type SpecialtyKey = Exclude<(typeof STATUS_ORDER)[number], "LEARNING" | "EXECUTION">;

export const WORK_TYPE_TO_MAIN_STATUS = {
  "施策立案・設計":     "INT",
  "分析・調査":         "DATA",
  "施策実装":           "MARKETING",
  "開発実装":           "TECH",
  "報告・定例":         "BRIDGE",
  "調整・相談":         "BRIDGE",
  "集計":               "DATA",
  "資料・スライド作成": "MARKETING",
  "AIリライト運用":     "TECH",
  "プロジェクト分解":   "PM",
  // 本人指定（2026-08-15）。組織に向けて発信し足並みを揃える仕事として PM に寄せる。
  // 2026-08-15 時点で Notion 側の選択肢には未反映。向こうに追加が必要。
  "発信・共有":         "PM",
} as const satisfies Record<string, SpecialtyKey>;

// 領域 → 副軸。主軸と重複した場合は副軸なしとして扱う（`deriveStatuses`）。
export const AREA_TO_SUB_STATUS = {
  "SEO":      "MARKETING",
  "MEO":      "MARKETING",
  "店頭改善": "MARKETING",
  "AI開発":   "TECH",
  "その他":   null,
} as const satisfies Record<string, SpecialtyKey | null>;

/**
 * フェーズ完了を 👑PM のクエストとして扱う（10_notion_schema.md §8.2）。
 *
 * 日々のタスク221件を調べたところ、PM が主軸になるのは「プロジェクト分解」だけで、
 * 今年の主戦場の筆頭（00_profile.md §4）である PM がほぼ伸びない状態だった。
 * PM の仕事は「タスクを実行すること」ではなく「タスクを設計し、人を動かし、
 * 期日に着地させること」であり、タスク行ではなく**フェーズの側**に現れるため。
 *
 * 難易度は配下タスク数から決める。`見積工数` は221件すべて未入力で使えない（実測）。
 */
export const PHASE_DIFFICULTY_BY_CHILD_COUNT = [
  { maxChildren: 2,        difficulty: "D2" },
  { maxChildren: 5,        difficulty: "D3" },
  { maxChildren: 10,       difficulty: "D4" },
  { maxChildren: Infinity, difficulty: "D5" },
] as const;

/** 期日内に着地したフェーズの完遂度。遅延した場合はこの値に下げる。 */
export const PHASE_COMPLETION = { onTime: 1.0, late: 0.7 } as const;

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
export const CALIBRATION_TOTAL_QUESTS = 14;
// 上限50 = 初期 levelCap（INITIAL_LEVEL_CAP）と同値。100段化に伴い測定期間の初期レベル幅を
// 引き上げたもので、この上限と INITIAL_LEVEL_CAP は常に同じ値でなければならない
// （片方だけ動かしてはならない。levelCap を変えるならこの上限も同時に変えること）。
export const CALIBRATION_INITIAL_LEVEL_RANGE = { min: 10, max: 50 } as const;
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
