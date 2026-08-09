# 10. Notion スキーマ（Step 3 の実装仕様）

> **本書は Step 3 のための仕様であり、Step 1 では実装しない。**
> Step 1 は `src/data/*.json` の静的ダミーのみで動く（`01_requirements.md` FR-9）。

---

## 1. Step 3 の方針（確定事項）

| 項目 | 決定 |
|---|---|
| DB の作成方法 | **手作業で作らず、スクリプトから Notion API で自動作成する** |
| データ取得 | Notion API 経由 |
| スナップショット | **GitHub Actions で日次**取得し、履歴を蓄積する |
| 認証 | Notion Integration Token を**環境変数**で渡す（リポジトリにコミットしない） |
| 費用 | Notion 無料枠 / GitHub Actions 無料枠の範囲に収める |
| 操作端末 | **スマホから触る**前提（NFR-5 で 375px 必須としている理由） |

---

## 2. 必要なデータベース（想定）

Step 1 の型（`src/lib/types.ts`）と1:1で対応させる。**確定は Step 3 で行う。**

| DB | 対応する型 | 主な用途 |
|---|---|---|
| Quests | `Quest` | デイリー / ゲリラ / ミッション / ボス の管理 |
| Snapshots | `Snapshot` | 日次のステータス・HP・ストリークの記録（履歴グラフの元） |
| DefeatLog | `DefeatEntry` | 敗北ログ |
| HallOfFame | `HallOfFameEntry` | 殿堂（周回記録） |

### 2.1 Quests DB に必要なプロパティ（EXP式から逆算）

`04_exp_rules.md` の計算式を成立させるために、最低限これらが必要になる。

| プロパティ | 型 | 必須 | 用途 |
|---|---|---|---|
| Name | Title | ✓ | クエスト名 |
| Tier | Select（daily / guerrilla / mission / boss） | ✓ | 4階層 |
| Difficulty | Select（D1〜D5） | ✓ | 基礎値の決定 |
| Novelty | Select（first / repeat / mastered） | ✓ | 新規性倍率 |
| MainStatus | Select（**専門7つのみ**） | ✓ | 主ステータス |
| SubStatus | Select（専門7つのみ / 空可） | | 副ステータス（50%換算） |
| InvolvedStatuses | Multi-select | ✓ | **3つ以上で《構造化》発動**（EXP加算先とは別概念） |
| Completion | Number（0.0〜1.0） | ✓ | 完遂度 |
| Evidence | URL / Files | ✓ | **無ければ EXP 0** |
| Deadline | Date | | ゲリラ・ミッション・ボスの期限 |
| Status | Select（todo / done / failed） | ✓ | 完了・失敗判定 |
| InvolvesOthers | Checkbox | | **BRIDGE 加算の可否**（他者が絡むか） |

> **ルール**: `MainStatus` / `SubStatus` の選択肢に **LEARNING / EXECUTION を含めない**
> （`03_status_system.md` §1.1 の禁止事項。Notion 側の選択肢定義でも防ぐ）。

---

## 3. 未確定事項（Step 3 で確定させる）

| 項目 | 状態 |
|---|---|
| 各 DB の正式なプロパティ定義・ID | **未確定** |
| 証拠の標準形式（URL / スクショ / ファイル） | **未確定**（`01_requirements.md` §6） |
| デイリー5個の実際の中身 | **未確定**。Step 3 で本人にヒアリング |
| 測定期間 18クエストの中身 | **未確定**。Step 3 で GM と組む |
| スナップショットの取得時刻・タイムゾーン | **未確定** |
| Notion → ダッシュボードの同期方式（ビルド時取得 / API Route / 静的生成） | **未確定** |

> **注意**: 本書はまだ実装仕様として完成していない。Step 3 着手時に、
> ユーザーとの決定事項を反映して**確定版に書き換える**こと。
> Step 1 の実装者はこのファイルを参照する必要はない。
