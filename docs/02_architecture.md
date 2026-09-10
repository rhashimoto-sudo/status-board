# 02. アーキテクチャ設計（Step 1）

> 本書は **Step 1（ダミーデータで3タブのダッシュボードを完成させ Vercel に公開する）** の構造設計。
> 仕様の正典は `01_requirements.md`（+ `03`〜`07`, `09`, `11`）。本書はそれを**どう配置するか**だけを定める。
> 仕様と矛盾した場合は本書を直す。
>
> **命名規約**: ファイル・ディレクトリは**ケバブケース**、React コンポーネントの export は**パスカルケース**
> （`status-radar.tsx` → `export function StatusRadar()`）。

---

## 1. 全体アーキテクチャ

### 1.1 原則（3行）

1. **JSON を読むのはサーバーコンポーネントだけ。** クライアントは props でしか受け取らない
2. **`setInterval` を持つのは `countdown.tsx` だけ。** 他に時間で動くものを作らない
3. **数値・閾値・文言は `constants.ts` に集約。** コンポーネントとロジックは定数を参照するだけ

### 1.2 構成図

```
                       ┌──────────────────────────────────────────┐
                       │  静的ダミーデータ（ビルド時に同梱）         │
                       │  src/data/                                │
                       │   status.json / status.calib.json         │
                       │   quests.json / history.json              │
                       │   hall-of-fame.json                       │
                       └────────────────┬─────────────────────────┘
                                        │ import（fs も fetch も使わない）
╔═══════════════════════════════════════▼══════════════════════════════════════╗
║  SERVER COMPONENT 領域（"use client" なし / ゼロ JS）                          ║
║                                                                              ║
║   src/lib/data-source.ts   ← JSON を import し型を付けて返す唯一の入口         ║
║        loadDashboard(phase) : DashboardData                                  ║
║                    │  ★ phase による status/status.calib の分岐は「ここだけ」  ║
║                    ▼                                                         ║
║   src/app/page.tsx （phase="main"） / src/app/calibration/page.tsx            ║
║                    │                                                         ║
║                    ▼                                                         ║
║   src/components/dashboard.tsx  ← 3タブの中身を「サーバーで」組み立てる        ║
║        <StatusTab data/>   <MissionTab data/>   <GrowthTab data/>            ║
║        ＋ src/lib/*（level / titles / skill / penalty）で表示値を算出          ║
║                    │                                                         ║
║                    │  ReactNode を props（slot）として渡す                    ║
╚════════════════════│═════════════════════════════════════════════════════════╝
                     ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║  CLIENT COMPONENT 領域（"use client"）                                        ║
║                                                                              ║
║   components/tabs.tsx        state: activeTab のみ。role=tablist / 矢印キー   ║
║        └ 非選択タブは **render しない**（DOM から外す）                        ║
║             ↓ mount されたときだけ子の client が動く                          ║
║   components/mission/countdown.tsx   ← ★ setInterval を持つ唯一のファイル      ║
║        1秒ごとに Date.now() との差分を再計算（自前減算しない・NFR-2）           ║
║   components/status/status-radar.tsx  Recharts RadarChart（state なし）        ║
║   components/growth/growth-chart.tsx  Recharts LineChart（凡例トグル state）   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **境界のルール**
> - `tabs.tsx` は**データを知らない**。`ReactNode` の slot を3つ受け取って出し分けるだけ
>   （サーバーで描いた木をそのまま渡すため、クライアントに JSON 全文が降りない）
> - **非選択タブは DOM に置かない**。`hidden` 属性での隠蔽は不可
>   （`countdown` の `setInterval` が裏で回るため。`09_dashboard_spec.md` §1）
> - Recharts は client だが**時間で動かない**。データは props 固定
> - `src/lib/` の関数は**すべて純粋関数**。`Date.now()` を内部で呼ぶのは `countdown.tsx` のみ

### 1.3 レンダリング方式

| 項目 | 選定 |
|---|---|
| レンダリング | **完全な静的生成（SSG）**。全ページがビルド時に確定する |
| 理由 | 全データが静的 JSON。実行時にサーバー通信を発生させない（NFR-2） |
| 動的機能 | カウントダウンのみ（クライアント側の時刻差分計算） |
| ISR / Route Handler / middleware | **Step 1 では作らない**（Step 3 の Notion 連携で追加する） |

---

## 2. 技術スタック

| カテゴリ | 選定 | 選定理由 |
|---|---|---|
| ランタイム | Node.js v26.3.0 / npm 11.16.0 | 実機確認済み（NFR-1） |
| フレームワーク | **Next.js 15 App Router** | RSC により「JSON を読むのはサーバー」の境界を型と `"use client"` で強制できる。Step 3 で Route Handler を足せる |
| 言語 | **TypeScript**（`strict: true`） | `MainStatusKey` で LEARNING/EXECUTION の混入をコンパイル時に落とすため（S-8）。`strict` を切ると AC-1 の型検査が意味を失う |
| スタイル | **Tailwind CSS v4** | 設計トークン（`11_design_system.md` §3）を `@theme` の CSS 変数で一元化でき、色の混入をレビューしやすい |
| チャート | **Recharts**（RadarChart / LineChart） | 宣言的で `ResponsiveContainer` により 375px 追従が容易。ダーク配色を props でカスタムできる |
| ヒートマップ | **自前SVG**（ライブラリなし） | 週×曜日の格子＋`<title>` だけ。依存を足す価値がない（`09_dashboard_spec.md` §4.2） |
| データ | `src/data/*.json` を **静的 import** | 外部依存ゼロ。型は `data-source.ts` で 1 箇所だけ付ける |
| テスト | **Vitest**（devDependency） | §8 で詳述。AC-3〜AC-9 の境界値を機械的に反復検証するため |
| デプロイ | **Vercel Hobby**（GitHub 連携） | CLI 不要・無料枠（NFR-1） |
| フォント | `ui-monospace` / システム sans（Web フォント追加なし） | `11_design_system.md` §4 が `ui-monospace` 指定。外部フォント読込は初期描画を遅らせるだけ |

### 2.1 導入しないもの（意図的な不採用）

| 不採用 | 理由 |
|---|---|
| 状態管理ライブラリ（Zustand 等） | クライアント状態は「選択中タブ」と「凡例のオン/オフ」の2つだけ。`useState` で足りる |
| UI ライブラリ（shadcn/ui, MUI 等） | 独自の「システムウィンドウ」意匠が中核。既製の意匠を剥がすコストの方が高い |
| 日付ライブラリ（dayjs 等） | 使うのは日数差と ISO 文字列のパースのみ。標準 `Date` で足りる |
| next-themes / ライトモード | **ダーク固定**（`11_design_system.md`）。実装しない |
| API Route / DB / 認証 | Step 1 は読み取り専用・シークレットなし（NFR-3） |

---

## 3. ディレクトリ構成

```
status-board/
├── docs/                              仕様書（正典）
├── src/
│   ├── app/
│   │   ├── layout.tsx                 html lang="ja" / color-scheme:dark 固定 / metadata
│   │   ├── globals.css                Tailwind v4 @import + @theme（設計トークン定義）
│   │   ├── page.tsx                   [server] 通常モード。loadDashboard("main")
│   │   └── calibration/
│   │       └── page.tsx               [server] 測定期間モード。loadDashboard("calibration")
│   │
│   ├── components/
│   │   ├── dashboard.tsx              [server] 3タブの中身を組み立て Tabs に slot で渡す
│   │   ├── tabs.tsx                   [client] activeTab のみ保持。tablist/矢印キー/非選択は非マウント
│   │   ├── calibration-banner.tsx     [server] "CALIBRATION PHASE Day 6/14 18件中8件完了"
│   │   │                                       ※共通ヘッダーではなく各タブ内部に置く
│   │   ├── ui/                        意匠の Atom（データを知らない・props のみ）
│   │   │   ├── panel.tsx              システムウィンドウ枠（角のブラケット装飾＋見出し＋区切り線）
│   │   │   ├── progress-bar.tsx       汎用バー（value/max/色トークン/ラベル）
│   │   │   └── stat-value.tsx         等幅＋tabular-nums の数値表示
│   │   │
│   │   ├── status/                    Tab1「ステータス」
│   │   │   ├── status-tab.tsx         [server] 1〜5 を上から並べる
│   │   │   ├── hero-header.tsx        [server] TOTAL Lv/称号/EXPバー/🔥/♥HP/🔻デバフ
│   │   │   ├── hp-bar.tsx             [server] 緑>50 黄>25 赤<=25。赤のみ発光＋テキスト併記
│   │   │   ├── status-radar.tsx       [client] Recharts RadarChart。9軸固定・最大値10固定・ゴースト
│   │   │   ├── skill-emblem.tsx       [server] 《構造化》紋章。レーダー中心へ絶対配置
│   │   │   ├── unique-skill-panel.tsx [server] Lv/発動回数/残回数/倍率/派生5件
│   │   │   ├── status-list.tsx        [server] STATUS_ORDER 順9件。土台2つの前に区切り線
│   │   │   └── balance-meter.tsx      [server] LEARNING vs EXECUTION 対比バー＋診断文
│   │   │
│   │   ├── mission/                   Tab2「ミッション」
│   │   │   ├── mission-tab.tsx        [server] 1〜4 を上から並べる
│   │   │   ├── urgent-board.tsx       [server] ボス・ゲリラを期限が近い順に整列
│   │   │   ├── countdown.tsx          [client] ★setInterval を持つ唯一のファイル
│   │   │   ├── mission-list.tsx       [server] 進行中ミッション＋子クエスト進捗バー
│   │   │   ├── daily-quests.tsx       [server] 固定5個・🔒ロック・損失の事前明示（読取専用）
│   │   │   └── defeat-log.tsx         [server] 敗北ログ（墓標）
│   │   │
│   │   └── growth/                    Tab3「成長推移」
│   │       ├── growth-tab.tsx         [server] 1〜4 を上から並べる
│   │       ├── growth-chart.tsx       [client] Recharts LineChart。既定3本＋凡例トグル
│   │       ├── activity-heatmap.tsx   [server] 自前SVG。viewBox+width:100% で親幅追従
│   │       ├── gm-learning-panel.tsx  [server] ダミー値＋「Step 5 で実データ化」ラベル
│   │       └── hall-of-fame.tsx       [server] 0件なら「記録なし」＋generation 1 — 生存中
│   │
│   ├── lib/                           純粋関数のみ。React も fs も import しない
│   │   ├── constants.ts               ★全調整値の唯一の置き場（AC-15）
│   │   ├── types.ts                   ★型の唯一の置き場
│   │   ├── titles.ts                  称号テーブル90＋総合10
│   │   ├── level.ts                   Lv判定・進捗・TOTAL Lv
│   │   ├── exp.ts                     EXP計算・配分・floorExp
│   │   ├── penalty.ts                 HP・デバフ・GAME OVER・ストリーク
│   │   ├── skill.ts                   《構造化》Lv・倍率・派生解放・最終クラス
│   │   └── data-source.ts             [server-only] JSON 読込と phase 分岐（唯一）
│   │
│   ├── data/                          静的ダミー（実在の個人情報を含めない・NFR-3）
│   │   ├── status.json                通常モード
│   │   ├── status.calib.json          測定期間モード（phase:"calibration"）
│   │   ├── quests.json                デイリー5/ゲリラ/ミッション/ボス/敗北ログ
│   │   ├── history.json               90日分スナップショット
│   │   └── hall-of-fame.json          { generation: 1, entries: [] }
│   │
│   └── test/                          テストは lib と 1:1 対応（§8）
│       ├── level.test.ts
│       ├── exp.test.ts
│       ├── penalty.test.ts
│       ├── skill.test.ts
│       └── titles.test.ts
│
├── vitest.config.ts
├── tsconfig.json                      strict: true / paths: { "@/*": ["./src/*"] }
├── next.config.ts
└── package.json
```

> **ルール**
> - `src/lib/**` は React / Next / fs を import しない（Node で単体実行できる状態を保つ＝§8 の前提）
> - `src/components/**` は `src/data/**` を直接 import しない。データは必ず props で降りてくる
> - `data-source.ts` の先頭に `import "server-only";` を置き、クライアントからの import をビルドで失敗させる
> - 1ファイル500行以内（`rules/file-design.md`）。超えたらパネル単位で分割する

---

## 4. `src/lib/` 各モジュールの責務と公開シグネチャ

### 4.1 `constants.ts` — 全調整値の集約（AC-15）

**責務**: 数値・閾値・固定順序・定型文言を保持する。ロジックを持たない。他の `src/lib/*` を import しない。

```ts
// ── 軸順（唯一の定義。レーダー・一覧・凡例はすべてこれを参照する）
export const STATUS_ORDER = [
  "INT", "TECH", "DATA", "MARKETING", "PM", "BRIDGE", "ENGLISH", "LEARNING", "EXECUTION",
] as const;
export const SPECIALTY_ORDER = STATUS_ORDER.slice(0, 7);   // 専門7つ
export const FOUNDATION_ORDER = STATUS_ORDER.slice(7);     // 土台2つ

// ── レベル曲線（04_exp_rules.md §4 / Issue #25 で100段化）
// 旧10段 [0,100,260,516,926,1581,2630,4308,6992,11287] を、公比 1.6^(1/10) の等比補間で
// 100段に再分割（10段ごとに旧閾値へ厳密一致）。全100要素は `src/lib/constants.ts` の
// LEVEL_THRESHOLDS を参照。抜粋（10段ごとの値。Lv1=0, Lv10=88, Lv50=1501, Lv91=11287=旧カンスト,
// Lv100=17318）:
export const LEVEL_THRESHOLDS = [
  0, 8, 16, 25, 34, 44, 54, 65, 76, 88,          // Lv1-10
  // …Lv11-90は省略（全量は src/lib/constants.ts を参照）…
  11287,                                          // Lv91（旧カンスト。Lv92-100は新設）
  11838, 12416, 13021, 13656, 14321, 15018, 15749, 16515, 17318, // Lv92-100
] as const;
export const MAX_LEVEL = 100;

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
  { id: "data-analysis",  name: "《データ分析》",     requires: [{ key: "DATA",   level: 50 }], effect: "DATA" },
  { id: "ai-development", name: "《AI開発》",         requires: [{ key: "TECH",   level: 50 }], effect: "TECH" },
  { id: "system-design",  name: "《システム設計》",   requires: [{ key: "TECH", level: 70 }, { key: "INT", level: 50 }], effect: "TECH" },
  { id: "pm",             name: "《PM》",             requires: [{ key: "PM",     level: 50 }], effect: "PM" },
  { id: "bridge",         name: "《現場との橋渡し》", requires: [{ key: "BRIDGE", level: 50 }], effect: "BRIDGE" },
] as const;                                    // requires は AND 条件（配列全件を満たす）
export const FINAL_CLASS_TOTAL_LEVEL = 90;     // 最終クラスは総合 Lv90 + 全派生解放

// ── HP（06_penalty.md §2）
export const HP_MAX = 100;
export const HP_MIN = 0;
export const HP_PENALTY = {
  dailyMiss: -10, guerrillaExpired: -25, missionFailed: -40, bossFailed: -50,
} as const;
export const HP_RECOVERY = { dailyAllClear: 5, missionCleared: 20, bossCleared: 50 } as const;
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
```

> **ルール（AC-15）**: 上記の値をコンポーネント・`src/lib/` の他ファイル・JSON に**再掲しない**。
> 「調整したくなったらこのファイルの1行を直せば済む」状態を維持する。

### 4.2 `types.ts` — 型の集約

**責務**: ドメイン型のみ。値（定数）を持たない。`constants.ts` からのみ import する。

```ts
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
```

> **型で守る不変条件（S-8）**: `MainStatusKey` / `SubStatusKey` は `SpecialtyStatusKey` のエイリアスであり、
> `"LEARNING"` を代入すると**コンパイルエラーになる**。UI 側の選択肢生成も `SPECIALTY_ORDER` から作る。

### 4.3 `titles.ts` — 称号テーブル

**責務**: 90称号＋総合10の保持と引き当て。**文言は `01/03` の表から一字一句変更しない**。

```ts
export const TITLES: Readonly<Record<StatusKey, readonly string[]>>;  // 各10要素・計90
export const TOTAL_TITLES: readonly string[];                         // 10要素

export function titleFor(key: StatusKey, level: number): string;   // level は 1..10 にクランプ
export function totalTitleFor(totalLevel: number): string;         // floor 済み整数を渡す。内部で 1..10 にクランプ
```

> **禁止**: 称号文字列は一意でない（「学習者」「探索者」「推進者」が重複）。
> **称号からステータスを逆引きする実装をしない**。必ず `StatusKey` + `level` の組で扱う。

### 4.4 `level.ts` — Lv 判定・TOTAL Lv

```ts
export function levelFromExp(exp: number): number;            // exp >= 閾値 を満たす最大Lv。上限 MAX_LEVEL
export function levelFloorExp(level: number): number;         // その Lv の下限累積EXP
export function expToNextLevel(exp: number): number | null;   // Lv10 は null（UI は "MAX"）
export function levelProgress(exp: number): number;           // 現Lv内の進捗 0..1。Lv10 は 1
export function levelsOf(statuses: StatusMap): Record<StatusKey, number>;
export function computeTotalLevel(statuses: StatusMap): number;
// 上位5平均×0.6 + 全9平均×0.4。同値は STATUS_ORDER 順で先を優先。小数第1位に丸めて返す
export function totalLevelProgress(totalLevel: number): number;  // 小数部＝ヒーローのEXPバー
```

### 4.5 `exp.ts` — EXP 計算・配分・フロア

```ts
export type ExpInput = {
  difficulty: Difficulty; novelty: Novelty; completion: number;  // 0..1
  structureMultiplier: number;    // skill.ts の structureBonus() の結果を渡す
  debuffMultiplier: number;       // penalty.ts の debuffMultiplier() の結果を渡す
  hasEvidence: boolean;           // false なら常に 0
};
export function calcExp(input: ExpInput): number;               // Math.round で整数化
export function distributeExp(
  exp: number, main: MainStatusKey, sub?: SubStatusKey,
): readonly { key: MainStatusKey; amount: number }[];            // 主100% / 副50%（四捨五入）
export function floorExp(newExp: number, currentLevel: number): number;
// = max(newExp, LEVEL_THRESHOLDS[currentLevel - 1])。負にならず Lv・称号を下げない（S-1）
export function applyExpDelta(status: Status, delta: number): Status;  // 減点時に floorExp を必ず通す
```

> **Step 1 での扱い**: `calcExp` / `distributeExp` は**画面から呼ばない**（Step 3 で GM が使う）。
> 正しさは §8 のテストのみで担保する。呼ばれていないことを理由に実装を省略しない（AC-1 の型検査対象）。

### 4.6 `penalty.ts` — HP・デバフ・GAME OVER

```ts
export function clampHp(hp: number): number;                       // 0..100
export function hpZone(hp: number): HpZone;                        // >50 safe / >25 warn / <=25 danger
export function hpState(hp: number, phase: Phase): HpState;        // calibration は UI 側で "—" 表示
export function strongestDebuff(debuffs: readonly Debuff[]): Debuff | null;  // DEBUFF_ORDER 順で最初の1つ
export function debuffMultiplier(debuffs: readonly Debuff[]): number;        // 乗算しない。1つだけ（S-3）
export function updateStreak(dailies: readonly DailyQuest[], streak: number): number;  // 5/5 のみ +1、他は 0
export function applyPenalty(kind: PenaltyKind, state: GameState, ctx?: {
  baseExp?: number; expectedExp?: number;
}): PenaltyResult;                       // ★ 先頭で phase === "calibration" を判定し即 NO_PENALTY（S-4）
export function isGameOver(hp: number): boolean;                   // hp <= 0
export function gameOver(state: GameState, hof: HallOfFame): { state: GameState; hallOfFame: HallOfFame };
// 1.スナップショット 2.entries に push（既存を消さない） 3.全初期化 4.HP=100 5.generation+1 6.phase は "main" のまま
```

> **ルール**: 測定期間の免除判定は `applyPenalty` の**入口1箇所**に置く。
> ペナルティ種別ごとに書くと必ず漏れる（`06_penalty.md` §4）。

### 4.7 `skill.ts` — 《構造化》と派生

```ts
export function skillLevelFromActivations(activations: number): number;  // >= 判定・上限 10
export function skillMultiplier(skillLevel: number): number;             // SKILL_MULTIPLIERS[lv-1]
export function activationsToNext(activations: number): number | null;   // Lv10 は null
export function skillProgress(activations: number): number;              // 0..1
export function shouldActivate(involvedCount: number): boolean;          // >= 3
export function structureBonus(involvedCount: number, skillLevel: number): number;
// 3未満なら 1.0、3以上なら skillMultiplier(skillLevel)
export function derivationStates(statuses: StatusMap): readonly DerivationState[];
// 解放フラグを永続化せず、毎回ステータスLvから算出する。requires は AND
export function allDerivationsUnlocked(statuses: StatusMap): boolean;
export function isFinalClassReached(totalLevel: number, statuses: StatusMap): boolean;
// floor(totalLevel) >= 9 かつ allDerivationsUnlocked
export function buildUniqueSkill(activations: number, statuses: StatusMap): UniqueSkill;
```

### 4.8 `data-source.ts` — JSON 読込（server-only）

```ts
import "server-only";
export function loadDashboard(phase: Phase): DashboardData;
```

---

## 5. データフロー

```
[ビルド時]
 status.json ─┐
 status.calib.json ─┤
 quests.json ─┼─→ data-source.ts ──→ loadDashboard(phase): DashboardData
 history.json ─┤      ★ phase 分岐はここだけ
 hall-of-fame.json ─┘

[サーバーレンダリング]
 app/page.tsx  (phase="main")            app/calibration/page.tsx (phase="calibration")
        └────────────┬──────────────────────────────┘
                     ▼
              components/dashboard.tsx
                     │  lib/level・titles・skill・penalty で「表示値」をサーバーで確定
                     │  （Lv・称号・倍率・派生解放・HP色・診断文 はここまでで算出済み）
                     ├─→ StatusTab   ← state.statuses / state.hp / state.streak / debuffs / uniqueSkill
                     │      hero-header ← totalLevel, totalTitle, hpState, debuffs, streak
                     │      status-radar[client] ← [{ key, current, ghost }] × 9（STATUS_ORDER 順）
                     │      unique-skill-panel ← UniqueSkill
                     │      status-list ← [{ key, level, title, exp, next, progress }] × 9
                     │      balance-meter ← learningLv, executionLv, diagnosis
                     ├─→ MissionTab  ← quests
                     │      urgent-board ← [bosses, guerrillas] を deadline 昇順で整列
                     │           countdown[client] ← deadline(ISO文字列) のみ
                     │      mission-list / daily-quests / defeat-log
                     └─→ GrowthTab   ← history / hallOfFame
                            growth-chart[client] ← Snapshot[]（既定3系列 + 専門7系列）
                            activity-heatmap ← [{ date, gainedExp, intensity }] × 90
                            gm-learning-panel ← ダミー定数
                            hall-of-fame ← HallOfFame

                     ▼
              components/tabs.tsx [client]  — slot を3つ受け取り、選択中の1つだけを render
```

> **ルール**: Lv・称号・倍率などの**導出値をクライアントで計算しない**。
> サーバーで確定して props に載せる（クライアントバンドルに `src/lib` を含めないため）。
> `countdown.tsx` に渡すのは `deadline` の ISO 文字列だけ。残り時間はクライアントで毎秒再計算する。

---

## 6. モジュール依存マトリクス

行が列を import する（`→` あり）。**上から下への一方向のみ。循環はゼロ。**

| ↓が→を import | constants | types | titles | level | exp | skill | penalty | data-source |
|---|---|---|---|---|---|---|---|---|
| `constants.ts`  | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `types.ts`      | ✓ | — | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `titles.ts`     | ✓ | ✓ | — | ✗ | ✗ | ✗ | ✗ | ✗ |
| `level.ts`      | ✓ | ✓ | ✗ | — | ✗ | ✗ | ✗ | ✗ |
| `exp.ts`        | ✓ | ✓ | ✗ | ✓ | — | ✗ | ✗ | ✗ |
| `skill.ts`      | ✓ | ✓ | ✗ | ✓ | ✗ | — | ✗ | ✗ |
| `penalty.ts`    | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | — | ✗ |
| `data-source.ts`| ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | — |
| `components/**` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| `app/**`        | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

依存の階層（レイヤ番号が小さいものは大きいものを知らない）:

```
L0  constants.ts                      （値のみ・依存ゼロ）
L1  types.ts                          （constants の型抽出のみ）
L2  titles.ts   level.ts              （互いに知らない）
L3  exp.ts      skill.ts              （level に依存。互いに知らない）
L4  penalty.ts                        （level + exp に依存）
L5  data-source.ts                    （server-only。L2 以上に依存しない）
L6  components/**                     （L0〜L4 を読む。data-source は読まない）
L7  app/**                            （data-source と components のみ）
```

> **検証**: `npx madge --circular --extensions ts,tsx src/` で循環ゼロを確認する（`npm run check:cycles`）。
> `isFinalClassReached` を `titles.ts` ではなく `skill.ts` に置くのは、
> `titles → skill → level → titles` の循環を作らないため（`03_status_system.md` §3.2 の記述に対する実装上の配置決定）。

---

## 7. `status.json` / `status.calib.json` の切り替え

### 7.1 採用方式: ルート分離 + `data-source.ts` の1箇所分岐

```ts
// src/lib/data-source.ts — phase を見て JSON を選ぶ「唯一の場所」
import "server-only";
import statusMain  from "@/data/status.json";
import statusCalib from "@/data/status.calib.json";

export function loadDashboard(phase: Phase): DashboardData {
  const raw = phase === "calibration" ? statusCalib : statusMain;   // ★分岐はこの1行のみ
  return { state: toGameState(raw, phase), quests, history, hallOfFame };
}
```

```ts
// src/app/page.tsx              → loadDashboard("main")
// src/app/calibration/page.tsx  → loadDashboard("calibration")
// どちらも <Dashboard data={...} /> を返すだけ（レイアウト・タブ構成は完全に同一）
```

| 項目 | 内容 |
|---|---|
| 分岐箇所 | `data-source.ts` の 1 行のみ。**コンポーネントは `phase` を「見る」が「切り替えない」** |
| コンポーネント側 | `state.phase === "calibration"` を見て描画差分（`???` / `—` / バナー / 紋章の暗転 / デバフ非表示）を出す |
| 確認方法（AC-10） | `npm run dev` して `/` と `/calibration` を開き分ける。再起動・環境変数の設定は不要 |
| 静的性 | 両ルートともビルド時に静的生成される（NFR-2 を維持） |

> **注意**: `state.phase` の分岐を各コンポーネントに散らさない。
> 差分が出るのは **hero-header / status-radar / status-list / unique-skill-panel / 各タブ先頭のバナー** の5箇所のみ
> （`09_dashboard_spec.md` §5 の表がその全量）。それ以外に `phase` を持ち込まない。

### 7.2 検討した代替案とトレードオフ（**docs に記載がないためユーザー確認事項**）

| 案 | 方法 | 利点 | 欠点 |
|---|---|---|---|
| **A（採用）** | ルート分離 `/` と `/calibration` | 完全静的のまま。再起動不要で目視確認できる。実装が最小 | 公開 URL に `/calibration` が残る（Step 3 で削除すれば済む） |
| B | 環境変数 `APP_PHASE` | URL が1本で済む | 切り替えのたびに dev サーバー再起動・再デプロイが必要。AC-10 の確認が重い |
| C | `?phase=calibration`（searchParams） | URL が1本で切り替え可能 | ページが**動的レンダリング**になり NFR-2 の「静的」が崩れる |

> **要確認**: Step 3 で Notion 連携に移行した時点で `phase` は実データ（開始日からの経過日数）で決まるため、
> A の `/calibration` ルートは**Step 1 限りの確認用**として削除する想定。この前提でよいかを確認したい。

---

## 8. 検証方法

### 8.1 決定: **テストランナーとして Vitest を導入する**（スクリプト方式は採らない）

| 判断 | 内容 |
|---|---|
| 採用 | **Vitest**（`devDependencies` のみ。実行時依存・バンドルサイズへの影響ゼロ） |
| 実行 | `npm test`（= `vitest run`） / `npm run test:watch` |
| 対象 | `src/lib/` の純粋関数のみ。**コンポーネントのテストは Step 1 では書かない**（目視確認 AC-2 の範囲） |
| 環境 | `environment: "node"`（DOM 不要）。`tsconfig` の `@/*` エイリアスを `vitest.config.ts` で解決 |

**選定理由**: AC-3〜AC-9 は「境界値で挙動が変わること」を要求しており、
`925/926`・`11286/11287`・`24/25`・`99/100` のような**対になるケースを網羅的に列挙して一括判定**する必要がある。
自作スクリプト（`console.log` して目視）だと、値を1つ足すたびに人間が全出力を読み直すことになり、
`constants.ts` を調整した瞬間に検証がザルになる。終了コードで合否が返るランナーが必要。

**検討した代替案とトレードオフ:**

| 案 | 利点 | 欠点 |
|---|---|---|
| **Vitest（採用）** | 依存1つ。`describe.each` で境界値表をそのまま書ける。ウォッチ実行で調整が速い。CI に載せやすい | devDependency が1つ増える |
| Node 標準 `node --test`（型ストリップ） | 追加依存ゼロ | パスエイリアス `@/*` が効かず import に `.ts` 拡張子が必須になる。`enum` 等の制約がある。実行方法が Next の tsconfig と二重管理になる |
| 自作スクリプト `npm run verify` | 追加依存ゼロ・自由度が高い | 合否判定を自前で書くことになり、結局ミニテストランナーを実装することになる。失敗時の差分表示が貧弱 |

### 8.2 境界値テストの内容（受け入れ条件との対応）

| ファイル | ケース | AC / 検証項目 |
|---|---|---|
| `test/level.test.ts` | `levelFromExp`: 0→1 / 99→1 / 100→2 / **925→4** / **926→5** / 1580→5 / 1581→6 / **11286→9** / **11287→10** / 999999→10 | **AC-3** / E-1・E-2 |
| | `computeTotalLevel`: 式どおり。Lv 同値6件以上でも上位5件の選択が `STATUS_ORDER` 順で決定的 | E-3 / S-5 |
| | `expToNextLevel`: Lv10 で `null`。`levelProgress` が 0..1 に収まる | 4.2 節 |
| `test/exp.test.ts` | `floorExp`: Lv5(940) −50 → **926**（Lv5 のまま） / Lv5(1000) −10 → 990 / Lv1(5) −10 → **0**（負にならない） | **AC-5** / E-4・E-5・P-3・P-4 |
| | `calcExp`: 60×1.5×1.0×1.30×1.0 = **117** / 25×0.5×0.7×1.0×0.8 = **7** / `hasEvidence:false` → **0** | E-8 / 04 §7 |
| | `distributeExp`: 副が 50% 換算で加算される | E-7 |
| `test/penalty.test.ts` | `clampHp`: 5 −25 → **0**（−20 にならない）/ 98 +50 → **100** | **AC-4** / P-1・P-2 |
| | `debuffMultiplier`: 衰弱+敗北 → **0.8**（0.72 にならない）/ 3種同時 → **0.5** / なし → 1.0 | **AC-6** / P-5 |
| | `applyPenalty`: `phase:"calibration"` で全種別 hpDelta **0**・GAME OVER 発火なし | P-6 |
| | `gameOver`: 全ステータス exp 0 / HP 100 / `generation` +1 / 既存 HoF エントリが**消えず1件増える** | **AC-7** / P-7・P-8 |
| | `updateStreak`: 5/5 → +1、**4/5 → 0** | **AC-12** / P-9 |
| | `hpZone`: 51→safe / 50→warn / 26→warn / 25→danger / **62→safe** | 06 §7 |
| `test/skill.test.ts` | `skillLevelFromActivations`: 0→1 / 9→1 / 10→2 / **24→2** / **25→3** / 49→3 / 50→4 / **99→4** / **100→5** / 500→10 / 9999→10 | **AC-8** / U-1〜U-4 |
| | `structureBonus`: 関与2 → **1.0** / 関与3 → Skill Lv の倍率 | U-5 |
| | `derivationStates`: TECH7・INT4 →《システム設計》未解放 / TECH7・INT5 → 解放（**AND 条件**） | **AC-9** / U-6 |
| | `isFinalClassReached`: TOTAL Lv9 でも派生5種未解放なら **false** | U-8 / S-7 |
| `test/titles.test.ts` | 9キー×10件=**90件**、総合10件。INT Lv5「論理家」/ TECH Lv10「AIマスター」/ BRIDGE Lv1「聞き手」 | S-1・S-3 |
| | Lv0・Lv11 で例外を投げず両端の称号を返す（クランプ） | S-4 |
| | 重複称号（学習者・探索者・推進者）が**そのまま残っている** | S-10 |

### 8.3 型・ビルド・その他の検証

| # | 対象 | コマンド / 手順 |
|---|---|---|
| AC-1 | ビルド・型 | `npm run build`（`next build` は型検査を含む）。`npm run typecheck`（`tsc --noEmit`） |
| S-8 | 型の禁止 | `test/types.test-d.ts` に `// @ts-expect-error` 付きで `const k: MainStatusKey = "LEARNING"` を置き、**型エラーが出ないことを逆に失敗**とする（`tsc --noEmit` で検出） |
| — | 循環依存 | `npm run check:cycles`（`madge --circular --extensions ts,tsx src/`） |
| AC-2 | 3タブ表示 | `npm run dev` → Chrome で `/` の3タブを開く |
| AC-10 | 測定期間 | `/calibration` を開き、レーダー `???`・HP `—`・進行バナーを確認 |
| AC-11 | カウントダウン | `/` の Tab2 で秒が減ることを 5 秒以上観察。残り2日のゲリラが赤く発光することを確認 |
| AC-13 | レスポンシブ | DevTools で 375 / 768 / 1024 / 1440px。各幅で `document.documentElement.scrollWidth <= clientWidth` を確認 |
| AC-14 | 配色・発光 | `globals.css` の `@theme` に定義した色以外のリテラル色が使われていないことを grep で確認（`#` 直書きの検索）。`box-shadow` の出現箇所がカウントダウンと HP 危険域の2つだけであることを確認 |
| AC-15 | 定数管理 | `src/components/` を grep し、レベル閾値・HP 増減値・デバフ倍率・スキル閾値の**数値リテラルが出現しない**ことを確認 |

### 8.4 npm scripts

```jsonc
{
  "dev":          "next dev",
  "build":        "next build",
  "start":        "next start",
  "typecheck":    "tsc --noEmit",
  "test":         "vitest run",
  "test:watch":   "vitest",
  "check:cycles": "madge --circular --extensions ts,tsx src/",
  "verify":       "npm run typecheck && npm run test && npm run build"   // 完了宣言の前に必ず通す
}
```

---

## 9. 設計上の制約（実装時に必ず守ること）

| # | 制約 | 根拠 |
|---|---|---|
| C-1 | `src/data/*.json` を import してよいのは `data-source.ts` **だけ** | データ源の一元化 |
| C-2 | `"use client"` を付けてよいのは `tabs.tsx` / `countdown.tsx` / `status-radar.tsx` / `growth-chart.tsx` の**4つだけ**。増やすときは本書を更新する | ゼロ JS を既定に保つ |
| C-3 | `setInterval` / `setTimeout` を書いてよいのは `countdown.tsx` **のみ**。アンマウント時に `clearInterval` する | NFR-2 / D-4 |
| C-4 | カウントダウンは毎秒 `Date` の差分を**再計算**する。前回値から減算しない | NFR-2（タブ非表示時のズレ） |
| C-5 | Lv・称号・倍率・派生解放は**永続化しない**。累積EXP / 発動回数から毎回導出する | 06 §5・07 §4.2 |
| C-6 | ダミー JSON に `level` フィールドを持たせない（《構造化》も `activations` のみ。Lv4 表示が必要なら **52回**にする） | 07 §2.1 の注意 |
| C-7 | EXP 減点は必ず `floorExp()` を通す。生の減算を書かない | AC-5 / S-1 |
| C-8 | デバフは配列を乗算しない。`strongestDebuff()` で1つに絞ってから掛ける | AC-6 / S-3 |
| C-9 | 測定期間の免除は `applyPenalty` の**入口1箇所**。種別ごとに書かない | 06 §4 |
| C-10 | 軸順は `STATUS_ORDER` のみを参照。コンポーネント内で配列をハードコードしない | 03 §1 / S-2 |
| C-11 | レーダーの軸最大値は **10 固定**。データに応じて自動調整しない | 09 §2.2 |
| C-12 | 未測定は `null` / `measured:false` で表現する。**データに `"???"` という文字列を入れない** | 03 §4 |
| C-13 | 共通ヘッダー・固定の緊急バーを作らない。測定期間バナーは**各タブの内部**に置く | FR-8 / 09 §1・§5 |
| C-14 | 非選択タブは `hidden` ではなく**アンマウント**する | 09 §1 |
| C-15 | `box-shadow` によるグローはカウントダウン（残り3日未満）と HP 危険域の**2箇所のみ** | 11 §6 / AC-14 |
| C-16 | `prefers-reduced-motion: reduce` でパルスを止め、静的な赤にする | NFR-4 |
| C-17 | シアン `#22d3ee` × バイオレット `#8b5cf6` + 状態色以外を追加しない。色は `globals.css` の `@theme` トークン経由でのみ使う | 11 §3 / AC-14 |
| C-18 | Lv・EXP・HP・カウントダウン・発動回数・日数は等幅 + `tabular-nums` | 11 §4 |
| C-19 | `outline: none` 単独を書かない。`focus-visible` で 2px シアンのリングを出す | NFR-4 |
| C-20 | 固定 px 幅のチャートを作らない（`ResponsiveContainer` / `viewBox`+`width:100%`）。375px で横スクロールを出さない | AC-13 / D-10 |
| ~~C-21~~ | ~~デイリーのチェックは操作できない（読み取り専用）~~ → **撤回**（下記 C-21' に置換） | 09 §3.3 |
| C-21' | デイリーのチェック**のみ**書き込み可。他に書き込み導線を作らない。押しても HP・ストリーク・EXP は変わらない（日次ジョブの責務） | 10 §5 |
| C-22 | チャート実装に着手する前に `dataviz` スキルを読む | 01 NFR-6 / 09 §柱書 |
| C-23 | 1ファイル500行以内。超えたらパネル単位で分割する | `rules/file-design.md` |

---

## 10. 本書で確定させた「docs に記載がなかった」判断（ユーザー確認事項）

| # | 論点 | 本書の決定 | 代替案 |
|---|---|---|---|
| Q-1 | phase の切り替え方式 | ルート分離 `/` と `/calibration`（§7.1） | 環境変数 / searchParams（§7.2） |
| Q-2 | 検証手段 | **Vitest を導入**（§8.1） | `node --test` / 自作スクリプト |
| Q-3 | `isFinalClassReached` の配置 | `skill.ts`（`titles.ts` だと循環するため） | — |
| Q-4 | client 境界 | `tabs` / `countdown` / `status-radar` / `growth-chart` の4つのみ | — |
| Q-5 | HP 62 の色 | **緑（safe）**。`06_penalty.md` §7 の判断に従う（FR-9 の「黄色域」記述とは食い違うが、閾値側を正とする） | 緑の閾値を `hp > 70` に変更する |
| Q-6 | 《構造化》のダミー値 | **発動 52回 → Lv4 / ×1.30**。`07_unique_skill.md` §2.1 の推奨に従う（FR-9 の「38回」は採らない） | 閾値テーブル側を変更する |

> Q-5 / Q-6 は既存 docs 間の食い違いに対する**追認**であり、本書で新たに決めたものではない。
> Q-1 / Q-2 は docs に記載がなく、本書で新規に決定した。着手前にユーザー承認を得ること。
