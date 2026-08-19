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
  - 次の一手: 下記「仕様追加（2026-08-19 ユーザー決定）」の S-1 → S-2 を先に確定させ、
    その後「テスト運用までの P0（7件）」を進める

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

- [ ] **P0-6. 初期状態の確定**
  - `status.json` / `history.json`（90日分）/ `hall-of-fame.json` / `quests.json` はすべて架空の値。
    運用開始時点の実値に差し替える
  - 前提となる決定: 測定期間14日を実走してから main に入るか、Lv1・HP100・履歴空から即 main で始めるか

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

---

- [ ] **S-1. レベルスケールの100段化（×10 リスケール方式）**

  **原則: 旧 Lv n = 新 Lv n×10。** 曲線を新規に引かず、既存の10段を等比補間して100段にする。
  1段あたりの増加率は `1.6^(1/10) ≒ 1.0481`（既存の「1段ごとに約1.6倍」を10分割した値）で、
  **Lv100 の累積EXP = 11287 は据え置く**。これにより `DIFFICULTY_BASE_EXP`・HP増減・
  ペナルティ量など**EXP側のバランス定数を一切触らずに済む**。

  | 対象 | 変更 |
  |---|---|
  | `LEVEL_THRESHOLDS` / `MAX_LEVEL` | 10要素 → 100要素 / `10` → `100` |
  | **称号テーブル（`titles.ts`）** | **変更しない。** 10段のまま **Lv10刻みで1段昇格**させる（Lv1〜10=「学習者」…Lv91〜100=「賢者」）。`clampLevel` を `ceil(level/10)` に変えるだけで、**正典の文字列に一切触らない** |
  | `DERIVATIONS` の `requires` | `DATA Lv5`→`50` / `TECH Lv7`→`70` / `INT Lv5`→`50` / `PM Lv5`→`50` / `BRIDGE Lv5`→`50` |
  | `FINAL_CLASS_TOTAL_LEVEL` | `9` → `90` |
  | `CALIBRATION_INITIAL_LEVEL_RANGE` | `{min:1, max:5}` → `{min:10, max:50}`。**上限50 = 初期キャップ50**（S-2 の決定5。測定直後にカンストしない） |
  | `TOTAL_TITLES` の索引 | 同上（`ceil(TOTAL Lv/10)`） |
  | 画面表示 | Lv バッジの桁が2〜3桁になる。等幅フォントの桁揃え（CLAUDE.md）を3桁前提で確認する |

  - **未決**: 等比補間だと Lv1→2 の必要EXPが **約5**（デイリー1個ぶん）になる。
    序盤が一瞬で溶けるのを「爽快」と取るか「軽すぎる」と取るかで、序盤を厚くする補正を
    入れるか決める。**実測してから判断する**（テスト運用の目的のひとつ）
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
