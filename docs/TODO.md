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
  - デプロイ・デザイン改善バックログとも完了。本番稼働中（`docs/13_deployment.md`）
  - 次の一手: **下記「引き継ぎ（2026-08-20 一時停止時点）」を読むこと。**
    S-1 は実装完了・PR 未作成の状態で一時停止している

## 引き継ぎ（2026-08-20 一時停止時点）

> ユーザー指示により **S-1 の着地をもって一時停止**した。以下は再開時に読む場所。

### いまどこにいるか

| 項目 | 状態 |
|---|---|
| ブランチ | **`develop/level-100-scale`**（`main` にも `staging` にも未マージ） |
| S-1（Lv100化 + levelCap） | **実装完了**。Tests 237 passed → 回帰テスト追加で **239 passed / 9ファイル** |
| PR | **未作成。** 外向きの操作なのでユーザー判断待ち（`/pr-formatter` 未実行） |
| docs 本体 | **未改訂**（決定10。Lv1〜10 の旧記述が残っている） |
| worktree | すべて片付け済み（主ツリー1本のみ） |
| `develop/level-100-scale-issue-38` | **不採用となった代替案を保存した未マージブランチ**（下記） |

### 停止前に親セッションが追加したもの

- **`src/test/exp.test.ts` の「applyExpDelta と levelCap（S-2 の不変条件）」**（`504c455`）
  `applyExpDelta` は EXP フロアの基準に **cap を適用しない生Lv** を使わなければならない。
  現状それを守っているのは「`levelFromExp` の第2引数が任意で `exp.ts` が渡していない」
  という一点のみで、後から「cap を必須にする方が厳密」と変更すると、**キャップ到達中に
  貯めた EXP が減点のたびに実効Lvの下限まで削られ、S-2 の核が静かに壊れる**。
  `levelFromExp(status.exp, 50)` に変えると落ちることを実測で確認済み。**このテストを消さないこと。**

- **`develop/level-100-scale-issue-38`（未マージ・マージしない）**
  `rawLevelFromExp` を切り出して `levelFromExp` を cap **必須**引数にする案。同じ不変条件を
  「関数名で意図を表明する」方向で守る。採用したのは任意引数方式（`exp.ts` を変更せずに済む）だが、
  将来 cap の渡し忘れが実害を出したらこの案に切り替える余地がある。判断の経緯として残置。

### 再開時の優先順

1. ~~**S-2 の申し送り3件**~~ → **2026-08-27 完了**（`develop/s2-boss-gate` / `docs/WORK_LOG/2026-08-27.md`）
   - [x] `src/data/history.json` を実効Lvの水準に合わせて再構成（#42）
   - [x] キャップ到達時の別扱い「⛔ Lv50 到達。ボス《…》討伐で解放」＋貯蓄量（#45）
   - [x] cap を上げる経路（ゲートボス討伐・静的フラグ）を追加（#43 / #44）。Lv50 → 70 → 90 → 100
   - **未マージ**。PR も未作成（S-1 の PR とあわせてユーザー判断待ち）
2. [x] **docs 本体の改訂** → **2026-09-10 完了**（`docs/level-100-spec-sync` / `docs/WORK_LOG/2026-09-10.md`）
3. [ ] S-3（ペナルティクエスト・保留方式）→ S-4（Quests DB 拡張）
4. [ ] テスト運用までの P0 7件（本ファイルの該当セクション）

---

## pnpm への移行（プランのみ・未着手）

> 2026-08-20 にプランだけ確定させた。**実行は S-1 が着地した後**という制約はもう解けている。
> ただし急ぐ理由は無い（下記「正直な評価」）。

**実測した前提**: Node v26.3.0 / npm 11.16.0 / **pnpm 11.20.0 導入済み** / corepack なし（Node 26 で同梱廃止）/
`packageManager` と `engines` はどちらも未設定 / lockfile は `package-lock.json` のみ / `.npmrc` なし / `vercel.json` なし。

### Phase 0: 実行前に確かめる（コードからは判定できない2件）
- [ ] **Vercel が pnpm 11 に対応しているか。** Vercel は `pnpm-lock.yaml` を自動検出し `packageManager` でバージョンを決める。対応範囲外だとインストールが失敗する。非対応なら pin を下げる（lockfile 形式が変わるため後戻りが面倒）
- [ ] **Vercel の Node バージョン設定。** ローカルが v26 なので、`engines` を書いた途端に落ちる可能性がある

### Phase 1: 移行本体（ブランチ `chore/pnpm` / 1コミット）
`pnpm import` は `package-lock.json` から解決済みバージョンを引き継ぐので、**消す前に走らせる**。
```bash
npm run verify                    # ① 移行前のグリーンをベースラインとして記録
pnpm import                       # ② package-lock.json → pnpm-lock.yaml
rm package-lock.json
rm -rf node_modules .next
pnpm install --frozen-lockfile    # ③ 厳密リンクで入れ直す
```
- [ ] `package.json` に `"packageManager": "pnpm@11.20.0"` と `"engines": { "node": ">=22" }`
- [ ] `.gitignore` に `.pnpm-store/`
- [ ] **`.npmrc` は最初は作らない。** 素の strict で通るか見て、壊れてから最小限の
  `public-hoist-pattern` を足す（何が幽霊依存だったかが記録に残る）

### Phase 2: 壊れやすい順に検証
pnpm は hoisting をしないため、**package.json に書いていない依存を暗黙に使っていた箇所が露出**する。
- [ ] `pnpm run lint` — **`eslint-config-next`** のプラグイン解決（最頻出の破損点）
- [ ] `pnpm run build` — **`@tailwindcss/postcss`** の PostCSS プラグイン解決。`.next` を消したクリーンビルド
- [ ] `pnpm run check:cycles` — **madge** の `--ts-config` 解決
- [ ] `pnpm run typecheck` / `pnpm run test`（vitest 4）
- [ ] `pnpm run dev` で `/` と `/calibration` を目視

