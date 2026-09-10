# 03. ステータス体系・称号

> 称号の文言の正典は `01_requirements.md` FR-1-2。本書はその実装仕様（データ構造・判定・表示）を定める。
> 実装は `src/lib/titles.ts`（テーブル）と `src/lib/level.ts`（Lv判定）に分ける。

---

## 1. 9ステータス

軸の順序は**レーダーの描画順**であり、関連の強いものを隣接させるために固定する。
**ステータス一覧（テキスト表示）も同じ順序**に揃える。

| # | key | 表示 | 区分 | 意味 |
|---|---|---|---|---|
| 1 | `INT` | 🧠 INT | 専門 | 思考力・論理構成・抽象化 |
| 2 | `TECH` | 💻 TECH | 専門 | 実装力・技術理解 |
| 3 | `DATA` | 📊 DATA | 専門 | データ分析・統計・可視化 |
| 4 | `MARKETING` | 📣 MARKETING | 専門 | 市場理解・訴求設計・需要創造 |
| 5 | `PM` | 👑 PM | 専門 | 計画・進行管理・リスク統制 |
| 6 | `BRIDGE` | 🤝 BRIDGE | 専門 | 他者との橋渡し・合意形成 |
| 7 | `ENGLISH` | 🌎 ENGLISH | 専門 | 英語での読解・会話・交渉 |
| 8 | `LEARNING` | 🔥 LEARNING | 土台 | **知らないことを知る力**（自動導出） |
| 9 | `EXECUTION` | ⚔️ EXECUTION | 土台 | **知っていることを実際にやる力**（自動導出） |

```ts
// src/lib/constants.ts — 描画順の唯一の定義
export const STATUS_ORDER = [
  "INT", "TECH", "DATA", "MARKETING", "PM", "BRIDGE", "ENGLISH", "LEARNING", "EXECUTION",
] as const;
export type StatusKey = (typeof STATUS_ORDER)[number];
```

> **ルール**: 軸順は `STATUS_ORDER` を**唯一の定義**とし、レーダー・一覧・チャート凡例はすべてこれを参照する。
> コンポーネントごとに配列をハードコードしない（順序がズレるとレーダーの形が意味を失うため）。

### 1.1 専門と土台の違い

| | 専門7つ | 土台2つ |
|---|---|---|
| EXP付与 | クエストの**主・副として直接付与** | **手入力不可。自動導出のみ** |
| 導出元 | — | LEARNING = 新規性ぶん / EXECUTION = 完了・ストリーク・期限内達成 |
| UI での選択 | 選べる | **選択肢に出さない** |

> **ルール**: LEARNING / EXECUTION を主・副ステータスとして選択できる導線を作らない。
> UI・型の両方で禁止する（`MainStatusKey` を専門7つに絞った型として定義する）。

```ts
// src/lib/types.ts
export type SpecialtyStatusKey = "INT" | "TECH" | "DATA" | "MARKETING" | "PM" | "BRIDGE" | "ENGLISH";
export type FoundationStatusKey = "LEARNING" | "EXECUTION";
export type StatusKey = SpecialtyStatusKey | FoundationStatusKey;
// クエストが指定できるのは専門のみ
export type MainStatusKey = SpecialtyStatusKey;
```

---

## 2. 称号テーブル（90 + 総合10）

各ステータスは Lv1-100 を Lv10刻みの帯（`TITLE_BAND_SIZE = 10`。Lv1-10=第1帯 … Lv91-100=第10帯）に
区切り、帯ごとに称号を持つ。称号テーブル自体は Issue #25（100段化）でも**10段のまま変更していない**
（帯の刻みが1Lvから10Lvに広がっただけ）。**計 9 × 10 = 90 称号**、加えて**総合称号 10 件**。

### 2.1 専門ステータス

