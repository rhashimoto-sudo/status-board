# 作業ログ 2026-08-15（パネル質感の強化 3件）

デザインスペシャリストのレビューを経てユーザーが採用を決定した3件を1つの Issue で実施した。
3件とも `src/components/ui/panel.tsx` と `src/app/globals.css` に集中するため、並列化せず逐次1件。
Wave 6 ロットB（#15〜#17）にはまだ着手していない。

| 項目 | 値 |
|---|---|
| ブランチ | `develop/step1-dashboard-issue-panel-skin` |
| workspace / pane | `wP` / `wP:p2` |
| 合体コミット | `90edfd0` |
| コミット | `d896a10`（1）/ `06b89df`（2）/ `2b46237`（3 + docs 追記） |

---

## 1. パネル面のグラデーション化（`d896a10`）

**操作**: 修正（`src/app/globals.css` / `src/components/ui/panel.tsx`）

背景に質感が入った結果、`bg-surface` のベタ塗りだったパネルだけが平坦に見えていた。
**上辺だけシアンの光を受ける**二重グラデーションにし、9パネルが縦に並んだとき
「上辺が薄く光る板が積層している」ように見せる。

`.panel-surface` ユーティリティを `globals.css` に新設した:

```css
.panel-surface {
  background:
    linear-gradient(180deg, var(--color-panel-top-glow) 0%, transparent 42%),
    linear-gradient(160deg, var(--color-surface-raised) 0%, var(--color-surface) 55%, var(--color-bg) 100%);
  border: 1px solid var(--color-border-hairline);
  border-top-color: var(--color-panel-edge-top);
}
```