### Phase 3: デプロイ（唯一の本番リスク）
- [ ] **プレビューデプロイで確認してから `main` にマージする。** いま `main` に入れると本番
  （`status-board-khaki.vercel.app`）が落ちる可能性がある
- [ ] Install Command は自動のままか `pnpm install --frozen-lockfile` を明示
- 切り戻し: 移行コミットの revert + `npm ci`（`package-lock.json` は git 履歴に残る）

### Phase 4: ドキュメント追随（18ファイル・55箇所）
| 対象 | 件数 | 扱い |
|---|---|---|
| `CLAUDE.md`「ビルド・テスト・リント」 | 3 | **直す**（エージェントが毎回読む。最優先） |
| `docs/02_architecture.md` | 8 | 直す |
| `docs/TODO.md` | 10 | 直す |
| `docs/01_requirements.md`（技術スタック） | 2 | 直す |
| `docs/11_design_system.md` | 1 | 直す |
| **`docs/WORK_LOG/` × 11ファイル・`docs/ERROR_LOG/`** | **31** | **直さない** |

> **WORK_LOG / ERROR_LOG を書き換えないこと。** 「その日 npm で実行した」という
> 過去の事実の記録であり、後から pnpm に書き換えるのは記録の改竄にあたる。
> `2026-08-10` のエラーログを読んだ人が再現できなくなる。

- [ ] まだ存在しない **`.github/workflows/daily.yml`（P0-1）は最初から pnpm で書く**

### 正直な評価（判断材料として残す）
dependencies 5個 / devDependencies 11個、単一パッケージ、モノレポでもない。pnpm の主な利点
（ディスク共有・大量依存のインストール高速化・ワークスペース）は**ほとんど効かない**。
実質得られるのは幽霊依存の検出と厳密性で、**コストは Phase 3 の本番リスク**。
「他プロジェクトと揃える」「今後 `scripts/` が増える」といった理由があるなら妥当だが、
**急いでやる理由は無い。**

## Wave 分解（S-1 / 2026-08-19）

> planner（Phase2モード）が既存コードを読んで分解。scope: S-1（レベルスケールの100段化）+
> 決定9が要求する levelCap の状態・配線まで。ボス討伐での cap 上昇経路・Notion連携・日次ジョブ・
> S-3・S-4・docs本体の改訂は**スコープ外**（着手しない）。
> Issue数: 13 / Wave数: 4（レビュー区切り4回）/ 最長依存鎖: 4（#25 → #28 → #30 → #34）
> 担当エージェント: 全Issue共通で `dev-phase2-worker`
> **全Issue共通の受け入れ条件**: docs本体（`00_profile.md`/`01_requirements.md`/`03_status_system.md`/
> `04_exp_rules.md`/`07_unique_skill.md`/`09_dashboard_spec.md`等）を書き換えない・`/spec-sync` を実行しない。
> 全Wave完了後の最終ゲート: `npm run verify` / `npm run lint` / `npm run check:cycles`（循環0件）が通り、
> `grep` で `src/components/` にレベル閾値・キャップ値の数値リテラルが出現しない（AC-15）。
> 375/768/1024/1440px で横スクロールが発生しない（Lv表示が2〜3桁になるため等幅フォントの桁揃えを確認）。

> **Wave 1（Issue #25 / #26）は完了**（`docs/WORK_LOG/2026-08-19.md`）。

> **Wave 2（Issue #27 / #28）は完了**（`docs/WORK_LOG/2026-08-19.md`）。
> cap API は `levelFromExp(exp, cap = MAX_LEVEL)` が任意引数、集計3関数（`levelsOf`/
> `computeTotalLevel`/`weakestStatuses`）が必須第2引数。`expToNextLevel`/`levelProgress` は cap を持たない。

> **Wave 3（Issue #29 / #30 / #31 / #32 / #33）は完了**（`docs/WORK_LOG/2026-08-19.md`）。

> **Wave 4（Issue #34 / #35 / #36 / #37 / #39）は完了**（`docs/WORK_LOG/2026-08-19.md`）。
> 実装中に司令塔が追加した Issue #40（称号帯の floor 契約違反＝確定バグの修正）・
> #41（`exp.test.ts` の陳腐化修正）も完了。

**S-1（レベルスケールの100段化）+ levelCap の導入は実装完了。**
最終ゲート実測: `npm run verify` 通過（Tests 237 passed / 9ファイル）/ `npm run lint` 出力なし /
`npm run check:cycles` 循環0件 / `src/components/` にレベル閾値・キャップ値の数値リテラル0件（AC-15）/
375・768・1024・1440px × 2ルート × 3タブ = 24通りすべて横スクロールなし（3桁Lvに置換した再計測も含む）。
reviewer（`/code-review` high + `/adversarial-verification` + `/codex-second-review`）で確定指摘0件。

**docs 本体の改訂は未実施**（決定10「S-1 実装 → 実測 → docs 本体の改訂」）。
改訂が要る docs は S-1 節の末尾に列挙済み。

**S-2 以降への申し送り**（`docs/WORK_LOG/2026-08-19.md` の Wave4 節に詳細）:
- [ ] `src/data/history.json` が旧10段スケールの値のままで、Tab3 の折れ線が 0〜100 軸の下端に張り付く
- [ ] cap 到達時の EXP バーの別扱い（「⛔ Lv50 到達。ボス《…》討伐で解放」＋貯蓄量の表示）が未実装
- [ ] levelCap を上げる運用経路（ボス討伐）が未実装のため、現状は Lv50 を超えられない（S-2 本体）
- [ ] Lv1→2 = 8 EXP の序盤の軽さは未決のまま（実測してから判断する）

