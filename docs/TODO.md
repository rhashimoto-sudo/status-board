# TODO - status-board（自分RPG ステータスボード）

> セッション復帰用の一時ファイル。完了したタスクは docs/WORK_LOG/ に記録した後に行ごと削除する。
> 作業履歴は docs/WORK_LOG/ を参照。
>
> planner/coordinator が Issue を割り当てた後は、`### Wave N` 見出しでグループ分けする
> （Wave は依存順序の保証とレビューの区切りであり、同時実行を意味しない。実行は常に1件ずつ）。
> 各進行中タスクには個別に `状態: {ブランチ名} / {次の一手}` を付ける。

作成日: 2026-08-09

## 進行中
- [ ] **Wave 6 完了。Wave 7（Issue #20〜#22）の着手指示待ち**
  - 状態: Wave 6 の全8 Issue（#12〜#19）+ 各種指摘修正まで合体済み（`ee0b763`）。
    `npm run verify` 通過 / Tests **153 passed / 7ファイル** / `check:cycles` 循環0件（madge 46ファイル）
  - **375px 実測（AC-13）は司令塔がタブごとに分離してブラウザで実施済み。**
    Tab1 / Tab2 / Tab3 とも、コンテナが `flex` でも **`grid`** でも `scrollWidth` **375**・
    はみ出し要素 **0件**（全 DOM 走査）
  - Tab3 は凡例を**実際にクリック**して 3 → 4 → **10系列**の切替を確認。
    最大10系列でも 375px で溢れない（凡例は `flex-wrap` で3行に折り返す）。
    ヒートマップは `viewBox` + `width:100%` で親幅に追従（320→288 / 375→343 / 768→736）
  - 次の一手: **Wave 7（#20 status-tab / #21 mission-tab / #22 growth-tab）**の着手指示を待つ。
    3 Issue は相互に独立・ファイル重複なしなので並列実行できる
- [ ] **Wave 7 への申し送り（着手時に必ず worker へ伝えること）**
  1. **タブのコンテナに grid を使う場合は必ず `minmax(0,1fr)`。** 素の `1fr` や暗黙トラックだと
     grid アイテムの `min-width:auto` によりパネルが min-content 未満に縮めず横あふれが再発する
     （#overflow375b で実測。`docs/WORK_LOG/2026-08-15-overflow375b.md`）
  2. **`ActivityHeatmap` の `intensity` は呼び出し側が算出する契約。**
     `HEATMAP_INTENSITY_STEPS`（5段階）へのマッピングを **Issue #22（`growth-tab.tsx`）で実装する**
  3. ロットA・ロットBで API が変わっている。`HeroHeader` は
     `totalLevel: number | null` / `totalTitle: string | null`、`UniqueSkillPanel` は
     `totalLevel: number | null` を追加で受け取り、`StatusRadar` は `centerSlot?: ReactNode`
     （ここに `SkillEmblem` を渡す）
  4. 日付を扱う場合は `src/lib/datetime.ts`（`Asia/Tokyo` 固定）を使い、
     `new Date(iso).getDay()` 等のランタイム TZ 依存 API を使わない
- [x] **タブ構成は現行仕様のまま維持（ユーザー確定・変更しない）**
  - 情報アーキテクチャのレビューで出た3案（デイリー/ボスへの HP 遷移 `♥ 62 → 52` の併記 /
    Tab3 の GM学習状況・殿堂を折りたたみに降格 / 敗北ログを Tab2 → Tab3 へ移動）は
    **すべて却下**。`docs/09_dashboard_spec.md` は現行のまま。実装も仕様書改訂も行わない
  - Tab2 = 緊急ボード / 進行中ミッション / 本日のデイリー / 敗北ログ の4ブロック
  - Tab3 = 折れ線 / ヒートマップ / GM学習状況 / 殿堂 の4ブロック
  - `09_dashboard_spec.md:22`「HP・ストリーク・TOTAL Lv は Tab1 のヒーローヘッダーにのみ存在し
    他タブには出さない」も維持。**4つ目のタブは作らない**（375px でタブバーが 65px 溢れ
    AC-11 と本文16px規約に衝突するため）
  - **ロットB・ロットC はこの現行仕様どおりに実装すること**
- [ ] **ロットC（#18〜#19）は未着手**（ロットA・ロットB は完了・記録済み）
  - Wave 6 の実行単位はユーザー承認済みの3ロット。ロット内は並列、ロット間は逐次。
    各ロットの合体後にレビュー区切りを入れる
