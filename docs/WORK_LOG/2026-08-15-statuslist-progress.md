# 作業ログ 2026-08-15（status-list の進捗バーと数値の矛盾を解消）

Wave 6 ロットB（#15〜#17）にはまだ着手していない。

| 項目 | 値 |
|---|---|
| ブランチ | `develop/step1-dashboard-issue-statuslist-progress` |
| workspace / pane | `wR` / `wR:p2` |
| 合体コミット | `e7ae0c5` |
| コミット | `4f9e073` |

---

## 現象（team-lead が実装で確認、司令塔が一次情報で再確認）

`src/components/status/status-list.tsx` の**同じ1行の中で、バーと数値が異なる分母を使っていた**。

- バー（`:72`）: `levelProgress(status.exp)` = `src/lib/level.ts:33-40` の
  **現Lv帯内の進捗** `(exp − floor) / (ceil − floor)`
- 数値（`:78-80`）: `status.exp` / `nextThreshold`（= `LEVEL_THRESHOLDS[level]`）= **累積EXP / 次Lv累積閾値**

| 軸 | 表示テキスト | バーの実際の充填率 |
|---|---|---|
| 📊 DATA | `950 / 1581 (631)` | **3.7%** |
| 🧠 INT | `1000 / 1581 (581)` | **11%** |
| 💻 TECH | `700 / 926 (226)` | **45%** |

テキストが 60% を示すのにバーは 3.7% しか埋まらない状態が**9行すべてで発生**していた。
成長を可視化する道具が成長の量について嘘をついていることになる。

加えて `ProgressBar` の `label` が `${statusKey} の累積EXP進捗` で、実際の値（帯内進捗）と
説明が食い違い、スクリーンリーダーに誤情報が読み上げられていた（NFR-4 違反）。

---

## 重要: 矛盾はコードだけでなく **仕様書自体** にあった

worker は着手直後にこの矛盾が仕様書側にもあることを発見し、指示どおり**実装せず停止して報告**した。
司令塔が一次情報で照合した結果、その判断は正しかった。

**`docs/03_status_system.md` §5 の表は1行の中で自己矛盾している:**

| EXPバー | **現Lv内の進捗率**。`現在値 / 次Lv閾値` と次Lvまでの残りを等幅で併記 |

- バー = 現Lv内の進捗率（**帯内**）
- テキスト = `現在値 / 次Lv閾値`（**累積**）

**同 §5 直上の ASCII 例も、表の定義に従っていない:**

```
🧠 INT        Lv 5  論理家
              ████████████▁▁▁▁▁▁  1120 / 1581   (461)
```

このバーの充填は約 **67%** だが、INT Lv5 exp=1120 の帯内進捗は
`(1120 − 926) / (1581 − 926)` = **29.6%**。67% は累積比 `1120 / 1581` = **70.8%** に一致する。
つまり例のバーは表が定める「現Lv内の進捗率」ではなく累積比で描かれている。

**実装は §5 の記述に忠実だった。** バグの根は仕様書にある。

### 確定した解決方針（ユーザー承認済み）

**バーの定義（現Lv内の進捗率）を正とし、テキスト側をバーに揃える。**
根拠と整合性:

- `01_requirements.md` FR-8-1 の「累積EXPバー（**次Lvまで**）」と矛盾しない
- `09_dashboard_spec.md:50` のヒーローヘッダーが**既に**
  `██████████████▁▁▁▁▁▁ 次のLvまで 461 EXP` という表記を採用しており、
  同じ画面内で TOTAL と各ステータスの表記が揃う
- 累積EXP `950 / 1581` は毎日見る値ではなく、**次のLvまであと何EXPかの方が行動に直結する**

---

## 実装（`src/components/status/status-list.tsx`）

**操作**: 修正

- 表示テキストを **「次まで {remaining} EXP」** に統一。`remaining` は既存の
  `expToNextLevel(status.exp)` をそのまま使い、**新たな計算を追加していない**
- 累積表記 `950 / 1581 (631)` を廃止
- **Lv10（MAX）は現状どおり `MAX` 表示を維持**（`expToNextLevel` が `null` を返すケース）
- 未使用になった `nextThreshold` の算出を削除（デッドコードを残さない）
- `ProgressBar` の `label` を実態に合わせて修正:
  `${statusKey} の累積EXP進捗` → **`${statusKey} Lv${level} の次のLvまでの進捗`**