## Wave 分解（S-2 申し送り3件 / 2026-08-27）

> planner（改善モード）が既存コード（`level.ts`/`exp.ts`/`constants.ts`/`types.ts`/`data-source.ts`/
> `status.json`/`status.calib.json`/`history.json`/`growth-chart.tsx`/`status-list.tsx`）を読んで分解。
> scope: 「引き継ぎ（2026-08-20 一時停止時点）」の再開時の優先順1（S-2 の申し送り3件）のみ。
> docs 本体の改訂・S-3・S-4・P0各件・pnpm移行・PR作成は**スコープ外**（着手しない）。
> ボス討伐の入力元は `src/data/*.json` の静的フラグとし、Notion連携・日次ジョブ（P0-1）には依存させない
> （司令塔追記の確定仕様）。levelCap は決定2により**全軸共通の単一キャップ**、ゲートボス①②③は
> 決定6により `docs/00_profile.md` §3「今年の合格条件」3つの転記（新規発明しない）。
> Issue数: 4 / Wave数: 2（レビュー区切り2回）/ 最長依存鎖: 2（#43 → #44、#43 → #45）
> 担当エージェント: 全Issue共通で `tdd-worker`

> **全Issue共通の受け入れ条件**:
> - `src/test/exp.test.ts` の「applyExpDelta と levelCap（S-2 の不変条件）」を変更・削除しない。
>   `exp.ts` の `applyExpDelta`／`floorExp` に `levelCap` 引数を追加しない
>   （EXPフロアの基準は必ず cap 非適用の生Lv。キャップ中に貯めた EXP が減点で消えてはならない）
> - `develop/level-100-scale-issue-38`（`levelFromExp` の cap 必須化案）は不採用。参照・マージしない
> - 調整値・キャップ値・レベル閾値はすべて `src/lib/constants.ts` に一元管理し、
>   `src/components/` に数値リテラルを直書きしない（AC-15）
> - docs 本体（`00_profile.md`/`01_requirements.md`/`03_status_system.md`/`04_exp_rules.md`/
>   `07_unique_skill.md`/`09_dashboard_spec.md` 等）は書き換えない・`/spec-sync` を実行しない
> - Step 1 スコープ厳守。`src/data/*.json` の静的ダミーのみ。外部API・シークレットを持ち込まない
> - ライトモード実装なし・アクセントはシアン/バイオレットのみ・375pxで横スクロールなし
> - 発光（`box-shadow`）はカウントダウンとHP危険域のみ。キャップ表示に新規の発光を追加しない
> - Lv・EXP・HP・貯蓄量は等幅フォント（`ui-monospace`。`StatValue` コンポーネント）で桁を揃える
> - PR作成はしない（`/pr-formatter` は今回走らせない）

### Wave 1

#### Issue #42: history.json を実効Lvの水準に合わせて自然な推移で再構成する
**目的**: `src/data/history.json` が旧10段の値のままで、Tab3 の折れ線（0〜100軸）の下端に張り付いている状態を解消する。
単純な一律スケール倍では現在値と食い違い、90日分の推移としても不自然になるため、**現在の実効Lvに接続する
自然な右肩上がりの推移**として作り直す
**受け入れ条件**:
- [ ] 最新日（末尾エントリ）の `levels.*` 9軸が、`src/data/status.json`（`levelCap=50`）から
      `levelFromExp(exp, levelCap)` で算出した実効Lvと一致する：
      INT 42 / TECH 36 / DATA 41 / MARKETING 22 / PM 21 / BRIDGE 14 / ENGLISH 11 / LEARNING 36 / EXECUTION 25
- [ ] 最新日の `totalLevel` が、上記 `levels.*` を `computeTotalLevel`（`src/lib/level.ts`。
      上位5平均×0.6 + 全9平均×0.4）に実際に通して算出した値と一致する（32.6。手計算で埋めない）
- [ ] 各軸は 90 日を通じて**単調非減少**（Lv は減らない。EXP減点で下がらない仕様と整合させる）
- [ ] **一律 ×N の単純スケールにしない。** 軸ごとに伸び方を変え、10刻みの階段にならないこと。
      燃料マップ（`docs/00_profile.md`）で強い軸（INT/DATA/TECH/LEARNING）は伸び幅を大きく、
      弱い軸（ENGLISH/BRIDGE）は小さく、という形の差を付ける
- [ ] `totalLevel` は各日の `levels` から `computeTotalLevel` で**再計算した値**を入れる
      （`levels` と独立に手で置かない。整合を崩さない）
- [ ] `gainedExp`（ヒートマップの濃度用の生EXP量）は**変更しない**（レベルスケールと無関係の値のため）
- [ ] `date` の並び・件数（90件）は変更しない
- [ ] 全エントリの全値が `1 <= 値 <= MAX_LEVEL(100)` の範囲に収まる
- [ ] **実測での確認**: `npm run dev` で `/` の Tab3 を 375/768/1024/1440px で目視し、
      折れ線が 0〜100 軸の下端に張り付かないこと、かつ**右端（最新日）の値が Tab1 の表示
      （TOTAL Lv 32.6・軸別Lv）と食い違わないこと**をレンダリングして確認する
**対象ファイル**: `src/data/history.json`
**提供**: なし（データ変更のみ）
**依存契約**: なし
**担当**: tdd-worker
**Wave**: 1
**状態**: 未着手