> **ルール**: 称号はユーザー提示の**正典**。表記・順序を**一字一句変更してはならない**。
> 下記の重複は**意図的**であり、重複解消のためのリネームを**禁止**する。
>
> | 重複する称号 | 該当 |
> |---|---|
> | 「学習者」 | 🧠INT Lv1 = 🔥LEARNING Lv1 |
> | 「探索者」 | 🧠INT Lv2 = 🔥LEARNING Lv2 = 総合 Lv2 |
> | 「推進者」 | 👑PM Lv3 = ⚔️EXECUTION Lv6 |
>
> **称号文字列は一意ではない。** 称号をキーにしてステータスを逆引きする実装をしてはならない
> （必ず `StatusKey` + `level` の組で扱う）。

| Lv | 🧠INT | 💻TECH | 📊DATA |
|---|---|---|---|
| 1 | 学習者 | PC使い | データ入門者 |
| 2 | 探索者 | コード探索者 | データ探索者 |
| 3 | 思考者 | コーダー | データアナリスト |
| 4 | 分析者 | AIコーダー | SQLアナリスト |
| 5 | 論理家 | AI開発者 | データサイエンティスト |
| 6 | 問題解決者 | システム開発者 | 統計分析者 |
| 7 | 戦略家 | ソフトウェア設計者 | モデリング設計者 |
| 8 | 構造設計者 | システムアーキテクト | データ戦略家 |
| 9 | 思考指揮者 | AIエンジニア | データサイエンスリーダー |
| 10 | 賢者 | AIマスター | データマスター |

| Lv | 📣MARKETING | 👑PM | 🤝BRIDGE |
|---|---|---|---|
| 1 | マーケ入門者 | 参加者 | 聞き手 |
| 2 | マーケター | タスク実行者 | 翻訳者 |
| 3 | SEOマーケター | 推進者 | 調整役 |
| 4 | グロースマーケター | プロジェクトリーダー | ファシリテーター |
| 5 | データマーケター | PM | ブリッジャー |
| 6 | マーケ戦略家 | プロジェクト設計者 | ソリューション設計者 |
| 7 | グロース設計者 | プロジェクト統括者 | 組織横断者 |
| 8 | 事業マーケター | プログラムマネージャー | ビジネスアーキテクト |
| 9 | マーケティングアーキテクト | 事業推進者 | トランスフォーマー |
| 10 | マーケティングマスター | プロジェクトマスター | ビジネス・テクノロジー・マスター |

### 2.2 ENGLISH・土台2つ・総合

| Lv | 🌎ENGLISH | 🔥LEARNING | ⚔️EXECUTION | 総合（TOTAL） |
|---|---|---|---|---|
| 1 | 英語学習者 | 学習者 | 着手者 | 初心者 |
| 2 | 英語読解者 | 探索者 | 行動者 | 探索者 |
| 3 | 英語情報収集者 | 習得者 | 実行者 | 実践者 |
| 4 | 英語コミュニケーター | 自走学習者 | 遂行者 | 専門職 |
| 5 | 英語実務者 | 応用者 | 習慣化者 | 複合スキルワーカー |
| 6 | バイリンガルワーカー | 統合者 | 推進者 | クロスファンクショナル人材 |
| 7 | グローバルリサーチャー | 高速習得者 | 完遂者 | テクノロジスト |
| 8 | グローバルコミュニケーター | 学習設計者 | 実行設計者 | ビジネスアーキテクト |
| 9 | グローバルブリッジャー | 知識創造者 | 結果創出者 | **AIビジネスアーキテクト** |
| 10 | バイリンガルマスター | 学習の達人 | 実行の達人 | トランスフォーメーションリーダー |

#### 最終クラス《AIビジネスアーキテクト》

```
AI × DATA × MARKETING × PM × ENGLISH
「マーケティングを理解し、データで課題を分析し、AIで仕組みを作り、
  英語で世界の知識を取り込み、PMとして現場に実装する。」
```

> **注意**: 最終クラスは **TOTAL Lv81-90帯の称号**であり Lv91-100帯（「トランスフォーメーションリーダー」）
> ではない。到達条件は **TOTAL Lv90 到達（`floor(totalLv) >= 90`）+ 派生スキル5種すべての解放**（`07_unique_skill.md` §4.1）。