- 面のグラデーションは**既存トークンで構成**した。参考実装の `#141726` / `#11131d` / `#0e101a` は
  既存の `--color-surface-raised`(#171a26) / `--color-surface`(#11131d) / `--color-bg`(#0a0b12) に
  置き換えており、**新規の面色トークンは追加していない**
- 新規追加は次の2つのみ（どちらもシアンの色相のみ。新しい色相は増やしていない）:

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-panel-top-glow` | `rgba(34, 211, 238, 0.045)` | 上辺から落ちるシアンの光の層 |
| `--color-panel-edge-top` | `rgba(34, 211, 238, 0.22)` | 上辺の枠線だけを光らせる |

`panel.tsx` 側は `border ... bg-[color:var(--color-surface)]` を `.panel-surface` に置き換えただけ。
**`box-shadow` は使わず `background` と `border-color` のみ**で質感を出している。

---

## 2. ブラケット装飾の拡大（`06b89df`）

**操作**: 修正（`src/components/ui/panel.tsx`）

375px 幅のパネルに対して `w-3 h-3`（12px）が弱かったため:

- サイズを **16px（`w-4 h-4`）** に拡大
- 太さを `border-*-2` から **`border-*-[1.5px]`** に変更
- **上辺の左右ブラケットの内側から水平にシアンのグラデ線を 24px** 引いた
  （`top-left` は `left-4` から `bg-gradient-to-r`、`top-right` は `right-4` から `bg-gradient-to-l`。
  色は既存の `--color-border-bracket` を使い、色相は増やしていない）

グラデ線は `pointer-events-none absolute` の `h-px w-6` で、**パネル幅を押し広げない**。

---

## 3. パネル見出しのシステムラベル化（`2b46237`）

**操作**: 修正（`src/components/ui/panel.tsx` / `src/app/globals.css`）・追記（`docs/11_design_system.md`）

見出しが 18px / 600 / `--color-text-primary` で、**一番見たい本体データ（TOTAL Lv の `3.9` など）と
同格の白テキスト**になっていた。9パネルすべての見出しが本文と同じ明るさで並ぶため、
スクロール中に視線が止まる場所が決まらない。見出しはラベルであって情報ではないので落とした。

```
text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-[color:var(--color-text-secondary)]
```

見出し直下の区切り線も `.panel-heading-divider` として「左だけシアン」のグラデーションにした
（`--color-border-bracket` 0% → `--color-border-hairline` 28% → transparent 100%）。
**インラインスタイルは使わず `globals.css` のユーティリティクラスで実装**している
（`grep -n "style={{" src/components/ui/panel.tsx` は0件）。

### コントラストの検証（2通りで計算）

| 背景 | 比率 | 判定 |
|---|---|---|
| `--color-surface`（`#11131d`）— ワーカーの計算 | **約 7.32:1** | AA 4.5:1 を大きく上回る |
| `--color-surface-raised`（`#171a26`）— 司令塔が独立に計算した**最悪ケース** | **約 6.85:1** | 同上 |

面はグラデーションで上端が最も明るい（`--color-surface-raised`）ため、
司令塔側は**最も明るい層を背景とみなして**再計算した。11px は小サイズ扱い（AA 基準 4.5:1）だが、
最悪ケースでも 6.85:1 で余裕がある。よって `--color-text-secondary` のまま 11px を採用し、
「より明るいトークンに変える」「12px に上げる」といった調整は不要と判断した。
上に乗る `--color-panel-top-glow`（alpha 0.045）はごく僅かに背景を明るくするが、
この余裕を崩す水準ではない。

---

## 制約の遵守（司令塔が実測確認）

| 制約 | 実測結果 |
|---|---|
| `box-shadow` を新規に増やさない（AC-14） | `grep -rn "box-shadow" src/ \| wc -l` が **4**。変更前と同じ（`@keyframes danger-pulse` 2 / `.danger-glow` 1 / `prefers-reduced-motion` 上書き 1）。すべて HP 危険域の赤パルスに属する |
| コンポーネントへの色 `#` 直書き禁止 | `grep -rnE '#[0-9a-fA-F]{6}' src/components/` の該当は `skill-emblem.tsx:7` の**コメント1件のみ**。実コード0件 |
| インラインスタイル禁止（3の区切り線） | `grep -n "style={{" src/components/ui/panel.tsx` が **0件** |
| 新しい色相を増やさない | 追加した2変数はどちらもシアン `#22d3ee` の低不透明度。面色は既存トークンの再利用のみ |
| `color-scheme: dark` 固定 | 変更なし |
| 375px 横スクロール | ブラケットと水平グラデ線はすべて `pointer-events-none absolute` でレイアウトに影響しない |

## 共通部品としての波及の確認

`Panel` は全パネル共通部品のため、`heading` を渡している箇所を洗い出した:

- `hero-header.tsx:29` — `heading="TOTAL STATUS"`（プレーン文字列）
- `unique-skill-panel.tsx:34` — `heading={<span>🧬 固有スキル</span>}`
- `balance-meter.tsx:28` — `heading={<span>⚖️ 歪みメーター</span>}`

いずれも `Panel` 側のクラスで一律にスタイルされるインライン要素のみで、
見出し内で独自のサイズ・色を指定しているものは無い。よって
**固有スキルパネルと歪みメーターを含め、見出しのサイズ変更で崩れる構造は無い**。
ただし `uppercase` は絵文字と日本語には効かず、`tracking-[0.18em]` の字間が
日本語見出しに対してどう見えるかは**目視でしか判断できない**ため team-lead の確認に委ねる。

## 検証（司令塔が実測）

| 項目 | 結果 |
|---|---|
| worktree 内 `npm run verify` | 通過 / Tests **139 passed**（変更なし。CSS/意匠のみのためテスト増減なし） |
| worktree 内 `npm run check:cycles` | 循環0件 |
| 合体（7-b） | コンフリクト0件で `90edfd0` |
| 合体後 `npm run verify` | 通過 / Tests 139 passed / build 成功（`/` は `○ Static`） |
| 合体後 `npm run check:cycles` | 循環0件 |
| `git diff --stat` | 対象3ファイル（`panel.tsx` / `globals.css` / `11_design_system.md`）のみで宣言と一致 |

## 未検証（team-lead のブラウザ実測に委ねる）

意匠の**見た目そのものは検証していない**。静的解析では次を確認できない:

- 二重グラデーションと上辺のシアン枠が、9パネル積層時に意図どおり「板の積層」に見えるか
- 上辺の水平グラデ線（24px）が「窓が開いている」印象を出せているか
- 11px / `tracking-[0.18em]` の見出しが、日本語＋絵文字の見出しで読みやすいか
  （`uppercase` は日本語・絵文字には効かない）
- Tailwind v4 の `bg-gradient-to-r from-[color:var(--color-border-bracket)]` が
  実際に期待どおりのグラデーションを描くか（ビルドは通っている）

## 未実施（禁止事項として明示）

`git push` / Vercel デプロイ / GitHub リポジトリ名変更は**一切行っていない**。