#### Issue #43: GateBoss モデルと levelCap 導出関数
**目的**: 「ボスを倒すと levelCap が上がる」を表現する型・定数・純粋関数を用意する
（決定2: 全軸共通の単一キャップ／決定5: ゲートは Lv50/70/90／決定6: ゲートボス=今年の合格条件3つ）
**受け入れ条件**:
- [ ] `src/lib/types.ts` に `GateBoss = { id: string; name: string; unlockLevel: number }` を追加する
- [ ] `src/lib/constants.ts` に `GATE_BOSSES` を追加する。要素は3件、`unlockLevel` は
      `LEVEL_CAP_GATES` の70/90/100と一致し、`name` は `docs/00_profile.md` §3「今年の合格条件」の
      1〜3を転記する（新規のボス名を発明しない。既存 `docs/TODO.md` の S-2 節と同一の文言:
      「AIと仕組みで他人の課題を解いた実例3件」/「解き方が再現可能な手順として言語化されている」/
      「PMとしてチームを1つ、実際に前に進めた」）
- [ ] `src/lib/level.ts` に `computeLevelCap(defeatedGateLevels: readonly number[]): number` を追加する。
      空配列なら `INITIAL_LEVEL_CAP`（50）を返し、`defeatedGateLevels` に含まれる `LEVEL_CAP_GATES` の
      値のうち最大のものを返す（`LEVEL_CAP_GATES` に存在しない値は無視する）
- [ ] `src/lib/level.ts` に `nextGateBoss(levelCap: number): GateBoss | null` を追加する。
      `GATE_BOSSES` から `unlockLevel > levelCap` を満たす最初の1件を返し、無ければ `null`
      （`levelCap === MAX_LEVEL` のとき必ず `null`）
- [ ] `computeLevelCap([])` は `50`、`computeLevelCap([70])` は `70`、`computeLevelCap([70, 90])` は
      `90` を返す（`src/test/level.test.ts` に追加する境界値テストで固定する）
- [ ] `applyExpDelta`／`floorExp`（`exp.ts`）は変更しない。`levelFromExp` の既存シグネチャ
      （`levelCap` 任意引数・既定値 `MAX_LEVEL`）は変更しない