### 2.3 データ構造

```ts
// src/lib/titles.ts
export const TITLES: Record<StatusKey, readonly string[]> = {
  INT: ["学習者", "探索者", /* ... Lv1..Lv10 の10件 */],
  // ... 9キー分
};
export const TOTAL_TITLES: readonly string[] = ["初心者", "探索者", /* ... 10件 */];

export function titleFor(key: StatusKey, level: number): string;   // level: 1..10
export function totalTitleFor(totalLevel: number): string;         // floor した整数を渡す
```

> **ルール**: 各配列は**必ず10要素**。`titleFor` は Lv を `1..10` にクランプしてから引く
> （範囲外の Lv が来ても例外を投げず、両端の称号を返す）。

---

## 3. Lv と称号の判定

### 3.1 ステータス Lv・levelCap

累積EXP から算出する（`04_exp_rules.md` §4）。閾値は `LEVEL_THRESHOLDS`（100要素）、判定は `>=`。
**実効Lv** はこの算出Lvに `levelCap`（`03_status_system.md` の対象外。全軸共通の単一キャップ。
`04_exp_rules.md` §4.3 / `01_requirements.md` FR-2-2 が正典）を適用した値であり、称号・派生・TOTAL Lv の
判定はすべて実効Lvを使う。称号は算出Lvではなく実効Lvを **Lv10刻みの帯**へ丸めた上で引く。

```
rawLevel   = 「exp >= LEVEL_THRESHOLDS[i]」を満たす最大の i+1  （上限 MAX_LEVEL=100）
effLevel   = min(rawLevel, levelCap)
band       = ceil(floor(effLevel) / TITLE_BAND_SIZE)          （TITLE_BAND_SIZE=10。上限10にクランプ）
title      = TITLES[key][band - 1]
```

> **注意**: EXP減点のフロア（`04_exp_rules.md` §6）は **levelCap を適用しない rawLevel** を基準にする。
> 実効Lvでフロアすると、キャップ到達中に貯めた EXP が減点のたびに削られてしまう
> （`src/test/exp.test.ts`「applyExpDelta と levelCap（S-2 の不変条件）」で固定されている）。

### 3.2 総合称号（TOTAL）

```
TOTAL Lv = 上位5ステータスの実効Lv平均 × 0.6 + 全9ステータスの実効Lv平均 × 0.4
総合称号 = TOTAL_TITLES[ceil(floor(TOTAL Lv) / TITLE_BAND_SIZE) - 1]
```

- 「上位5」は実効Lv降順で上位5件。**同値の場合は `STATUS_ORDER` で先にあるものを優先**する（順序を決定的にするため）
- TOTAL Lv は小数第1位まで保持して表示し（例: `Lv 42.3`）、**称号判定には `floor()` した整数**を使う
- `floor` した結果を `TITLE_BAND_SIZE`（10）刻みの帯に丸め、`1..10` にクランプする

> **注意**: 最終クラス《AIビジネスアーキテクト》は **TOTAL Lv81-90帯の称号**であり、
> **派生スキル5種すべての解放も到達条件**に含む（`07_unique_skill.md` §4.1）。
> TOTAL Lv が 90 に達しただけでは最終クラスに到達しない。
> `totalTitleFor` は Lv のみを見て称号文字列を返すため、
> **最終クラス到達の判定だけは派生解放状況を併せて確認する**専用関数を用意する。

```ts
export function isFinalClassReached(totalLevel: number, statuses: StatusMap, levelCap: number): boolean {
  return Math.floor(totalLevel) >= FINAL_CLASS_TOTAL_LEVEL && allDerivationsUnlocked(statuses, levelCap);
}
// FINAL_CLASS_TOTAL_LEVEL = 90（Issue #25 で 9 → 90 に100段化）
```

---

## 4. 測定期間中の表示（`phase === "calibration"`）

