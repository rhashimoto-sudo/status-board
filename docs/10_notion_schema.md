# 10. Notion スキーマ

> **Step 1（静的ダミー）では実装しない。** Step 1 は `src/data/*.json` のみで動く。
> 本書は work-dashboard の実装調査（2026-08-15）を反映した確定版。

---

## 1. 前提 — 2つのシステムの役割分担

status-board は**入力面を持たない**。日々の業務の入力は既存の work-dashboard
（`/Users/r.hashimoto/Desktop/開発/work-dashboard`）が担う。

| | 🗂 work-dashboard | 🎮 status-board |
|---|---|---|
| 扱うもの | 業務タスク・プロジェクト・個人ミッション | 成長の評価・可視化 |
| 粒度 | タスク（やること） | クエスト（評価の単位） |
| 時間軸 | 今日・今週 | 四半期・年 |
| 入力 | **ここで入力する** | デイリーのチェックのみ |

> **ルール**: 📜ミッション・⚡ゲリラの**実体を status-board に持たない**。
> work-dashboard の「プロジェクト → フェーズ → タスク」がその構造そのものであり、
> 二重に持つと必ずズレる。status-board は `page_id` で**参照するだけ**。

---

## 2. work-dashboard 側の既存構造（読み取り専用で使う）

DB は**単一のタスクDB**。`種別`(select) と `親`(relation・自己参照) でツリーを表現している。

| 概念 | 表現 |
|---|---|
| プロジェクト | `種別 = プロジェクト`、`親` なし |
| フェーズ | `種別 = フェーズ`、`親` = プロジェクト |
| タスク | `種別 = タスク`、`親` = フェーズ or プロジェクト |

### 2.1 status-board が使うプロパティ

| プロパティ | 型 | status-board での用途 |
|---|---|---|
| （page.id） | UUID | **証拠の一意キー**。独自採番は存在しない |
| `名前` | title | クエスト名 |
| `ステータス` | select | **`完了` で EXP 算出の対象になる** |
| `完了日` | date | **JST で自動打刻される**。日次集計の基準日 |
| `領域` | select（SEO / MEO / AI開発 / 店頭改善 / その他） | **9軸の推定材料** |
| `作業種別` | select（9分類） | **9軸・難易度の推定材料** |
| `見積工数` | number | **難易度の推定材料** |
| `優先度` | select | 難易度の補助材料 |
| `親` | relation | プロジェクト・個人ミッションの判別 |

> **`完了` は select であって checkbox ではない。** チェックボックスを探しに行かないこと。

### 2.2 証拠（Evidence）の形式 — 確定

> **証拠 = work-dashboard のタスクへの `page_id` 参照。**

自由記述でも URL 入力でもない。表示用 URL は page_id から決定的に合成できる:

```
https://www.notion.so/{page_id からハイフンを除去した32桁}
```

**この形式を採った理由**（`01_requirements.md` §6「証拠の運用」への回答）:

- 当初案の「URL / ファイル必須、無ければ EXP 0」は**軸によって不公平**だった。
  TECH・DATA は成果物が残るが、INT・PM・BRIDGE は残りにくく、
  **今年の主戦場（`00_profile.md` §4）ほど構造的に不利**になる
- タスク参照なら、成果物が残らない仕事も**タスクとしては実在する**ので全軸で同条件になる
- タスクの期日・完了状態・完了日が向こうにあるため**自己申告で盛れない**
- **入力が増えない**。既に業務で入れているものを指すだけ

### 2.3 個人ミッション

work-dashboard の Notion に PJ 行として**既に存在する**（`3bd93e5f-646a-81e2-a500-caf075a6ce9e`。
2026-08-15 時点で配下タスクは 0 件）。判別用のプロパティは無く、work-dashboard 側は
**PJ タイトル定数**（`PRIVATE_PROJECT_TITLES = ['個人ミッション']`）で判別して
ダッシュボードから除外する方針が確定している（work-dashboard `docs/TODO.md`。未実装）。

