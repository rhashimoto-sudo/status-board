# TODO - status-board（自分RPG ステータスボード）

> セッション復帰用の一時ファイル。完了したタスクは docs/WORK_LOG/ に記録した後に行ごと削除する。
> 作業履歴は docs/WORK_LOG/ を参照。
>
> planner/coordinator が Issue を割り当てた後は、`### Wave N` 見出しでグループ分けする
> （Wave は依存順序の保証とレビューの区切りであり、同時実行を意味しない。実行は常に1件ずつ）。
> 各進行中タスクには個別に `状態: {ブランチ名} / {次の一手}` を付ける。

作成日: 2026-08-09

## 進行中
- [ ] **Step 1 の実装は Wave 9 まで完了。残るはデザイン改善バックログとデプロイ**
  - 状態: `develop/step1-dashboard` に Wave 1〜9 すべて合体済み（`8ab2a99`）。
    `npm run verify` 通過 / Tests **163 passed / 8ファイル** / 循環0件 / `/` と `/calibration` とも静的生成
  - Wave 7〜9 は vibe-coordinator のセッション上限により **team-lead が実装**した。
    記録は `docs/WORK_LOG/2026-08-15-wave7-9.md`
  - 実測（headless Chrome）: 2ルート × 4幅(375/768/1024/1440) × 3タブ = **全24通りで横スクロールなし**。
    コントラスト違反51件を検出し `--color-text-muted` を `#6b7490` → `#7b84a1` に修正して0件化
  - 次の一手: 下記デザイン改善バックログを1件ずつ進める

## デザイン改善バックログ

> 2026-08-15 に A〜I の9件すべて実装・合体済み（`219085a`）。詳細はコミットメッセージ参照。
> 実測: 全24通り（2ルート×4幅×3タブ）で横スクロールなし、コントラスト違反0件、Tests 167 passed。

- [x] A. TOTAL Lv の EXPバーにラベル（「次の Lv まで 0.1」）
- [x] B. 弱点の可視化（`weakestStatuses` / ヒーロー1行 / 一覧に violet 縦罫）
- [x] C. ステータス一覧の Lv バッジ整列 + 「土台」ラベル
- [x] D. レーダー軸から絵文字除去 / 一覧は `saturate(0.35)`
- [x] E. 歪みメーターに均衡点の基準線と乖離の絶対値
- [x] F. HP 状態ラベルを状態色の小バッジに
- [x] G. Tab1 の構成順を 一覧 → 歪み → 固有スキル に変更
- [x] H. 未解放の派生を `<details>` で折りたたみ
- [x] I. Tab3 の折れ線に乖離の帯 / Tab1 に趨勢（3ヶ月前との比較）

### この実装で新たに生じた docs の追随（`/spec-sync` 対象）
- [ ] `09_dashboard_spec.md` §2.1 の ASCII 例「次のLvまで 461 EXP」
  - TOTAL Lv は9軸の加重平均であり単一の累積EXPを持たない。同節の表は
    「EXPバー | TOTAL Lv の小数部を進捗として描画する」と正しく書かれており、
    ASCII 例だけが EXP 残量になっていて矛盾する。実装は小数部の残りを表示している
- [ ] `07_unique_skill.md:20`「レーダーチャートの中心に紋章、その直下にスキルツリーパネル」
  - G の順序変更（一覧 → 歪み → 固有スキル）と衝突する。紋章がレーダー中心にある構造は
    変わっていないため、パネル位置の記述のみ改訂する
- [ ] `09_dashboard_spec.md` §5（測定期間モード）に歪みメーターの扱いを追記
  - LEARNING/EXECUTION が未測定のとき歪みメーターを非表示にしている（Wave 8 の team-lead 判断）。
    表に行が無いため記載が必要

## デプロイ（ユーザー確認が必要）
- [ ] コミット・push・Vercel デプロイ
- [ ] GitHubリポジトリ名のハイフン除去（push 直前）

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