| 状態 | 表示 |
|---|---|
| 未測定の軸 | Lv・称号ともに **`???`**。レーダー上の値は 0 として描画するが**形を作らない**（塗りを出さない） |
| 測定済みの軸 | 実測で確定した初期Lv（10-50）と称号を表示する |
| TOTAL Lv | 全軸の測定が完了するまで **`???`** |

初期Lv算出: `clamp(10, 50, round(自己申告点 × 0.4 + 実測点 × 0.6))`（上限50 = 初期 `levelCap` と同値）

> **ルール**: `???` は**文字列としてハードコードせず**、`null` / `undefined` を「未測定」として表現し、
> 表示層で `???` に変換する。データに `"???"` という文字列を入れると Lv の型が壊れる。

```ts
export type StatusState = {
  key: StatusKey;
  exp: number;
  measured: boolean;        // calibration 中の測定完了フラグ
};
// measured === false のとき、UI は Lv・称号を "???" として描画する
```

---

## 5. ステータス一覧の表示仕様（Tab1）

`STATUS_ORDER` の順に9件を縦に並べる。

```
🧠 INT        Lv 42  論理家
              ████████████▁▁▁▁▁▁  1000 / 1034   (34)
💻 TECH       Lv 36  AIコーダー
              ██████████▁▁▁▁▁▁▁▁   700 / 739   (39)
...
🔥 LEARNING   Lv 36  自走学習者
⚔️ EXECUTION  Lv 25  実行者
```

| 要素 | 仕様 |
|---|---|
| アイコン + key | 絵文字は `aria-hidden`、key はテキスト |
| Lv | 実効Lv（`levelFromExp(exp, levelCap)`）。等幅フォント |
| 称号 | `titleFor(key, level)`（実効Lvを渡す） |
| EXPバー | 現Lv内の進捗率。`現在値 / 次Lv閾値` と**次Lvまでの残り**を等幅で併記 |
| Lv100 | 残EXPを出さず **`MAX`** と表示し、バーを満杯にする |
| levelCap到達中 | 「次Lvまで」の代わりに **「⛔ Lv{cap} 到達。ボス《…》討伐で解放」** + **貯蓄EXP量**
  （`cappedSavingsExp`）を表示する。判定は cap を適用しない生Lvで行う（生Lv >= cap） |
| 土台2つ | 専門7つとの間に**区切り線**を入れ、自動導出であることを示す |

---

## 6. 検証項目（受け入れ条件）

| # | 項目 | 期待 |
|---|---|---|
| S-1 | 称号テーブル | 9キー × 10件 = **90件**が揃っている。総合称号 **10件** |
| S-2 | 軸順 | レーダー・一覧・凡例がすべて `STATUS_ORDER` と一致する |
| S-3 | Lv→称号 | Lv41-50帯の INT が「論理家」、Lv91-100帯の TECH が「AIマスター」、Lv1-10帯の BRIDGE が「聞き手」 |
| S-4 | クランプ | 帯 0 や 帯 11 相当（Lv 0 や Lv 101）を渡しても例外を投げず両端の称号を返す |
| S-5 | TOTAL 同値 | 実効Lv同値のステータスが6件以上あっても上位5件の選択が決定的（`STATUS_ORDER` 順） |
| S-6 | 総合称号 | `floor(TOTAL Lv)` を10刻みの帯に丸めて判定される（Lv 49.9 → 帯5「複合スキルワーカー」） |
| S-7 | 最終クラス | TOTAL Lv90 でも派生5種が未解放なら《AIビジネスアーキテクト》に到達しない |
| S-10 | 称号の重複 | 「学習者」「探索者」「推進者」の重複がテーブルに**そのまま残っている**（リネームされていない） |
| S-8 | 型の禁止 | `LEARNING` / `EXECUTION` が `MainStatusKey` に代入できない（型エラーになる） |
| S-9 | 測定期間 | `measured: false` の軸が `???` で描画され、レーダーに塗りが出ない |