- [ ] **`/spec-sync` で是正する docs の追随漏れ（全Wave完了後）**
  - **`03_status_system.md` §5 の表と ASCII 例が自己矛盾している**（#statuslist-progress で判明）。
    表は「EXPバー | **現Lv内の進捗率**。`現在値 / 次Lv閾値` と次Lvまでの残りを等幅で併記」と
    1行の中でバー（帯内）とテキスト（累積）に別の分母を指定しており、
    直上の ASCII 例 `████████████▁▁▁▁▁▁ 1120 / 1581 (461)` の充填 約67% も
    帯内進捗 29.6% ではなく累積比 70.8% に一致している。
    **ユーザー確定方針**（バー = 帯内進捗 / テキスト = 「次まで n EXP」）に合わせて
    表と ASCII 例の両方を書き直す（例は充填 29.6% 相当 + `次まで 461 EXP`）
  - **`09_dashboard_spec.md:153` の損失予告の例が `🔥27日` を含んでいる**（ロットBで判明）。
    同 `:22`「HP・ストリーク・TOTAL Lv は Tab1 のヒーローヘッダーにのみ存在し他タブには出さない」と
    衝突する。ルールとして明記された :22 を優先した実装に合わせ、例から日数を除く
  - **タイムゾーンの正典化**（ロットBで判明）。`10_notion_schema.md:64` は
    「スナップショットの取得時刻・タイムゾーン | 未確定」のままだが、実装は司令塔判断で
    **`Asia/Tokyo` 固定**（`constants.ts` の `DISPLAY_TIME_ZONE`、`src/lib/datetime.ts` 経由）とした。
    根拠は日本語の個人用ダッシュボードであることと、ローカル開発（JST）と Vercel（UTC）で
    表示が変わらないことが要件（AC-10 と同じ思想）。これを docs に確定記載する
  - 旧 HP 閾値「緑 `>50` / 黄 `>25` / 赤 `<=25`」が
    `02_architecture.md:244,452,659` と `09_dashboard_spec.md:62` に残っている。
    正典は `01_requirements.md:367-371`（FR-8-1）と `06_penalty.md` §7 の 71/41/0-40
  - `02_architecture.md` の `applyPenalty` 宣言に、実装で追加した `ctx.main?: MainStatusKey` と
    戻り値の `nextHp` が反映されていない

## Step 1 スコープ外として確定した残作業（着手しない・記録のみ）

> Wave 4 バリアの `/code-review` と Codex セカンドレビューで検出し、
> **ユーザー判断で Step 1 のスコープ外**と確定したもの。Step 1 は
> `src/data/*.json` の静的ダミー表示のみで EXP 計算を画面から呼ばないため実害はない。

- [ ] 🔥LEARNING / ⚔️EXECUTION の自動導出が実装されていない
  - `01_requirements.md` FR-1-1・`03_status_system.md` L41・`04_exp_rules.md` §3 は
    「専門7つの副産物として自動導出」「手入力を許すと歪みメーターの検知が壊れる」と定めているが、
    `02_architecture.md` §4.5 に導出関数の宣言が無く、どの Issue にも含まれていない
  - 現状 `distributeExp` は主（+副）にしか加算しないため、この2軸は永久に0のまま
  - 担当: **Step 3（GMエージェント）**。着手前に architect で `02_architecture.md` §4.5 に
    導出関数を追記してから Issue 化する

- [ ] 派生スキルの「該当ステータス EXP +10%」に到達可能な処理経路が無い
  - `constants.ts:21` の `DERIVATION_EXP_BONUS = 0.10` はリポジトリ内で定義行以外から
    一度も参照されていない（`grep` で確認済み）
  - `derivationStates()` は解放状態を算出するが `UniqueSkill` に格納して表示するだけで、
    `calcExp`/`distributeExp` は解放状態も定数も受け取らない
  - **TECH は《AI開発》と《システム設計》の2派生がどちらも `effect: "TECH"`** のため、
    重複時に +10% を1回だけ適用するのか加算/乗算するのかの契約が未定義。
    Step 3 で実装する前にこの契約を `07_unique_skill.md` に明記する必要がある
  - 担当: **Step 3（GMエージェント）**

- [ ] `data-source.ts` の `as` キャストが JSON の契約を型で保証していない
  - JSON の widen された型がキャスト先の supertype になるため typecheck を素通りする。
    `src/test/data-source.test.ts` で9キー充足・HPレンジ・deadline の解釈可能性等は
    固めたが、クエスト内部の `main`/`sub`/`involvedStatuses`/`expectedExp`・
    ミッションの `deadline`・デバフ・履歴の数値までは検証していない
  - 完全な担保にはスキーマ検証ライブラリ（zod 等）の導入判断が必要で、
    `01_requirements.md` の技術スタックに無いため Step 1 では入れない
  - 担当: 未定（Step 2 以降でスキーマ検証を入れるか判断する）