> **work-dashboard では非表示、status-board が拾う。** 役割分担として噛み合っている。
> status-board 側も**同じ PJ タイトル定数方式に合わせる**（プロパティを増やさない）。

---

## 3. status-board Quests DB（新規に作る唯一の DB）

work-dashboard に置けない概念だけを持つ。**仕事のタスクはここに入れない。**

> **状態: 作成済み**（2026-08-15）。DB「status-board Quests」に以下11プロパティを
> Notion API で作成し、`MainStatus` に土台2軸が含まれないことを検証済み。

| プロパティ | 型 | 誰が書くか | 備考 |
|---|---|---|---|
| `名前` | Title | 本人 / GM | Notion 既定のタイトル。**日本語名のまま**（リネームしない） |
| `Tier` | Select（`daily` / `boss` / `calibration`） | 自動 | |
| `Status` | Select（`todo` / `done` / `failed`） | **本人** | デイリーはここだけ触る |
| `WeekOf` | Date | 自動 | 週次ロックの単位（月曜） |
| `Exploration` | Checkbox | GM | **週5個のうち必ず1個**（`05_quest_design.md` §2.4） |
| `MainStatus` | Select（**専門7軸のみ**） | GM | |
| `Difficulty` | Select（D1〜D5） | GM | **ボス・測定期間のみ**。デイリーは持たない |
| `Novelty` | Select（first / repeat / mastered） | GM | 同上 |
| `Completion` | Number（0.0〜1.0・**%表示**） | GM | 同上。スマホで判断が速いよう percent 書式にした |
| `ForWhom` | Text | 本人（任意） | **EXP 計算に入れない。表示のみ**（`00_profile.md` §6.5） |
| `WorkTaskId` | Text | GM | work-dashboard の page_id。ボス・測定期間の証拠 |

> **ルール**: `MainStatus` の選択肢に **LEARNING / EXECUTION を含めない**
> （`03_status_system.md` §1.1）。UI で禁止するだけでなく **Notion の選択肢定義の側でも塞ぐ**。
> データの入口で構造的に不可能にしておかないと、Notion から直接編集された時に破れる。

### 3.1 デイリーは査定を通さない

デイリー5個は `Difficulty` / `Novelty` / `Completion` を**持たない**。EXP は 5〜15 の固定。

**理由**: 毎日5回の GM 査定は運用が持たない。またデイリーは「難しさ」ではなく
**「毎日必ず全部やる」という一点だけ**を測る装置である（`05_quest_design.md` §2.1
「部分達成を認めない」の主旨）。難易度を測る対象は仕事タスク・ボス・測定期間の3つ。

### 3.2 作らない DB とその理由

| DB | 判断 | 理由 |
|---|---|---|
| Snapshots | **作らない** | HP・EXP・Lv は**計算結果**。Notion にも置くと計算元とズレ、どちらが正か決められなくなる |
| DefeatLog | **作らない** | 同上。失敗は Quests の `Status = failed` から導出できる |
| HallOfFame | **作らない** | 同上 |

> **原則**: **Notion は「出来事」だけを持つ。「状態」はリポジトリが持つ。**
> `exp.ts` / `penalty.ts` / `level.ts` が唯一の計算元という契約（`08_gm_learning_loop.md`）を守る。
> 履歴は GitHub Actions が `src/data/history.json` に追記し、git がその変更履歴を持つ。

---

## 4. 接続方式

**status-board から Notion API を直接叩く。** work-dashboard の `/api/tasks` は経由しない。

**理由**: work-dashboard の API は Basic 認証 middleware の配下にあり、
かつ**単一 id を引く GET エンドポイントが存在しない**（`[id]` は PATCH のみ）。
経由すると両者が結合し、work-dashboard の変更が status-board を壊しうる。
同じ Integration Token で両方の DB を直接読めるため、経由する利点が無い。

