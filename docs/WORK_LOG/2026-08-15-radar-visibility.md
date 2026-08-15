# 作業ログ 2026-08-15（レーダーの可視性 2件 + タブ構成の維持決定）

Wave 6 ロットB（#15〜#17）にはまだ着手していない。

| 項目 | 値 |
|---|---|
| ブランチ | `develop/step1-dashboard-issue-radar-visibility` |
| workspace / pane | `wQ` / `wQ:p2` |
| 合体コミット | `ef55675` |
| コミット | `1f6b41c`（A）/ `a87a1ad`（B）/ `51feefd`（A の差し戻し修正） |

---

## 決定: タブ構成は現行仕様のまま維持する（実装も仕様書改訂も行わない）

デザインスペシャリストによる情報アーキテクチャのレビューで以下3案が提案されたが、
**ユーザーは元々の設計を維持する判断をした**。`docs/09_dashboard_spec.md` は現行のまま。

- **却下**: デイリー / ボスの損失予告に HP 遷移 `♥ 62 → 52` を併記する案
- **却下**: Tab3 の GM学習状況・殿堂を末尾の折りたたみ1つに降格する案
- **却下**: 敗北ログを Tab2 → Tab3 へ移動する案

確定している構成:

- Tab2 = 緊急ボード / 進行中ミッション / 本日のデイリー / 敗北ログ の**4ブロック**
- Tab3 = 折れ線 / ヒートマップ / GM学習状況 / 殿堂 の**4ブロック**
- `09_dashboard_spec.md:22`「**HP・ストリーク・TOTAL Lv は Tab1 のヒーローヘッダーにのみ存在し
  他タブには出さない**」も維持
- **4つ目のタブは作らない**（375px でタブバーが 65px 溢れ、AC-11 と本文16px規約に衝突するため）

ロットB・ロットC はこの現行仕様どおりに実装する。

---

## A. 紋章がレーダー下半分の弱い軸を覆っていた

**現象（team-lead がブラウザ実測・スクリーンショットで確認）**: 《構造化》紋章が
レーダー中心から Lv0〜3.5 相当の領域を不透明に覆い、**Lv2〜3 の軸
（👑PM Lv3 / 🤝BRIDGE Lv2 / 🌎ENGLISH Lv2 / 📣MARKETING Lv3）の頂点が隠れて見えなかった**。
`CLAUDE.md` の課題「弱い領域が得意領域の陰に隠れて放置される」を解く図で、
**弱い軸だけが物理的に隠れている**という設計意図に対する実害。

### 司令塔が指示前に補正した点

team-lead の指示にあった選択肢「紋章を**直径 64px 以下**に縮小する」は、
**`skill-emblem.tsx` が既に `h-16 w-16`（= 64px）だったため現状のままで満たされており、
それだけでは解決しない**。この事実を worker への指示に明記したうえで、
寸法の縮小だけに頼らず「レイヤー順の解決」と「主張を下げる」の両方を実施させた。

`outerRadius="55%"` のとき 375px 幅でレーダー半径は約 103px。半径 32px の紋章は
**レーダー半径の約 31%（Lv3.1 相当）**を覆う。Lv2 の BRIDGE・ENGLISH の頂点（半径の 20%）は
確実に隠れる計算になる。

### A-1. レイヤー順の確定（`src/components/status/status-radar.tsx`）

**1回差し戻した。** worker の初回実装（`1f6b41c`）は `centerSlot` を `ResponsiveContainer` より
**DOM 順で前**に移動しただけで、コメントに「兄弟要素は DOM 順が描画順（後勝ち）になる」と
書いていた。**この前提は誤り**で、実際には重なり順は変わらない。

司令塔が実機の `node_modules/recharts/lib/component/ResponsiveContainer.js:151-158` を読んで
確認した事実: 外側 div の style は `{ width, height, minWidth, minHeight, maxHeight }` のみで
**`position` を一切設定していない**。つまり ResponsiveContainer は**非 positioned のインフロー要素**。

CSS の絵付け順（CSS 2.1 Appendix E）では、同一スタッキングコンテキスト内で
「非 positioned のインフロー子孫」（ステップ4）は「`z-index: auto` の positioned 子孫」
（ステップ8）**より先に塗られる = 下になる**。`centerSlot` は `absolute`（positioned,
z-index auto）なので、**DOM 順によらず常にチャートより上**に描かれていた。

差し戻し後（`51feefd`）の実装:

- 相対コンテナに **`isolate`（`isolation: isolate`）** を付けてスタッキングコンテキストを閉じる
- `ResponsiveContainer` を **`<div className="relative z-10">`** で包む（positioned + 正の z-index）
- 紋章のラッパーを **`absolute … z-0`** にする

これで **紋章 z=0 < チャート z=10** が確定し、ポリゴン・グリッド・軸ラベルが必ず紋章の上に来る。
Recharts の SVG は背景が透明なので、紋章は下に敷かれたまま透けて見える。

**負の z-index は使っていない。** 親の相対コンテナが z-index auto でスタッキングコンテキストを
作らないため、負の値だと祖先の Panel 背景の裏へ回り込み紋章自体が消える恐れがあるため。

### A-2. 紋章の主張を下げる（`src/components/status/skill-emblem.tsx`）