> 以下2件は Wave 5 バリアの `/code-review` で検出し、**ユーザー判断で Step 3 送り**と確定したもの。

- [ ] `gameOver()` の殿堂スナップショットが3〜4項目ハードコードされている
  - `src/lib/penalty.ts` の `gameOver` は `titles: []` / `defeatedBosses: []` / `survivedDays: 0` を
    固定値で入れ、`longestStreak` に `state.streak`（最長ではなく現在値）を入れている
  - 原因は `GameState`（`src/lib/types.ts:89-94`）に称号履歴・討伐ボス・開始日・最長ストリークを
    保持するフィールドが無いこと。Issue #11 の範囲では埋めようがない
  - `06_penalty.md` §5.2 はこれらの永久保存を求めているため、型設計から見直す必要がある
  - Step 1 は `gameOver` を画面から呼ばないため実害なし
  - 担当: **Step 3（GMエージェント）**。着手前に architect で `types.ts` の `GameState` 拡張を確定する

- [ ] デバフの付与経路と `remainingDays` の減算処理が存在しない
  - `06_penalty.md` §3 の「🔻戦闘不能（HP<10 で発生）」「🔻衰弱（デイリー3日連続未達で発生）」を
    `state.debuffs` に**付与する経路が実装されていない**（`applyPenalty` が返すのは `bossFailed` の
    🔻敗北のみ）。`PenaltyKind` も4種（`types.ts:51`）で「3日連続未達」を表現できない
  - `Debuff.remainingDays` を日次で減算し期限切れを取り除く処理も無いため、
    一度付いたデバフが永久に残る
  - Step 1 は `src/data/*.json` の静的ダミーを表示するだけで日次更新を行わないため実害なし
  - 担当: **Step 3（GMエージェント）**

## Step 2（デプロイ前にだけ必要・今は着手しない）
- [ ] GitHubリポジトリ名のハイフン除去（`gh repo rename status-board -R rhashimoto-sudo/-status-board`）
  - team-lead がユーザーへ実行を依頼済み。**Step 1 のローカル実装には不要**
  - coordinator はリネームもリモートURL変更も**行わない**。push 直前に team-lead が取り次ぐ

## Step 1 Issue分解（Wave別）

> planner が `docs/02_architecture.md`（確定版）と `docs/01_requirements.md` から分解。
> Issue数: 24 / Wave数: 9（レビュー区切り9回）/ 最長依存鎖: 9
> （W1-1 → W2-1 → W3-2 → W4-1 → W5-1 → W6-1 → W7-1 → W8-1 → W9-1）
> 担当エージェント: 全Issue共通で `dev-phase1-worker`
>
> **Issue #1〜#7（Wave 1〜3）は実装・合体とも完了済み。ただし当時のセッションで `/logger` が
> 実行されず `docs/WORK_LOG/` に記録が残っていない**（記録を後から捏造しないため作成しない）。
> 2026-08-15 にユーザー判断で Issue 本文を削除した。受け入れ条件の原典は
> `docs/01_requirements.md` / `docs/02_architecture.md` を参照すること。
> Wave 4（#8〜#10）は `docs/WORK_LOG/2026-08-10.md` に記録済みのため削除した。
> Wave 5（#11、および `/code-review` 追補の #11-fix / #11-nextHp）と
> Wave 6 ロットA（#12〜#14）は `docs/WORK_LOG/2026-08-15.md` /
> `docs/WORK_LOG/2026-08-15-wave6a.md` に記録済みのため削除した。
> **残 Issue: #15〜#24。**

### Wave 7（依存: Wave6）— 各タブの組み立て

#### Issue #20: status-tab.tsx
**目的**: Tab1の5要素（ヒーローヘッダー〜歪みメーター）を上から並べ、CALIBRATIONバナーを内部に配置する
**受け入れ条件**:
- [ ] `[server]`。Issue#12/#13/#14 の6コンポーネントを順に並べる
- [ ] `state.phase==="calibration"` のとき `CalibrationBanner` をタブ内部先頭に表示する（共通ヘッダーには置かない。C-13）
**対象ファイル**: `src/components/status/status-tab.tsx`
**提供**: `StatusTab({data: DashboardData})`
**依存契約**: Issue#12/#13/#14 の全コンポーネント / Issue#4の`CalibrationBanner`
**Wave**: 7
**担当エージェント**: dev-phase1-worker