> Notion の Integration は **DB ごとに接続を許可する**方式。
> Quests DB と work-dashboard タスクDB の**両方に接続**しておくこと（片方だけだと 404）。

### 4.1 同期フロー

```
Notion（work-dashboard タスクDB + status-board Quests DB）
   │  GitHub Actions / 日次 03:00 JST
   ▼
 ① 完了タスクを取得（完了日ベース）
 ② GM が査定 → exp.ts で EXP 算出
 ③ 未達判定 → penalty.ts で HP 更新
 ④ スナップショットを history.json に追記
 ⑤ src/data/*.json を commit
   ▼
Vercel が push を検知して自動再デプロイ
```

**この方式を採った理由**:

- Step 1 が既に `src/data/*.json` の上に組まれているので**アプリ側の変更が要らない**
- **Vercel に Notion トークンを置かなくて済む**
- Notion が落ちてもダッシュボードは生きたまま
- **git 履歴がそのままスナップショット履歴になる**（無料）

### 4.2 実行時刻を 03:00 JST にする理由

0:00 だと**日をまたいで作業した分が翌日に計上される**。3:00 なら実質的な一日の終わりに合う。
GitHub Actions の cron は UTC なので `0 18 * * *`。

`DISPLAY_TIME_ZONE = "Asia/Tokyo"`（`src/lib/constants.ts`）で確定済み。
work-dashboard の `完了日` も JST で打刻されるため一致する。

> **順序を守ること**: ① 取得 → ② EXP → ③ HP更新 → ④ スナップショット。
> ④ を先にやると更新前の HP が記録される。

---

## 5. デイリーのチェックを status-board 上で行う（要・認証設計）

**確定事項**: デイリーのチェックは **status-board の画面上で**付ける。

これは Step 1 の構成に対する変更を伴う。status-board は現在**静的生成の公開 URL**であり、
ログインの概念が無い。書き込みを足すと**誰でも押せる状態**になるため、認証が必須になる。

| 必要になるもの | 状態 |
|---|---|
| 書き込み API Route（`Status` の更新） | 未実装 |
| 認証（work-dashboard と同じ Basic 認証を想定） | **方式未確定** |
| チェック用のクライアントコンポーネント | 未実装 |
| 静的生成との両立（該当ページのみ動的化） | 未検討 |

> **注意**: これにより「Vercel に Notion トークンを置かない」（§4）が
> **デイリーのチェック経路についてのみ崩れる**。書き込みは Vercel 上で実行されるため。
> トークンの権限を Quests DB のみに絞ることで影響範囲を限定する
> （**work-dashboard タスクDB への書き込み権限を与えない**）。

---

## 6. 環境変数

ひな形は `.env.example`。実値は `.env.local`（`.gitignore` の `.env*` で除外済み）。

| 変数 | 用途 |
|---|---|
| `NOTION_API_KEY` | Integration Token。**`NEXT_PUBLIC_` を付けない** |
| `NOTION_QUESTS_DB_ID` | status-board Quests DB（新規） |
| `NOTION_TASKS_DB_ID` | work-dashboard タスクDB（既存・**読み取り専用**） |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | 書き込み保護（§5。方式未確定） |

> **ルール**: status-board から work-dashboard タスクDB に**書き込まない**。
> 書き込み元は work-dashboard だけとする。

---

## 7. 未確定事項

| 項目 | 状態 |
|---|---|
| デイリーのチェックの認証方式（§5） | **未確定**。Basic 認証が第一候補 |
| `領域` / `作業種別` → 9軸のマッピング表 | **未確定**。GM の推定精度を決める |
| `見積工数` / `優先度` → D1〜D5 のマッピング | **未確定** |
| 完了タスクのうち EXP 対象にする範囲 | **未確定**（全件か、選別するか） |
| デイリー5個の実際の中身 | 未確定（`00_profile.md` §8 の測定期間後に確定） |
| Quests DB の Notion 上での作成手順（手動 / スクリプト） | 未確定 |