**対象ファイル**: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/level.ts`
**提供**: `GateBoss` 型 / `GATE_BOSSES` 定数 / `computeLevelCap(defeatedGateLevels): number` /
`nextGateBoss(levelCap): GateBoss | null`
**依存契約**: なし（既存の `LEVEL_CAP_GATES`/`INITIAL_LEVEL_CAP`/`MAX_LEVEL` を利用）
**担当**: tdd-worker
**Wave**: 1
**状態**: 未着手

### Wave 2（依存: Wave1 の Issue #43）

#### Issue #44: JSON の静的フラグから levelCap を導出する配線
**目的**: `levelCap` を JSON の固定値として直接持たせるのをやめ、「どのゲートボスを討伐済みか」という
静的フラグから導出する（司令塔確定仕様: 入力元は `src/data/*.json` の静的フラグ。Notion・日次ジョブに依存しない）
**受け入れ条件**:
- [ ] `src/lib/data-source.ts` の `RawStatus` から `levelCap: number` フィールドを削除し、
      `defeatedGateLevels: readonly number[]` を追加する
- [ ] `toGameState` は `levelCap: computeLevelCap(raw.defeatedGateLevels)`（Issue #43 提供）を使って
      `GameState.levelCap` を算出する（JSON からの直値コピーをやめる）
- [ ] `src/data/status.json` と `src/data/status.calib.json` の `"levelCap": 50` フィールドを
      `"defeatedGateLevels": []` に置き換える（どちらも現状ゲートボス討伐前のダミー状態のため、
      導出結果は従来どおり `50` のまま変わらない）
- [ ] `loadDashboard("main").state.levelCap === 50` と `loadDashboard("calibration").state.levelCap === 50`
      が既存の `src/test/data-source.test.ts` で引き続き通る（壊さない）
- [ ] `src/test/data-source.test.ts` に `defeatedGateLevels` を含むフィクスチャで
      `computeLevelCap` 経由の導出が反映されるケースを1件追加する
**対象ファイル**: `src/lib/data-source.ts`, `src/data/status.json`, `src/data/status.calib.json`
**提供**: `RawStatus.defeatedGateLevels: readonly number[]`（`levelCap` フィールドを置き換え）
**依存契約**: Issue #43 の `computeLevelCap`（`src/lib/level.ts`）
**担当**: tdd-worker
**Wave**: 2
**状態**: 未着手

#### Issue #45: ステータス一覧のキャップ到達表示（貯蓄量つき）
**目的**: キャップに到達した軸の累積EXPバーを「⛔ Lv{levelCap} 到達。ボス《…》討伐で解放」＋
貯まっている EXP 量の表示に切り替える（S-2 の画面要件）。この貯蓄が減点で消えないことは
Issue #43 が触らない `exp.ts`/`applyExpDelta` の既存不変条件（`exp.test.ts`）が担保する前提とする
**受け入れ条件**:
- [ ] `src/components/status/status-list.tsx` の `StatusRow` で、実効Lv（`levelFromExp(status.exp, levelCap)`）が
      `levelCap` に等しく、かつ `levelCap < MAX_LEVEL` のとき、通常の進捗バー（`ProgressBar` + 「次まで…EXP」）
      の代わりに「⛔ Lv{levelCap} 到達。ボス《{nextGateBoss(levelCap).name}》討伐で解放」を表示する
- [ ] 上記の代替表示に、貯まっている EXP 量 `status.exp - levelFloorExp(levelCap)` を
      `StatValue`（等幅フォント）で併記する（0のときも「0」と表示し、非表示にしない）
- [ ] `levelCap === MAX_LEVEL` のとき（最終キャップ解放後）は、実効Lvが `MAX_LEVEL` に達している軸も
      **キャップ表示にしない**（既存の「MAX」表示のまま。`nextGateBoss(MAX_LEVEL)` が `null` になることを利用する）
- [ ] 実効Lvが `levelCap` 未満の軸（キャップ未到達）は既存の進捗バー表示のまま変化しない（回帰確認）
- [ ] キャップ表示に `box-shadow`／グロー等の新規発光を追加しない
- [ ] `src/components/` に `50`/`70`/`90`/`100` などのレベル閾値・キャップ値の数値リテラルが
      出現しない（`levelCap`/`MAX_LEVEL` prop・import 経由でのみ扱う。AC-15）
- [ ] `/` を 375/768/1024/1440px で開き、`src/data/status.json` の `levelCap: 50` かつ複数軸が
      Lv50超相当の累積EXPを持つ状態（テスト用に一時的に高いEXPへ変更して確認してよいが、確認後は
      `src/data/status.json` を元の値に戻す）でキャップ表示が横スクロールを発生させないことを確認する

**最終ゲート（Wave1〜2 完了後）**:
- [ ] `npm run verify` / `npm run lint` / `npm run check:cycles`（循環0件）が通る
- [ ] `src/components/` にレベル閾値・キャップ値の数値リテラルが出現しない（AC-15）
- [ ] 375/768/1024/1440px × `/` と `/calibration` × 3タブ = 24通りすべて横スクロールなし
- [ ] Lv・EXP・HP・貯蓄量が等幅フォントで桁を揃えて表示される
- [ ] `src/test/exp.test.ts` の「applyExpDelta と levelCap（S-2 の不変条件）」が変更されずに通る
**対象ファイル**: `src/components/status/status-list.tsx`
**提供**: なし（`StatusRow` の表示分岐の追加のみ。新規のエクスポートなし）
**依存契約**: Issue #43 の `GateBoss`/`nextGateBoss`/`GATE_BOSSES`（`src/lib/types.ts`/`src/lib/level.ts`）
**担当**: tdd-worker
**Wave**: 2
**状態**: 未着手

## テスト運用までの P0（7件・2026-08-19 棚卸し）

> 本番（`13_deployment.md` §1）は稼働しているが、**盤面の状態が一切変化しない**。
> `data-source.ts` は `src/data/*.json` を import するだけで、HP・ストリーク・EXP は
> すべてダミーの固定値。デイリーのチェックは Notion に事実が溜まるだけで盤面に返らない。
> `10_notion_schema.md` §4.1 の日次フロー（①取得→②EXP→③HP→④history追記→⑤commit）は未実装で、
> `.github/` ディレクトリ自体が存在しない。
>
> **以下7件がテスト運用の開通条件。** 着手順は 1 → 3 → 4 → 5 → 2 → 6 → 7 を想定（1で骨を通し、
> 3/4で計算を正しくし、5で供給を絶やさず、2/6/7で壊れない状態にする）。

- [ ] **P0-1. 日次ジョブ本体**（03:00 JST）
  - `.github/workflows/daily.yml`（cron `0 18 * * *`）+ `scripts/daily.ts`
  - 計算関数（`exp.ts` / `penalty.ts` / `level.ts` / `skill.ts` / `work-task.ts`）は実装済み。
    欠けているのは「Notion を読む → 状態を更新する → `src/data/*.json` を書く → commit する」
    オーケストレーション層のみ
  - 順序を守ること（`10_notion_schema.md` §4.1）: ①取得 → ②EXP → ③HP更新 → ④スナップショット

- [ ] **P0-2. 二重計上の防止**
  - 同日2回実行・手動再実行で EXP が二重加算される。**現状どの docs にも書かれていない穴**
  - 必要: EXP 付与済み work task の `page_id` 台帳（`src/data/processed.json` 等）と、
    `history.json` の最終日付による実行済みガード
  - 「Notion は出来事だけを持ち、状態はリポジトリが持つ」（§3.2）ため、台帳もリポジトリ側に置く

- [ ] **P0-3. 🔥LEARNING / ⚔️EXECUTION の自動導出**
  - 加算経路が無く、日次を回しても永久に 0 のまま。TOTAL Lv と歪みメーターが機能しない＝
    本システムの核（CLAUDE.md「2軸に分離して対比する」）が死ぬ
  - `02_architecture.md` §4.5 に導出関数を追記してから実装する
  - （旧「Step 3 送り」項目を P0 に格上げ。日次ジョブが回る以上、先送りできない）

- [ ] **P0-4. デバフの付与経路と日次減衰**
  - `applyPenalty` が返すのは 🔻敗北のみ。🔻戦闘不能（HP<10）・🔻衰弱（3日連続未達）を
    `state.debuffs` に付与する経路が無い。`PenaltyKind`（`types.ts:51`）に
    「3日連続未達」を表現する値も無い
  - `Debuff.remainingDays` の日次減算・期限切れ除去も無く、一度付くと永久に残る
  - （旧「Step 3 送り」項目を P0 に格上げ）

- [ ] **P0-5. デイリーの週次供給（ロールオーバー）**
  - `fetchDailies` は `WeekOf = 今週の月曜` で引く。**次の月曜に誰も行を作らなければ
    デイリーが 0 件になる**
  - さらに `updateStreak` は `DAILY_QUEST_COUNT` と不一致のときデータ不整合として throw する契約。
    0件・件数ズレで**日次ジョブごと落ちる**
  - 必要: 週次ロールオーバー（前週分を複製し `WeekOf` 更新・`Status=todo`・探索枠1個を維持）と、
    件数ズレでジョブを止めない耐性

- [ ] **P0-6. 初期状態の確定**（★決定7により「測定期間の初期状態」になった）
  - **起点は測定期間（`phase = "calibration"`）。** 測定期間中はペナルティが全免除
    （`applyPenalty` の S-4）なので、開通に必要な実装が減る:
    ・日次ジョブは ①取得 → ②EXP → ④スナップショット のみ（③HP更新が不要）
    ・S-3（ペナルティクエスト）・P0-4（デバフ）は **14日間は発動しない**
    → **14日の測定期間を走らせながら、HP・ペナルティ側を作れる**。テスト運用の
      入り口として最も安全な順序になっている
  - `status.json` / `history.json`（90日分）/ `hall-of-fame.json` / `quests.json` はすべて架空の値。
    運用開始時点の実値に差し替える
  - 測定期間の14クエストを Quests DB に投入する（`Tier = calibration`。`00_profile.md` §8.2 の表が原典）
  - `CALIBRATION_TOTAL_QUESTS` を 18 → **14** に修正（P2 から格上げ。測定期間を実走するため必須）

- [ ] **P0-7. 失敗の可視化とデータ取りこぼしの防止**
  - 日次ジョブがコケても気づけない。GitHub Actions の失敗通知を最低限入れる
  - Notion API のページネーション（`has_more` / `start_cursor`）未対応。
    完了タスク100件超が静かに欠落する（`fetchDailies` と、これから書く work task 取得の両方）

### P1（運用しながら埋める）
- [ ] 仕事タスクの EXP 化 — 主軸/副軸の導出（`work-task.ts`）は実装済み。
  `Difficulty` / `Novelty` / `Completion` を決める GM（Step 3）が未着手
- [ ] `gameOver()` の殿堂記録のハードコード（既出。HP が実際に減り始める以上、到達しうる）
- [ ] GitHub Actions 用トークンの分離（Vercel 側は Quests DB 限定で分離済み。
  ジョブ側は work-dashboard タスクDB の読み取り権が要るため別トークンを Secrets に）
- [ ] `data-source.ts` のスキーマ検証（既出）。日次ジョブが JSON を機械生成し始めると、
  壊れた JSON が無検査で画面に流れる

### P2（記録のみ）
- [ ] `CALIBRATION_TOTAL_QUESTS = 18` → **14 が正**（`00_profile.md` §8.1 で確定済み・未反映）。
  `src/data/status.calib.json` の `"totalQuests": 18` も同じ
- [ ] `10_notion_schema.md` 冒頭の「Step 1 では実装しない」「認証方式は未確定」が実態と乖離
- [ ] 派生スキルの EXP +10%（既出）

## 仕様追加（2026-08-19 ユーザー決定）

> テスト運用の前に**レベル定義そのものが変わる**ため、P0 より先に S-1 / S-2 を確定させる。
> 順序: **S-1 → S-2 → P0-1 → P0-3 → P0-4 → S-3 → S-4 → P0-5 → P0-2 → P0-6 → P0-7**。
> S-1/S-2 を後回しにすると P0-6（初期状態の確定）をやり直すことになる。

### 決定事項

| # | 決定 |
|---|---|
| 1 | レベルを **Lv1〜100** に拡張し、ボスゲートを **Lv30 / 60 / 90** に置く |
| 2 | レベル上限は **全軸共通の単一キャップ**（ボス1体で全軸が同時に解放される） |
| 3 | デイリー未達の減点は **保留**し、当日中に挽回クエストをクリアすれば無かったことにする |
| 4 | 挽回クエストをクリアしても **ストリークは復活させない** |
| 5 | ゲートは **Lv50 / 70 / 90**（初期キャップ Lv50）。測定期間の初期Lv上限と一致させる |
| 6 | ゲートボス①②③ = **今年の合格条件3つ**（`00_profile.md` §3）。四半期ボスは上限を動かさない通常ボス |
| 7 | **測定期間14日を実走してから main に入る**（`00_profile.md` §8）。初期キャップ50の根拠を保つため |
| 8 | 仕事タスクの査定は **機械査定で暫定運用**。`Difficulty` 既定値 / `Novelty` は repeat 固定で回し、後から GM（Step 3）に差し替える |
| 9 | レーダーの軸最大値は **現在の levelCap に連動**させる（50→70→90→100）。`09_dashboard_spec.md` C-11「常に10固定」を改訂する |
| 10 | 着手順は **S-1 実装 → 実測 → docs 本体の改訂**（序盤の重さを測ってから `04_exp_rules.md` を書く） |

---

- [x] **S-1. レベルスケールの100段化（×10 リスケール方式）** — 実装完了（2026-08-19 / `develop/level-100-scale`）。
  **docs 本体の改訂だけが未了**（決定10により実測後に行う。改訂対象は本節末尾の一覧）

  **原則: 旧 Lv n = 新 Lv n×10。** 曲線を新規に引かず、既存の10段を等比補間して100段にする。
  1段あたりの増加率は `1.6^(1/10) ≒ 1.0481`（既存の「1段ごとに約1.6倍」を10分割した値）。
  **10段ごとに旧閾値へ厳密一致させる**（`T(10k+1) = 旧 LEVEL_THRESHOLDS[k]`。ディケイド末で
  丸め誤差を吸収して上書き）。これにより現在のEXP値を入れたとき**旧Lvと称号が完全に一致**し、
  移行の検算ができる。`DIFFICULTY_BASE_EXP`・HP増減・ペナルティ量など**EXP側のバランス定数は
  一切触らずに済む**。

  ```
  Lv  1 ──────────── 50 ═════ 70 ═════ 90 ═╪═ 91 ─────── 100
       0 EXP       1,501    4,103    10,761 │ 11,287     17,318
                    🔒①       🔒②      🔒③  └ 旧設計のカンスト地点
  ```

  - **訂正**: 当初「Lv100 の累積EXP = 11287 を据え置く」と記録したが、称号帯を旧Lvに
    厳密一致させるとこの2つは同時に満たせない。**旧カンスト 11287 は Lv91** に来て、
    Lv100 は 17,318 になる。ゲート③（Lv90）が旧到達点の直前に落ちるため、
    **ボス③討伐 = 旧設計では上限だった地平の先へ出る解放**という読みになる（意図せず整合した）
  - Lv1→2 の必要EXP は **8**（当初見込みの5より緩い）

  | 対象 | 変更 |
  |---|---|
  | `LEVEL_THRESHOLDS` / `MAX_LEVEL` | 10要素 → 100要素 / `10` → `100` |
  | **称号テーブル（`titles.ts`）** | **変更しない。** 10段のまま **Lv10刻みで1段昇格**させる（Lv1〜10=「学習者」…Lv91〜100=「賢者」）。`clampLevel` を `ceil(level/10)` に変えるだけで、**正典の文字列に一切触らない** |
  | `DERIVATIONS` の `requires` | `DATA Lv5`→`50` / `TECH Lv7`→`70` / `INT Lv5`→`50` / `PM Lv5`→`50` / `BRIDGE Lv5`→`50` |
  | `FINAL_CLASS_TOTAL_LEVEL` | `9` → `90` |
  | `CALIBRATION_INITIAL_LEVEL_RANGE` | `{min:1, max:5}` → `{min:10, max:50}`。**上限50 = 初期キャップ50**（S-2 の決定5。測定直後にカンストしない） |
  | `TOTAL_TITLES` の索引 | 同上（`ceil(TOTAL Lv/10)`） |
  | 画面表示 | Lv バッジの桁が2〜3桁になる。等幅フォントの桁揃え（CLAUDE.md）を3桁前提で確認する |

  - **未決**: Lv1→2 が 8 EXP（デイリー1個ぶん）で、序盤が一瞬で溶ける。「爽快」と取るか
    「軽すぎる」と取るかで序盤を厚くする補正を入れるか決める。**実測してから判断する**
    （テスト運用の目的のひとつ）
  - 改訂が要る docs: `00_profile.md` §8.3（初期Lv範囲）/ `03_status_system.md` §2/§3.2 / `04_exp_rules.md` §4 /
    `07_unique_skill.md`（派生条件）/ `09_dashboard_spec.md`（Lv表示桁）/ `01_requirements.md` FR-1-2

- [ ] **S-2. ボスゲート（レベル上限解放）**

  **やり続ければ上がり続けるのを止める装置。** ボスを倒すまで上限に張り付く。

  | 段 | 上限 | 解放条件（ゲートボス = 今年の合格条件。`00_profile.md` §3） |
  |---|---|---|
  | 初期 | **Lv50** | —（測定期間の初期Lv上限と一致させる。決定5） |
  | ① | Lv70 | **合格条件1**「AIと仕組みで他人の課題を解いた実例3件」 |
  | ② | Lv90 | **合格条件2**「解き方が再現可能な手順として言語化されている」 |
  | ③ | Lv100 | **合格条件3**「PMとしてチームを1つ、実際に前に進めた」 |

  - **四半期ボス（Q2/Q3/Q4・`00_profile.md` §3.1）はゲートではない。** HP回復と EXP のみの
    通常ボスとして扱い、上限は動かさない。ゲートボスは上記3体だけ
  - これで `00_profile.md` §3.2「ボスは自分で考えて設定するものではない。逆算から降ってくる。
    **ボスを新規に発明してはならない**」と衝突しない（合格条件の転記であって発明ではない）
  - **`05_quest_design.md` §5 の「未確定: ボス討伐の大報酬が未決。ここが空欄だとボス制度が
    機能しない」は S-2 で解消した。** 大報酬 = レベル上限の解放。§5 の未確定マークを外すこと
  - **設計上の副作用（意図した効果として受け入れる）**: 測定期間で Lv50 と出た得意軸は
    直後にキャップに張り付き、合格条件1を満たすまで**数ヶ月動かない**。その間 EXP は貯まるので
    損はしないが「伸びが見えない」期間が生じる。一方で弱い軸は 50 まで余裕があるため伸び続け、
    **レーダーの形が整う方向に働く**。CLAUDE.md「弱い領域が得意領域の陰に隠れて放置される」の
    構造的な解決になっているため、これは仕様として維持する

  - **EXP はキャップ中も加算し続ける**（ユーザー明示）。表示・実効 Lv は
    `min(levelFromExp(exp), levelCap)`。**解放した瞬間に貯めた分で一気に上がる**
  - 称号・派生スキル・最終クラス・TOTAL Lv は**すべてキャップ後の実効Lv**で判定する
    （貯蓄分で称号だけ先に進む、という抜けを作らない）
  - 実装: `level.ts` に cap 引数 / `GameState` に `levelCap` / `constants.ts` に
    `LEVEL_CAP_GATES = [50, 70, 90, 100]`
  - 画面: キャップ到達時は EXP バーを別扱いにし「⛔ Lv50 到達。ボス《…》討伐で解放」と
    **貯まっている EXP 量**を見せる（貯蓄が見えないと止まっている理由が伝わらない）
  - **要設計**: キャップに到達したのにボスが未設定だと詰む。到達前に警告を出すか、
    未設定でも到達を許して「ボス未設定」を画面に出すかを決める

- [ ] **S-3. ペナルティクエスト（保留方式）**

  ```
  03:00  未達検知 → 減点(-10 HP / -10 EXECUTION)を保留。HP は動かさない
                  → ペナルティクエストを Notion に発行（Tier=penalty / 期限=当日中）
         ↓ 当日中にクリア   → 保留を破棄。HP は無傷
         ↓ 未クリア         → 翌 03:00 に確定適用（HP-10）
  ```

  - `GameState` に `pendingPenalties: { kind, questId, dueDate, hpDelta, expDeltas }[]` を新設
  - **ストリークは保留しない。** 未達の時点で 0 にリセットし、挽回しても復活させない（決定4）
  - **ペナルティクエストに EXP を付けない**（付けると未達が得になる）
  - **挽回の挽回は不可**。ペナルティクエストの未達に対して新たなペナルティクエストを出さない
  - **要設計**: ① 保留中に別のペナルティが確定して HP が 0 に届いた場合の GAME OVER 判定順序
    ② 日次ジョブの再実行で保留が二重に確定しないこと（P0-2 の台帳と同じ問題）
    ③ 測定期間（`phase==="calibration"`）は全ペナルティ免除なので**保留も作らない**
    （`applyPenalty` の S-4 免除判定の入口1箇所に揃える。C-9 を壊さない）
  - **要決定**: ペナルティクエストの中身を誰が作るか。GM（Step 3）が未着手のため、
    当面は「未達したデイリーを翌日にもう一度こなす」の機械生成テンプレで回す想定

- [ ] **S-4. Notion Quests DB の拡張**

  緊急・ミッション・ボスを**自分で設定できる状態になっていない**。現在の11プロパティでは
  `Deadline` が存在しないため、`types.ts` が必須とする `deadline` を Notion から与えられない。

  | プロパティ | 型 | 用途 |
  |---|---|---|
  | `Tier`（選択肢追加） | Select | `urgent`（⚡緊急/ゲリラ）・`mission`（📜ミッション）・`penalty`（S-3）を追加 |
  | `Deadline` | Date | **新設。** 緊急・ミッション・ボス・ペナルティに必須 |
  | `HpReward` | Number | ボス討伐時の HP 回復量（`Boss.hpReward`） |
  | `UnlockLevel` | Number | S-2 のゲート段（30 / 60 / 90 / 100） |
  | `PenaltyFor` | Text | ペナルティクエストが、どの未達デイリーに対応するか |

  - これは `10_notion_schema.md` §1「📜ミッション・⚡ゲリラの実体を status-board に持たない」
    からの**方針変更**にあたる。ボス・緊急は業務タスクではなく自分で立てる挑戦であり、
    work-dashboard に置く方が筋が悪いため。§1 の表と §3 の表を改訂すること
  - 作成は API スクリプトで行う（手動は選択肢の打ち間違いが起きやすい。§3 の前例に倣う）

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

### この実装で新たに生じた docs の追随（`/spec-sync` 対象）— **2026-09-10 完了**（`docs/WORK_LOG/2026-09-10.md`）
- [x] `09_dashboard_spec.md` §2.1 の ASCII 例「次のLvまで 461 EXP」
  - TOTAL Lv は9軸の加重平均であり単一の累積EXPを持たない。同節の表は
    「EXPバー | TOTAL Lv の小数部を進捗として描画する」と正しく書かれており、
    ASCII 例だけが EXP 残量になっていて矛盾する。実装は小数部の残りを表示している
- [x] `07_unique_skill.md:20`「レーダーチャートの中心に紋章、その直下にスキルツリーパネル」
  - G の順序変更（一覧 → 歪み → 固有スキル）と衝突する。紋章がレーダー中心にある構造は
    変わっていないため、パネル位置の記述のみ改訂する
- [x] `09_dashboard_spec.md` §5（測定期間モード）に歪みメーターの扱いを追記
  - LEARNING/EXECUTION が未測定のとき歪みメーターを非表示にしている（Wave 8 の team-lead 判断）。
    表に行が無いため記載が必要

### docs の旧Lv10段スケール残存（対象候補ファイル外・未対応/ `/spec-sync` 対象）（2026-09-10 時点）

> 由来: Issue D-1（`01e6708`）で発見。仕様書の「対象候補ファイル」（`00_profile.md` /
> `01_requirements.md` / `03_status_system.md` / `04_exp_rules.md` / `07_unique_skill.md` /
> `09_dashboard_spec.md`）に含まれていなかったため意図的に未着手とした。

- [ ] `docs/02_architecture.md:235` — `FINAL_CLASS_TOTAL_LEVEL = 9` と書かれているが
  実際は **90**（`src/lib/constants.ts:88` 実測）
- [ ] `docs/02_architecture.md:229-233` — `DERIVATIONS` が `level: 5 / 7` のままだが
  実際は **50 / 70**（`src/lib/constants.ts:82-86` 実測）
- [ ] `docs/06_penalty.md:212` — P-3 の検証項目が「Lv5（下限926）・累積940 → Lv5」の
  旧10段表記のまま
- [ ] `docs/02_architecture.md:208-209` — `LEVEL_THRESHOLDS` が旧10要素のまま、かつ
  `MAX_LEVEL = 10` と書かれているが、実際は `MAX_LEVEL = 100` / 閾値は100段
  （`src/lib/constants.ts:14,36` 実測）。しかもこの記述は `docs/02_architecture.md:207` で
  **`04_exp_rules.md §4` を出典として明記したまま**なので、D-1 で `04_exp_rules.md` を
  100段に改訂した結果、**出典と本文が矛盾した状態**になっている

放置リスク: **別エージェントが `docs/02_architecture.md` を一次情報として誤読する**。
特に4件目は出典表記（`04_exp_rules.md §4`）が付いたまま矛盾しているため、
出典表記を信頼してそのまま旧値を採用してしまうリスクが他の3件より高い。

注意: `docs/06_penalty.md:190` と `docs/11_design_system.md:43` の「71〜100」は
**HP の帯であってレベルではない**ので改訂対象外。

補足（レビューで併せて発見された別件・Lv100化とは無関係）: `docs/02_architecture.md:244` の
`HP_COLOR_THRESHOLDS` 相当の記述が `{safe:50, warn:25}` のままだが実際は
**70 / 40**（`src/lib/constants.ts:175` 実測）。`06_penalty.md` の別改訂に伴う既存の残存。

`02_architecture.md` は **architect 管轄の可能性がある**ため、着手前に担当を確認すること。

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