- サイズを **64px → 48px（`h-12 w-12`）**。半径 24px = レーダー半径の約 **23%**（Lv2.3 相当）
- **`《構造化》` の文字ラベルを削除**し、`Lv N` のみ表示（詳細は `unique-skill-panel.tsx` にあり重複）。
  **`aria-label` にはスキル名を残している**（`role="img"` の代替テキスト。NFR-4）
- 未解放時は `覚醒後に解放` の全文をやめ、記号 `?` のみ（`aria-hidden`）+ `aria-label` に全文
- 塗りを **`--color-surface` 混合の不透明 → `transparent` 混合**に変更し、下地が透けるようにした
- `MAX_GLOW_OPACITY` を **0.5 → 0.22**。塗りが透明ベースになりコントラストの前提が変わったため、
  レーダーのシアン塗り（`fillOpacity 0.22`）が下から重なった最悪条件でも
  `Lv N`（シアン）が WCAG AA を割り込まない水準に抑えた

**なぜ頂点が隠れなくなるか（構造）**: (1) レイヤー順で紋章がチャートの下に確定した、
(2) 半径比が 31% → 23% に下がった、の二重の担保。(1) だけで論理的には十分だが、
(2) により紋章の縁と低Lv頂点が視覚的に干渉する余地も減らしている。

---

## B. ゴースト（3ヶ月前）が視認できなかった

**現象**: stroke が `--color-ghost`（`rgba(139,92,246,0.25)`）、fill が violet 0.1。
深藍黒の背景でグリッド線（白 0.08）とほぼ同明度のため、**実画面で破線が一本も見えなかった**。
「3ヶ月でどれだけ伸びたか」がこの画面の存在理由の一つなのに、描画されていても見えないなら
無いのと同じ。

### 追加したトークン（`src/app/globals.css`）

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-ghost-stroke` | `rgba(139, 92, 246, 0.6)` | ゴースト系列の**線**専用 |

**既存の `--color-ghost`（0.25）は塗り用として据え置き、線用を分離した。**
色相は violet のままなので「アクセントはシアン × バイオレットの2色のみ」の規約は維持される。

### 2系列の最終指定

| | ゴースト（3ヶ月前） | 現在 |
|---|---|---|
| stroke | `var(--color-ghost-stroke)` | `var(--color-accent-cyan)` |
| strokeWidth | **1.5** | **2** |
| strokeDasharray | `5 4` | （実線） |
| fillOpacity | **0.08** | **0.22** |
| dot | なし | `{ r: 2.5, fill: var(--color-accent-cyan) }` |

**役割分担は「線の太さで主従、不透明度で時間軸」**。色を増やさずに現在と過去の対比が立つ。
凡例スウォッチも系列に追随させた（枠線 `--color-ghost-stroke`、塗り 8%）。

`docs/11_design_system.md` の Ghost トークン定義を**塗り用と線用の2つに改訂**し、
A の紋章仕様（サイズ・レイヤー順・塗りの不透明度）も追記した。

---

## 制約の遵守（司令塔が実測確認）

| 制約 | 実測結果 |
|---|---|
| `box-shadow` を新規に増やさない（AC-14） | `grep -rn "box-shadow" src/ \| wc -l` が **4**。変更なし（すべて HP 危険域の赤パルス） |
| コンポーネントへの色 `#` 直書き | `grep -rnE '#[0-9a-fA-F]{6}' src/components/` が **0件**（旧コメントの `#8b5cf6` も書き換えられ完全に0件になった） |
| 新しい色相を増やさない | 追加した `--color-ghost-stroke` は既存 violet の不透明度違い |
| `outerRadius` を 55% 以下に維持 | `55%` のまま変更なし。`🔥 LEARNING` の2pxはみ出し解消を再発させていない |
| 未測定軸のゴースト抑止 | `ghost: measured ? (point?.ghost ?? 0) : 0` を維持（`09_dashboard_spec.md:82-83`） |
| `AxisTick` のモジュールレベル巻き上げ | 維持（`status-radar.tsx:90` の `function AxisTick`） |
| `ResponsiveContainer` / 固定px幅なし | 維持（C-20, AC-13） |

## 検証（司令塔が実測）

| 項目 | 結果 |
|---|---|
| worktree 内 `npm run verify` | 通過 / Tests **139 passed**（意匠のみのため増減なし） |
| worktree 内 `npm run check:cycles` | 循環0件 |
| 合体（7-b） | コンフリクト0件で `ef55675` |
| 合体後 `npm run verify` | 通過 / Tests 139 passed / build 成功（`/` は `○ Static`） |
| 合体後 `npm run check:cycles` | 循環0件 |
| `git diff --stat` | 対象4ファイルのみで宣言と一致 |

## 未検証（team-lead のブラウザ実測に委ねる）

- 9軸すべての頂点が紋章に隠れず視認できるか。**特に Lv2 の BRIDGE・ENGLISH の頂点**
- ゴーストの破線が実画面で視認できるか（`rgba(139,92,246,0.6)` / 1.5px / `5 4`）
- 48px の紋章に `Lv N` のみが収まって読めるか。未解放時の `?` が意図を伝えられるか
- `isolation: isolate` + z-index の重なりが実描画で意図どおりか

## 未実施（禁止事項として明示）

`git push` / Vercel デプロイ / GitHub リポジトリ名変更は**一切行っていない**。
