# TODO - status-board（自分RPG ステータスボード）

> セッション復帰用の一時ファイル。完了したタスクは docs/WORK_LOG/ に記録した後に行ごと削除する。
> 作業履歴は docs/WORK_LOG/ を参照。
>
> planner/coordinator が Issue を割り当てた後は、`### Wave N` 見出しでグループ分けする
> （Wave は依存順序の保証とレビューの区切りであり、同時実行を意味しない。実行は常に1件ずつ）。
> 各進行中タスクには個別に `状態: {ブランチ名} / {次の一手}` を付ける。

作成日: 2026-08-09

## 進行中
- [ ] Wave 4 / Issue #8（exp.ts）・#9（skill.ts）・#10（data-source.ts）
  - 状態: `develop/step1-dashboard`。Wave 1〜3（Issue #1〜#7）合体済み・`npm run verify` 通過（Tests 35 passed）
  - 実行方式: **逐次**（並列実行のユーザー承認が未取得のためルールどおり逐次にフォールバック）
  - 各Issueは専用worktree `../wt-status-board-issue-N` / ブランチ `develop/step1-dashboard-issue-N` で隔離実行
  - 合体済みworktreeは Waveバリア完了まで保持中（レビュー指摘の修正に使うため）

## Step 2（デプロイ前にだけ必要・今は着手しない）
- [ ] GitHubリポジトリ名のハイフン除去（`gh repo rename status-board -R rhashimoto-sudo/-status-board`）
  - team-lead がユーザーへ実行を依頼済み。**Step 1 のローカル実装には不要**
  - coordinator はリネームもリモートURL変更も**行わない**。push 直前に team-lead が取り次ぐ

## Step 1 Issue分解（Wave別）

> planner が `docs/02_architecture.md`（確定版）と `docs/01_requirements.md` から分解。
> Issue数: 24 / Wave数: 9（レビュー区切り9回）/ 最長依存鎖: 9
> （W1-1 → W2-1 → W3-2 → W4-1 → W5-1 → W6-1 → W7-1 → W8-1 → W9-1）
> 担当エージェント: 全Issue共通で `dev-phase1-worker`

### Wave 1