#### Issue #21: mission-tab.tsx
**目的**: Tab2の4要素（緊急ボード〜敗北ログ）を上から並べる
**受け入れ条件**:
- [ ] `[server]`。Issue#15/#16/#17 の4コンポーネントを順に並べる
- [ ] `state.phase==="calibration"` のとき `CalibrationBanner` をタブ内部先頭に表示する
**対象ファイル**: `src/components/mission/mission-tab.tsx`
**提供**: `MissionTab({data: DashboardData})`
**依存契約**: Issue#15/#16/#17 の全コンポーネント / Issue#4の`CalibrationBanner`
**Wave**: 7
**担当エージェント**: dev-phase1-worker

#### Issue #22: growth-tab.tsx
**目的**: Tab3の4要素（折れ線〜殿堂）を上から並べる
**受け入れ条件**:
- [ ] `[server]`。Issue#18/#19 の3コンポーネントを順に並べる
- [ ] `state.phase==="calibration"` のとき `CalibrationBanner` をタブ内部先頭に表示する
**対象ファイル**: `src/components/growth/growth-tab.tsx`
**提供**: `GrowthTab({data: DashboardData})`
**依存契約**: Issue#18/#19 の全コンポーネント / Issue#4の`CalibrationBanner`
**Wave**: 7
**担当エージェント**: dev-phase1-worker

### Wave 8（依存: Wave7）

#### Issue #23: dashboard.tsx + 2ルート結線
**目的**: `data-source.ts` → `dashboard.tsx` → `tabs.tsx` の全結線を行い `/` と `/calibration` を完成させる
**受け入れ条件**:
- [ ] `dashboard.tsx` は `[server]`。`StatusTab`/`MissionTab`/`GrowthTab` を `ReactNode` として `Tabs` の3 slot に渡す
- [ ] `app/page.tsx` は `loadDashboard("main")`、`app/calibration/page.tsx` は `loadDashboard("calibration")` を呼ぶだけで、レイアウト・タブ構成は完全に同一（AC-10）
- [ ] `npm run dev` で `/` と `/calibration` を開き分けられ、再起動・環境変数設定が不要（AC-10）
- [ ] `npm run build` が両ルートとも静的生成される
**対象ファイル**: `src/components/dashboard.tsx`, `src/app/page.tsx`, `src/app/calibration/page.tsx`
**提供**: `Dashboard({data: DashboardData})`
**依存契約**: Issue#20/#21/#22 のTab / Issue#10の`loadDashboard` / Issue#4の`Tabs`
**Wave**: 8
**担当エージェント**: dev-phase1-worker

### Wave 9（依存: Wave8）

#### Issue #24: レスポンシブ・a11y・配色の最終検証と修正
**目的**: 375/768/1024/1440pxでの横スクロール排除、コントラスト、フォーカスリング、配色混入の最終チェックと修正
**受け入れ条件**:
- [ ] DevToolsで375/768/1024/1440pxを確認し `document.documentElement.scrollWidth <= clientWidth`（AC-13）
- [ ] `src/components/` を grep しレベル閾値・HP増減値・デバフ倍率・スキル閾値の数値リテラルが出現しない（AC-15）
- [ ] `globals.css`の`@theme`外の`#`直書き色が無いことをgrepで確認し、`box-shadow`の出現箇所がカウントダウンとHP危険域の2つだけであることを確認（AC-14）
- [ ] タブがTab/Enter/矢印キーで操作でき、フォーカスリングが可視化される（NFR-4）
- [ ] `prefers-reduced-motion: reduce` でパルスが停止し静的な赤になることを確認（C-16）
- [ ] `npx madge --circular --extensions ts,tsx src/` で循環依存ゼロ（`npm run check:cycles`）
- [ ] `npm run verify` が通る（最終ゲート）
**対象ファイル**: `src/app/globals.css`, `src/components/tabs.tsx`, `src/components/status/status-radar.tsx`, `src/components/growth/growth-chart.tsx`（監査で他ファイルも軽微修正の可能性あり）
**提供**: なし（既存コンポーネントの修正のみ）
**依存契約**: Wave8までの全成果物
**Wave**: 9
**担当エージェント**: dev-phase1-worker

### テスト・デプロイ
- [ ] `npm run build` が型エラーなしで通ること
- [ ] 3タブをブラウザで目視確認（375px で横スクロールなし）
- [ ] 境界値検証（レベル 925/926・11286/11287、スキル発動 24/25・99/100）
- [ ] 測定期間モード（status.calib.json）の描画確認
- [ ] コミット・push・Vercelデプロイ（**ユーザー確認が必要**）