- 未測定軸（`measured: false`）でバーを出さない挙動は変更なし
- 数値は `StatValue`（等幅 + tabular-nums）経由のまま

### 回帰テスト（`src/test/level.test.ts`）

この矛盾は既存テストをすり抜けていた。**分母の一致を不変条件として固定**するテストを追加した:

```
floor + progress * (ceil − floor) + remaining === ceil
```

`levelProgress` と `expToNextLevel` が**同じLv帯（同じ分母）を参照している限りのみ成立**する等式で、
どちらかが別の分母に変わると必ず落ちる。境界値は **exp 0 / 99 / 100 / 925 / 926 / 1580 / 1581**、
および **Lv10（`expToNextLevel` が `null`、`levelProgress` が 1）** を網羅。

純関数の切り出しは不要と判断され、**新規ファイルは作られていない**（`src/lib/` の既存 API で
不変条件を表現できたため）。循環依存も発生していない。

---

## 制約の遵守（司令塔が実測確認）

| 制約 | 実測結果 |
|---|---|
| `box-shadow` を新規に増やさない（AC-14） | `grep -rn "box-shadow" src/ \| wc -l` が **4**。変更なし |
| コンポーネントへの色 `#` 直書き | `grep -rnE '#[0-9a-fA-F]{6}' src/components/` が **0件** |
| 閾値をコンポーネントに直書きしない（AC-15） | `constants.ts` / `level.ts` 経由のまま。数値リテラルの追加なし |
| 等幅・tabular-nums | `StatValue` 経由を維持 |

## 検証（司令塔が実測）

| 項目 | 結果 |
|---|---|
| worktree 内 `npm run verify` | 通過 / Tests **147 passed**（139 → +8） |
| worktree 内 `npm run check:cycles` | 循環0件 |
| 合体（7-b） | コンフリクト0件で `e7ae0c5` |
| 合体後 `npm run verify` | 通過 / Tests 147 passed / build 成功（`/` は `○ Static`） |
| 合体後 `npm run check:cycles` | 循環0件 |
| `git diff --stat` | `status-list.tsx` / `level.test.ts` の2ファイルのみ |

## `/spec-sync` で是正する docs（全Wave完了後）

**本件で新たに1件追加された。**

1. **`docs/03_status_system.md` §5 の表と ASCII 例**（本件・**新規**）
   - 表の「EXPバー | 現Lv内の進捗率。`現在値 / 次Lv閾値` と次Lvまでの残りを等幅で併記」を、
     確定方針（バー = 帯内進捗 / テキスト = 「次まで n EXP」）に合わせて書き直す
   - ASCII 例 `████████████▁▁▁▁▁▁ 1120 / 1581 (461)` を
     `████▁▁▁▁▁▁▁▁▁▁▁▁▁▁ 次まで 461 EXP`（充填 29.6%）相当に差し替える
2. 旧 HP 閾値「緑 `>50` / 黄 `>25` / 赤 `<=25`」が `02_architecture.md:244,452,659` と
   `09_dashboard_spec.md:62` に残存。正典は `01_requirements.md:367-371` と `06_penalty.md` §7 の 71/41/0-40
3. `02_architecture.md` の `applyPenalty` 宣言に、実装で追加した `ctx.main?: MainStatusKey` と
   戻り値の `nextHp` が未反映

## 未検証（team-lead のブラウザ実測に委ねる）

- 9行すべてでバーの充填率と「次まで n EXP」が整合して見えるか
- 「次まで 581 EXP」が長い称号と同じ行で折り返して崩れないか（375px）。
  なお表示は2段構成（1段目 = アイコン/key/Lv/称号の `flex-wrap`、
  2段目 = バー + 残EXP の `flex items-center gap-2`）で、残EXPは `whitespace-nowrap` のため
  **称号と同じ行には並ばない**構造になっている

## 未実施（禁止事項として明示）

`git push` / Vercel デプロイ / GitHub リポジトリ名変更は**一切行っていない**。