#### Issue #1: プロジェクト初期化・ツールチェーン整備
**目的**: Next.js 15 App Router + TypeScript + Tailwind v4 + Recharts + Vitest を導入し、以降の全Issueが依拠する土台を作る
**受け入れ条件**:
- [ ] `npm run build` がエラーなしで通る（AC-1 の土台）
- [ ] `npm run typecheck`（`tsc --noEmit`、`strict: true`）が通る
- [ ] `npm run test`（`vitest run`）がテスト0件のまま正常終了する
- [ ] `npm run verify`（`typecheck && test && build`）が定義され通る
- [ ] `tsconfig.json` に `paths: {"@/*": ["./src/*"]}` が設定され `vitest.config.ts` でも解決される
- [ ] `src/app/layout.tsx` に `html lang="ja"` と `color-scheme: dark` 固定が入っている
**対象ファイル**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`（最小の`@import "tailwindcss"`のみ）, `src/app/page.tsx`（placeholder）
**提供**: npm scripts（dev/build/typecheck/test/test:watch/check:cycles/verify）、`@/*` パスエイリアス、`src/app/layout.tsx` の dark 固定 shell
**依存契約**: なし
**Wave**: 1
**担当エージェント**: dev-phase1-worker

### Wave 2（依存: Wave1）

#### Issue #2: lib基盤 — constants.ts / types.ts
**目的**: 全調整値と全ドメイン型を集約し、以降の全 lib/components が参照する唯一の正を作る
**受け入れ条件**:
- [ ] `src/lib/constants.ts` が `02_architecture.md` §4.1 の全エクスポートを持つ（STATUS_ORDER, LEVEL_THRESHOLDS, SKILL_ACTIVATION_THRESHOLDS, HP_*, DEBUFF_*, CALIBRATION_* など）
- [ ] `constants.ts` は他の `src/lib/*` を import しない（`npm run check:cycles` 相当を目視確認）
- [ ] `src/lib/types.ts` が §4.2 の全型を持ち、`constants.ts` からのみ import する
- [ ] `MainStatusKey`/`SubStatusKey` に `"LEARNING"` を代入すると型エラーになる（S-8）ことを `src/test/types.test-d.ts` で `// @ts-expect-error` 付きで固定する
- [ ] `npm run typecheck` が通る
**対象ファイル**: `src/lib/constants.ts`, `src/lib/types.ts`, `src/test/types.test-d.ts`
**提供**: `STATUS_ORDER`/`SPECIALTY_ORDER`/`FOUNDATION_ORDER`/`LEVEL_THRESHOLDS`/`MAX_LEVEL`/`TOTAL_*`/`DIFFICULTY_BASE_EXP`/`NOVELTY_MULTIPLIERS`/`SKILL_ACTIVATION_THRESHOLDS`/`SKILL_MULTIPLIERS`/`DERIVATIONS`/`HP_*`/`DEBUFF_*`/`CALIBRATION_*`/`BALANCE_*`/`HISTORY_DAYS` 等の定数一式、`StatusKey`/`Status`/`StatusMap`/`Phase`/`Quest*`/`DefeatEntry`/`HpZone`/`Debuff`/`PenaltyResult`/`UniqueSkill`/`Snapshot`/`HallOfFame`/`GameState`/`DashboardData` 等の型一式
**依存契約**: Wave1（tsconfig paths, strict mode）
**Wave**: 2
**担当エージェント**: dev-phase1-worker

#### Issue #3: デザイントークン + 共通UI Atom
**目的**: `11_design_system.md` のカラー・タイポ・スペーシングトークンを `@theme` に定義し、パネル/バー/数値表示の共通部品を作る
**受け入れ条件**:
- [ ] `globals.css` の `@theme` にシアン`#22d3ee`・バイオレット`#8b5cf6`・HP緑`#22c55e`/黄`#f59e0b`/赤`#ef4444`・背景`#0a0b12`等が定義されている（AC-14の土台）
- [ ] `ui/panel.tsx` が四隅ブラケット装飾＋見出し＋区切り線を持ち、データを一切 import しない（props のみ）
- [ ] `ui/progress-bar.tsx` が `value/max/colorToken/label` を props で受け取る
- [ ] `ui/stat-value.tsx` が `ui-monospace` + `tabular-nums` を適用する
- [ ] `focus-visible` で 2px シアンリングが出る共通スタイルが定義され `outline: none` 単独指定がない
- [ ] `prefers-reduced-motion: reduce` 用のCSSフックが用意されている
**対象ファイル**: `src/app/globals.css`, `src/components/ui/panel.tsx`, `src/components/ui/progress-bar.tsx`, `src/components/ui/stat-value.tsx`
**提供**: `@theme` の色/スペーシングCSS変数、`Panel({title, children})`, `ProgressBar({value, max, colorToken, label})`, `StatValue({children})`
**依存契約**: Wave1（`src/app/globals.css` の初期内容）
**Wave**: 2
**担当エージェント**: dev-phase1-worker

#### Issue #4: tabs シェル + 測定期間バナー
**目的**: `role=tablist` の3タブ切替クライアントコンポーネントと、各タブ内部に置くCALIBRATIONバナーを作る
**受け入れ条件**:
- [ ] `tabs.tsx` は `"use client"`、state は `activeTab` のみ、3つの `ReactNode` slot を props で受け取りデータを知らない
- [ ] 非選択タブは `hidden` 属性ではなく DOM から外れる（アンマウント。C-14）
- [ ] `role="tablist"`/`role="tab"`/`role="tabpanel"` と矢印キー移動が実装されている（NFR-4）
- [ ] `calibration-banner.tsx` は `[server]` で `"CALIBRATION PHASE Day n/14" / "18件中m件完了"` を props から描画する
**対象ファイル**: `src/components/tabs.tsx`, `src/components/calibration-banner.tsx`
**提供**: `Tabs({statusSlot, missionSlot, growthSlot}: {statusSlot: ReactNode; ...})`, `CalibrationBanner({day, totalDays, done, totalQuests}: CalibrationProgress)`
**依存契約**: Wave1（layout/globals base）
**Wave**: 2
**担当エージェント**: dev-phase1-worker

### Wave 3（依存: Wave2）

#### Issue #5: titles.ts — 称号テーブル
**目的**: 90称号＋総合10称号の保持と `key,level` からの引き当てを実装する
**受け入れ条件**:
- [ ] `TITLES` が9キー×10件=90件、`TOTAL_TITLES` が10件で `01_requirements.md` FR-1-2 の表と一字一句一致する
- [ ] `titleFor("INT", 5)` が `"論理家"`、`titleFor("TECH", 10)` が `"AIマスター"`、`titleFor("BRIDGE", 1)` が `"聞き手"` を返す
- [ ] `titleFor` / `totalTitleFor` は Lv0・Lv11 を渡しても例外を投げず 1..10 にクランプする
- [ ] 重複称号（「学習者」「探索者」「推進者」）がリネームされずそのまま残っている
- [ ] `npm test`（`src/test/titles.test.ts`）が上記を機械的に検証し通る
**対象ファイル**: `src/lib/titles.ts`, `src/test/titles.test.ts`
**提供**: `TITLES`, `TOTAL_TITLES`, `titleFor(key, level): string`, `totalTitleFor(totalLevel): string`
**依存契約**: Issue#2 の `constants.ts`（STATUS_ORDER）/ `types.ts`（StatusKey）
**Wave**: 3
**担当エージェント**: dev-phase1-worker

#### Issue #6: level.ts — Lv判定・TOTAL Lv
**目的**: 累積EXPからのLv導出、進捗計算、TOTAL Lv算出を実装する
**受け入れ条件**:
- [ ] `levelFromExp`: 0→1 / 99→1 / 100→2 / 925→4 / 926→5 / 1580→5 / 1581→6 / 11286→9 / 11287→10 / 999999→10（AC-3）
- [ ] `expToNextLevel(exp)` は Lv10 の入力で `null` を返す
- [ ] `levelProgress(exp)` は常に 0..1 の範囲に収まる
- [ ] `computeTotalLevel`: 上位5平均×0.6 + 全9平均×0.4。Lv同値6件以上でも `STATUS_ORDER` 順で決定的に選ばれる（S-5）
- [ ] `npm test`（`src/test/level.test.ts`）が上記境界値を全て検証し通る
**対象ファイル**: `src/lib/level.ts`, `src/test/level.test.ts`
**提供**: `levelFromExp`, `levelFloorExp`, `expToNextLevel`, `levelProgress`, `levelsOf`, `computeTotalLevel`, `totalLevelProgress`
**依存契約**: Issue#2 の `constants.ts`（LEVEL_THRESHOLDS, MAX_LEVEL, TOTAL_*）/ `types.ts`（StatusMap）
**Wave**: 3
**担当エージェント**: dev-phase1-worker

#### Issue #7: ダミーJSON5本
**目的**: `01_requirements.md` FR-9 の値に厳密に一致する静的ダミーデータを作る
**受け入れ条件**:
- [ ] `status.json`: Lv2〜5でばらつき・TECH/INT高め・ENGLISH/BRIDGE低め、HP62、ストリーク27日、デイリー5件中3件done、《構造化》は `activations: 52`（**Lv記載なし**。52回でLv4/×1.30になる。38回は使わない）、派生は《データ分析》のみ解放条件を満たす値、`level` フィールドを一切持たない（C-6）
- [ ] `status.calib.json`: `phase:"calibration"`、Day6/14、18件中8件完了、未測定軸は `measured:false`（**文字列 `"???"` をデータに入れない**。C-12）
- [ ] `quests.json`: デイリー5件固定、ボス1体（残り12日）、期限切れ間近ゲリラ1件（残り2日）、敗北ログ2件（討伐失敗ボス1+失敗ミッション1）
- [ ] `history.json`: 90日分のスナップショット配列
- [ ] `hall-of-fame.json`: `{ generation: 1, entries: [] }`
- [ ] 全JSONの形が `types.ts` の対応する型（`Status`/`Quest`/`Snapshot`/`HallOfFame`）とフィールド互換
**対象ファイル**: `src/data/status.json`, `src/data/status.calib.json`, `src/data/quests.json`, `src/data/history.json`, `src/data/hall-of-fame.json`
**提供**: 上記5ファイルのデータ形状（`data-source.ts` が読み込む契約）
**依存契約**: Issue#2 の `types.ts`（Status/Quest/Snapshot/HallOfFame の形状）
**Wave**: 3
**担当エージェント**: dev-phase1-worker

### Wave 4（依存: Wave3）

#### Issue #8: exp.ts — EXP計算・配分・フロア
**目的**: EXP計算式・主副配分・減点時フロア処理を実装する（画面からは呼ばない。単体検証のみ）
**受け入れ条件**:
- [ ] `floorExp`: Lv5(940)−50→926（Lv5のまま）/ Lv5(1000)−10→990 / Lv1(5)−10→0（負にならない。AC-5）
- [ ] `calcExp`: 60×1.5×1.0×1.30×1.0=117 / 25×0.5×0.7×1.0×0.8=7 / `hasEvidence:false`→0
- [ ] `distributeExp`: 副ステータスが主の50%換算（四捨五入）で加算される
- [ ] `applyExpDelta` は内部で必ず `floorExp` を通す（C-7）
- [ ] `npm test`（`src/test/exp.test.ts`）が上記を検証し通る
**対象ファイル**: `src/lib/exp.ts`, `src/test/exp.test.ts`
**提供**: `ExpInput`型, `calcExp`, `distributeExp`, `floorExp`, `applyExpDelta`
**依存契約**: Issue#6 の `level.ts`（`levelFloorExp` 相当のLv下限値）/ Issue#2 の `constants.ts`（DIFFICULTY_BASE_EXP等）
**Wave**: 4
**担当エージェント**: dev-phase1-worker

#### Issue #9: skill.ts — 《構造化》と派生
**目的**: 発動回数からのSkill Lv導出、構造化ボーナス、派生5種の解放判定を実装する
**受け入れ条件**:
- [ ] `skillLevelFromActivations`: 0→1/9→1/10→2/24→2/25→3/49→3/50→4/99→4/100→5/500→10/9999→10（AC-8）
- [ ] `structureBonus`: 関与2→1.0 / 関与3→該当Skill Lvの倍率
- [ ] `derivationStates`: TECH7・INT4 →《システム設計》未解放、TECH7・INT5 →解放（AND条件。AC-9）
- [ ] `isFinalClassReached`: TOTAL Lv9でも派生5種未解放なら `false`
- [ ] `npm test`（`src/test/skill.test.ts`）が上記を検証し通る
**対象ファイル**: `src/lib/skill.ts`, `src/test/skill.test.ts`
**提供**: `skillLevelFromActivations`, `skillMultiplier`, `activationsToNext`, `skillProgress`, `shouldActivate`, `structureBonus`, `derivationStates`, `allDerivationsUnlocked`, `isFinalClassReached`, `buildUniqueSkill`
**依存契約**: Issue#6 の `level.ts`（型のみ、循環回避のため `isFinalClassReached` はここに配置。Q-3）/ Issue#2 の `constants.ts`（SKILL_*, DERIVATIONS）
**Wave**: 4
**担当エージェント**: dev-phase1-worker

#### Issue #10: data-source.ts — JSON読込とphase分岐
**目的**: 静的JSONを唯一の入口で読み込み型を付けて返す。`phase` によるstatus/status.calib分岐をこの1箇所に閉じる
**受け入れ条件**:
- [ ] ファイル先頭に `import "server-only";` があり、クライアントからimportするとビルド失敗する
- [ ] `loadDashboard("main")` は `status.json` を、`loadDashboard("calibration")` は `status.calib.json` を読む。分岐はこの1行のみ
- [ ] `src/data/*.json` を import するのは `data-source.ts` だけである（C-1。他ファイルをgrepして確認）
- [ ] 戻り値が `DashboardData` 型と完全一致し `npm run typecheck` が通る
**対象ファイル**: `src/lib/data-source.ts`
**提供**: `loadDashboard(phase: Phase): DashboardData`
**依存契約**: Issue#7 のダミーJSON5本 / Issue#2 の `types.ts`（DashboardData等）
**Wave**: 4
**担当エージェント**: dev-phase1-worker

### Wave 5（依存: Wave4）

#### Issue #11: penalty.ts — HP・デバフ・GAME OVER
**目的**: HPクランプ、デバフの重複排除、ペナルティ適用、ストリーク更新、GAME OVER処理を実装する
**受け入れ条件**:
- [ ] `clampHp`: 5−25→0（−20にならない）/ 98+50→100（AC-4）
- [ ] `debuffMultiplier`: 衰弱+敗北→0.8（0.72にならない）/ 3種同時→0.5 / なし→1.0（AC-6）
- [ ] `applyPenalty`: `phase:"calibration"` で全種別 `hpDelta` が0・GAME OVER発火なし。判定は関数入口1箇所のみ（C-9）
- [ ] `gameOver`: 全ステータスexp0・HP100・`generation`+1、既存Hall of Fameエントリが消えず1件増える（AC-7）
- [ ] `updateStreak`: 5/5→+1、4/5→0（AC-12）
- [ ] `hpZone`: 51→safe/50→warn/26→warn/25→danger/62→safe（06 §7, Q-5）
- [ ] `npm test`（`src/test/penalty.test.ts`）が上記全てを検証し通る
**対象ファイル**: `src/lib/penalty.ts`, `src/test/penalty.test.ts`
**提供**: `clampHp`, `hpZone`, `hpState`, `strongestDebuff`, `debuffMultiplier`, `updateStreak`, `applyPenalty`, `isGameOver`, `gameOver`
**依存契約**: Issue#6 の `level.ts` / Issue#8 の `exp.ts`（`applyExpDelta`）/ Issue#2 の `constants.ts`（HP_*, DEBUFF_*）
**Wave**: 5
**担当エージェント**: dev-phase1-worker

### Wave 6（依存: Wave5, Wave3, Wave2）— 各タブの葉パネル（相互に独立・ファイル重複なし）

#### Issue #12: hero-header.tsx + hp-bar.tsx
**目的**: TOTAL Lv/称号/EXPバー/🔥ストリーク/♥HPバー/🔻デバフを描画する
**受け入れ条件**:
- [ ] `hp-bar.tsx` は緑`>50`/黄`>25`/赤`<=25`で色分けし、赤のみ発光＋テキスト併記する（AC-14, C-15）
- [ ] `hero-header.tsx` は `state.phase==="calibration"` のときHPを `—` 表示する（07 描画モード）
- [ ] デバフは色に加えアイコン+テキストを併記する（NFR-4）
- [ ] 数値はすべて `StatValue`（等幅+tabular-nums）経由で表示する
**対象ファイル**: `src/components/status/hero-header.tsx`, `src/components/status/hp-bar.tsx`
**提供**: `HeroHeader({totalLevel, totalTitle, hpState, debuffs, streak, phase})`, `HpBar({hp, zone, phase})`
**依存契約**: Issue#6(level.ts)/#5(titles.ts)/#11(penalty.ts)の算出値の型 / Issue#3の`Panel`/`ProgressBar`/`StatValue`
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #13: status-radar.tsx + skill-emblem.tsx
**目的**: 9軸固定Rechartsレーダー（現在値+3ヶ月前ゴースト）と中心の《構造化》紋章を描画する
**受け入れ条件**:
- [ ] `"use client"`、軸順は `STATUS_ORDER` のみを参照しハードコードしない（C-10）
- [ ] 軸最大値は10固定でデータに応じて自動調整しない（C-11）
- [ ] `phase==="calibration"` かつ未測定の軸は `???` 表示（レーダーが崩れず形になる）
- [ ] `ResponsiveContainer` を使い固定px幅を持たない（C-20, AC-13）
**対象ファイル**: `src/components/status/status-radar.tsx`, `src/components/status/skill-emblem.tsx`
**提供**: `StatusRadar({data: {key,current,ghost}[], measuredKeys})`, `SkillEmblem({skillLevel})`
**依存契約**: Issue#2の`constants.ts`（STATUS_ORDER）/ Issue#9の`UniqueSkill`型
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #14: unique-skill-panel.tsx + status-list.tsx + balance-meter.tsx
**目的**: 固有スキルパネル、ステータス一覧9件、歪みメーターを描画する
**受け入れ条件**:
- [ ] `unique-skill-panel.tsx` はLv/発動回数/残回数/倍率/派生5件（解放/未解放と条件）を表示する
- [ ] `status-list.tsx` は `STATUS_ORDER` 順に9件、土台2つの前に区切り線を入れる
- [ ] `balance-meter.tsx` は `BALANCE_GAP_THRESHOLD` を用いた診断文（`BALANCE_MESSAGES`）をconstants経由でのみ出す（AC-15）
- [ ] レベル閾値・HP増減値等の数値リテラルがこれら3ファイルに直書きされていない
**対象ファイル**: `src/components/status/unique-skill-panel.tsx`, `src/components/status/status-list.tsx`, `src/components/status/balance-meter.tsx`
**提供**: `UniqueSkillPanel({skill: UniqueSkill})`, `StatusList({items})`, `BalanceMeter({learningLv, executionLv})`
**依存契約**: Issue#9(skill.ts)/#6(level.ts)/#5(titles.ts)の型 / Issue#2の`constants.ts`（BALANCE_*）
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #15: urgent-board.tsx + countdown.tsx
**目的**: ボス・ゲリラを期限昇順で並べる緊急ボードと、秒まで動くカウントダウンを実装する
**受け入れ条件**:
- [ ] `countdown.tsx` が `setInterval`/`clearInterval` を持つ**唯一**のファイルであり、`Date.now()`との差分を毎秒再計算する（自前減算禁止。C-3, C-4）
- [ ] 残り3日未満（`URGENT_GLOW_WITHIN_DAYS`）で赤く発光する。発光は`prefers-reduced-motion`で停止し静的な赤になる（C-16）
- [ ] `urgent-board.tsx` は deadline 昇順で整列し、`countdown.tsx` へ ISO文字列の `deadline` のみを渡す
**対象ファイル**: `src/components/mission/urgent-board.tsx`, `src/components/mission/countdown.tsx`
**提供**: `UrgentBoard({bosses, guerrillas})`, `Countdown({deadline}: {deadline: string})`
**依存契約**: Issue#2の`constants.ts`（URGENT_GLOW_WITHIN_DAYS）/ Issue#2の`types.ts`（Boss/GuerrillaQuest）
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #16: mission-list.tsx + daily-quests.tsx
**目的**: 進行中ミッションの子クエスト進捗と、固定5個の読み取り専用デイリーチェックリストを描画する
**受け入れ条件**:
- [ ] `daily-quests.tsx` は書き込み導線を持たない（読み取り専用。C-21）。未達時に失うHP/EXPを事前明示する
- [ ] 週中は🔒ロック表示され、次に選び直せる日を明示する
- [ ] `mission-list.tsx` は子クエストの進捗バーを `ProgressBar` で描画する
**対象ファイル**: `src/components/mission/mission-list.tsx`, `src/components/mission/daily-quests.tsx`
**提供**: `MissionList({missions})`, `DailyQuests({dailies})`
**依存契約**: Issue#2の`types.ts`（Mission/DailyQuest）/ Issue#3の`ProgressBar`
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #17: defeat-log.tsx
**目的**: 討伐失敗・期限切れ・失敗ミッションの墓標一覧を描画する
**受け入れ条件**:
- [ ] 被ダメージ（HP/EXP）とリベンジ対象フラグを表示する
- [ ] 敗北種別ごとにラベルを出し分ける（`DefeatEntry.kind`）
**対象ファイル**: `src/components/mission/defeat-log.tsx`
**提供**: `DefeatLog({defeats: readonly DefeatEntry[]})`
**依存契約**: Issue#2の`types.ts`（DefeatEntry）
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #18: growth-chart.tsx + activity-heatmap.tsx
**目的**: 既定3系列+専門7系列トグルの折れ線グラフと、自前SVGの活動ヒートマップを実装する
**受け入れ条件**:
- [ ] `"use client"`、既定表示はTOTAL/LEARNING/EXECUTIONの3本、凡例クリックで専門7つを個別表示できる
- [ ] 専門7系列に赤・緑・黄を割り当てない（11 §3.1）
- [ ] `activity-heatmap.tsx` は `viewBox`+`width:100%` で親幅に追従する自前SVG（ライブラリ不使用。C-20）
- [ ] `ResponsiveContainer`使用でチャートが固定px幅を持たない（AC-13）
**対象ファイル**: `src/components/growth/growth-chart.tsx`, `src/components/growth/activity-heatmap.tsx`
**提供**: `GrowthChart({history: readonly Snapshot[]})`, `ActivityHeatmap({days: {date,gainedExp,intensity}[]})`
**依存契約**: Issue#2の`types.ts`（Snapshot）/ `constants.ts`（HISTORY_DAYS, HEATMAP_INTENSITY_STEPS）
**Wave**: 6
**担当エージェント**: dev-phase1-worker

#### Issue #19: gm-learning-panel.tsx + hall-of-fame.tsx
**目的**: GM学習状況（ダミー値）パネルと殿堂一覧を描画する
**受け入れ条件**:
- [ ] `gm-learning-panel.tsx` はダミー定数を表示し「Step 5 で実データ化」ラベルを付ける
- [ ] `hall-of-fame.tsx` は0件のとき「記録なし」+ `generation 1 — 生存中` を表示する
**対象ファイル**: `src/components/growth/gm-learning-panel.tsx`, `src/components/growth/hall-of-fame.tsx`
**提供**: `GmLearningPanel()`, `HallOfFamePanel({hallOfFame: HallOfFame})`
**依存契約**: Issue#2の`types.ts`（HallOfFame）
**Wave**: 6
**担当エージェント**: dev-phase1-worker

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
